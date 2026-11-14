using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using UnityEngine;
using UnityEngine.TestTools;

namespace RoyalPirate.QA
{
    public sealed class HeadlessBattleTests
    {
        [Serializable] public sealed class BattleMetric
        { public int scenario, expectedWinner, winner=-1, turns, hits, misses; public float simulatedSeconds; public string error; }
        [Serializable] public sealed class Report
        {
            public string scope="Scripted fixture: real ShipView/CannonWeapon/ProjectileView/Unity Physics/TurnState; not BattleBootstrap bot balance or UI";
            public string unity, commit;public int requested,completed;public List<BattleMetric> battles=new List<BattleMetric>();
        }
        readonly List<GameObject> roots=new List<GameObject>();
        float previousStep,previousScale;
        [SetUp] public void SetUp(){previousStep=Time.fixedDeltaTime;previousScale=Time.timeScale;Time.fixedDeltaTime=.02f;Time.timeScale=20;}
        [TearDown] public void TearDown(){Clean();Time.fixedDeltaTime=previousStep;Time.timeScale=previousScale;}
        void Clean(){foreach(var root in roots)if(root!=null)UnityEngine.Object.DestroyImmediate(root);roots.Clear();}
        ShipView Ship(ShipCatalog catalog,int index)
        {
            var root=new GameObject("QA simulation ship "+index);roots.Add(root);
            root.transform.position=new Vector3(2000+index*32,0,0);
            var ship=root.AddComponent<ShipView>();ship.Assemble(catalog,ShipLoadout.CreateStarter(catalog),null,null,null);return ship;
        }
        static CannonWeapon Weapon(ShipView ship,Action callback)
        {
            ModuleView cannon=null;foreach(var m in ship.Modules)if(m.Kind==ModuleKind.Cannon)cannon=m;
            var weapon=ship.gameObject.AddComponent<CannonWeapon>();weapon.Initialize(ship,cannon,null,callback);return weapon;
        }
        [UnityTest, Category("Simulation")]
        public IEnumerator ScriptedBattlesUseRealPhysicsAndProduceMetrics()
        {
            int count=10;string countText=Environment.GetEnvironmentVariable("ROYAL_QA_BATTLES");
            if(!string.IsNullOrEmpty(countText))Assert.That(int.TryParse(countText,out count)&&count>=1&&count<=10000,Is.True,"ROYAL_QA_BATTLES must be 1..10000");
            var report=new Report{unity=Application.unityVersion,commit=Environment.GetEnvironmentVariable("ROYAL_QA_COMMIT")??"unrecorded",requested=count};
            string path=Environment.GetEnvironmentVariable("ROYAL_QA_SIM_REPORT")??Path.Combine(Application.temporaryCachePath,"royal-qa-battles.json");
            var catalog=JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
            try
            {
                for(int scenario=0;scenario<count;scenario++)
                {
                    var metric=new BattleMetric{scenario=scenario,expectedWinner=scenario%2};report.battles.Add(metric);
                    var ships=new[]{Ship(catalog,0),Ship(catalog,1)};var turns=new TurnState();bool resolved=false;int shotTurn=0;
                    Action finish=()=>{resolved=true;if(ships[0].IsSunk||ships[1].IsSunk)turns.Finish();else turns.ResolveShot(shotTurn);};
                    var weapons=new[]{Weapon(ships[0],finish),Weapon(ships[1],finish)};
                    Physics.SyncTransforms();
                    // Alternate guaranteed miss and aimed hull trajectories, swapping winning side per scenario.
                    // No random outcome/health injection: damage must come from the runtime collider path.
                    for(int turn=0;turn<40&&turns.Phase!=BattlePhase.Finished;turn++)
                    {
                        int side=turns.ActivePlayer;bool aimed=side==metric.expectedWinner;
                        if(!weapons[side].CanFire){metric.error="Weapon unavailable before terminal result";break;}
                        float before=ships[1-side].HealthFraction;resolved=false;shotTurn=turns.TurnNumber;
                        float direction=side==0?1:-1;
                        var origin=ships[side].transform.position+new Vector3(3.5f*direction,.2f,aimed?0:12);
                        var shot=new ShotRequest{Origin=ShipView.ToDomain(origin),Velocity=Ballistics.LaunchVelocity(side==0?90:-90,5,aimed?1:0),Damage=80};
                        Assert.That(turns.TryFire(side)&&weapons[side].TryFire(shot),Is.True);
                        // Track spawned runtime object solely for guaranteed cleanup on assertion failure.
                        foreach(var projectile in UnityEngine.Object.FindObjectsByType<ProjectileView>(FindObjectsSortMode.None))
                            if(projectile.transform.position.x>1900&&!roots.Contains(projectile.gameObject))roots.Add(projectile.gameObject);
                        for(int step=0;step<400&&!resolved;step++)
                        {yield return new WaitForFixedUpdate();metric.simulatedSeconds+=.02f;turns.Tick(.02f);}
                        metric.turns++;
                        if(!resolved){metric.error="Projectile watchdog exceeded";break;}
                        bool hit=ships[1-side].HealthFraction<before;if(hit)metric.hits++;else metric.misses++;
                        if(hit!=aimed){metric.error="Scripted trajectory did not match collision expectation";break;}
                    }
                    metric.winner=ships[0].IsSunk?1:ships[1].IsSunk?0:-1;
                    if(metric.winner!=metric.expectedWinner||turns.Phase!=BattlePhase.Finished)metric.error=metric.error??"Wrong result or no terminal state";
                    report.completed++;Clean();yield return null;
                }
            }
            finally
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path)));
                File.WriteAllText(path,JsonUtility.ToJson(report,true));Debug.Log("QA simulation report: "+path);
            }
            Assert.That(report.completed,Is.EqualTo(count));
            foreach(var metric in report.battles)Assert.That(metric.error,Is.Null,"Scenario "+metric.scenario+": "+metric.error);
        }
    }
}
