using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using UnityEngine;
using UnityEngine.TestTools;

namespace RoyalPirate.QA
{
    public sealed class CombatRegressionTests
    {
        readonly List<GameObject> objects=new List<GameObject>();
        float oldStep,oldScale;
        [SetUp] public void SetUp(){oldStep=Time.fixedDeltaTime;oldScale=Time.timeScale;Time.fixedDeltaTime=.02f;Time.timeScale=1;}
        [TearDown] public void TearDown()
        {
            foreach(var item in objects)if(item!=null)Object.DestroyImmediate(item);
            objects.Clear();Time.fixedDeltaTime=oldStep;Time.timeScale=oldScale;
        }
        GameObject Root(string name){var obj=new GameObject(name);objects.Add(obj);return obj;}
        ModuleView Target(float z,ModuleKind kind=ModuleKind.Hull)
        {
            var obj=GameObject.CreatePrimitive(PrimitiveType.Cube);objects.Add(obj);
            obj.transform.position=new Vector3(1000,3,z);obj.transform.localScale=new Vector3(2,2,.05f);
            var ship=obj.AddComponent<ShipView>();var module=obj.AddComponent<ModuleView>();
            module.Initialize(ship,new ModuleInstallation{instanceId="qa."+z,level=1},new ModuleDefinition{kind=kind,baseHealth=100});
            return module;
        }
        IEnumerator Shot(Vec3 origin,Vec3 velocity,ShipView owner,int damage,System.Action completed)
        {
            Physics.SyncTransforms();var obj=Root("QA projectile");
            obj.AddComponent<ProjectileView>().Initialize(new ShotRequest{Origin=origin,Velocity=velocity,Damage=damage},owner,completed);
            for(int i=0;i<400&&obj!=null;i++)yield return new WaitForFixedUpdate();
            Assert.That(obj==null,Is.True,"Projectile lifetime exceeded 8 seconds");
        }
        [UnityTest] public IEnumerator InitialOverlapResolvesOnlyOnce()
        {
            var module=Target(0);int count=0;var owner=Root("owner").AddComponent<ShipView>();
            yield return Shot(new Vec3(1000,3,0),new Vec3(0,0,20),owner,40,()=>count++);
            Assert.That(module.State.Health,Is.EqualTo(60));Assert.That(count,Is.EqualTo(1));
        }
        [UnityTest] public IEnumerator NearestOfTwoModulesReceivesDamage()
        {
            var near=Target(2);var far=Target(3);int count=0;
            yield return Shot(new Vec3(1000,3,0),new Vec3(0,0,200),Root("owner").AddComponent<ShipView>(),40,()=>count++);
            Assert.That(near.State.Health,Is.EqualTo(60));Assert.That(far.State.Health,Is.EqualTo(100));Assert.That(count,Is.EqualTo(1));
        }
        [UnityTest] public IEnumerator TriggerCannotAbsorbProjectile()
        {
            var trigger=Target(1);trigger.GetComponent<Collider>().isTrigger=true;var solid=Target(2);
            yield return Shot(new Vec3(1000,3,0),new Vec3(0,0,200),Root("owner").AddComponent<ShipView>(),40,()=>{});
            Assert.That(trigger.State.Health,Is.EqualTo(100));Assert.That(solid.State.Health,Is.EqualTo(60));
        }
        [UnityTest] public IEnumerator DestroyedModuleDoesNotBlockNextTarget()
        {
            var broken=Target(1,ModuleKind.Mast);broken.State.ApplyDamage(100);var target=Target(2);
            Assert.That(broken.GetComponent<Collider>().enabled,Is.False);Assert.That(broken.GetComponent<Renderer>().enabled,Is.False);
            yield return Shot(new Vec3(1000,3,0),new Vec3(0,0,200),Root("owner").AddComponent<ShipView>(),40,()=>{});
            Assert.That(target.State.Health,Is.EqualTo(60));
        }
        [UnityTest] public IEnumerator MissCompletesWithoutDamage()
        {
            var target=Target(2);int count=0;
            yield return Shot(new Vec3(1010,3,0),new Vec3(0,-10,20),Root("owner").AddComponent<ShipView>(),40,()=>count++);
            Assert.That(target.State.Health,Is.EqualTo(100));Assert.That(count,Is.EqualTo(1));
        }
        [Test] public void DestroyedCannonCannotFire()
        {
            var cannon=Target(0,ModuleKind.Cannon);var weapon=cannon.Ship.gameObject.AddComponent<CannonWeapon>();
            weapon.Initialize(cannon.Ship,cannon,null,()=>{});Assert.That(weapon.CanFire,Is.True);
            cannon.State.ApplyDamage(100);Assert.That(weapon.CanFire,Is.False);
            Assert.That(weapon.TryFire(new ShotRequest{Damage=80}),Is.False);
        }
        [UnityTest] public IEnumerator HullDestructionSinksShipWhileMastDamageDoesNot()
        {
            var catalog=JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
            var ship=Root("assembled").AddComponent<ShipView>();ship.transform.position=new Vector3(1000,0,0);
            ship.Assemble(catalog,ShipLoadout.CreateStarter(catalog),null,null,null);
            ModuleView hull=null;foreach(var part in ship.Modules){if(part.Kind==ModuleKind.Mast)part.State.ApplyDamage(int.MaxValue);if(part.Kind==ModuleKind.Hull)hull=part;}
            Assert.That(ship.IsSunk,Is.False);hull.State.ApplyDamage(int.MaxValue);Assert.That(ship.IsSunk,Is.True);
            float y=ship.transform.position.y;yield return null;yield return null;
            Assert.That(ship.transform.position.y,Is.LessThan(y));
        }
    }
}
