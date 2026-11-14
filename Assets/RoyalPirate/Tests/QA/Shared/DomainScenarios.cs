using System;
using System.Collections.Generic;
using RoyalPirate.Domain;

namespace RoyalPirate.QA
{
    // Same assertions run in NUnit and in the dependency-free .NET runner.
    // This assembly is test-only; it is never a production battle/economy implementation.
    public static class DomainScenarios
    {
        public static IEnumerable<string> Names
        {
            get
            {
                return new[] { "NoWind", "LateralWind", "HeadWind", "TailWind", "StepSubdivision",
                    "MinimumPower", "MaximumPower", "YawRotation", "InvalidPower", "InvalidStep",
                    "InvalidWind", "HullDamage", "CannonDestruction", "MastDestruction", "ZeroDamage",
                    "OverkillOnce", "NegativeDamage", "TurnOwnership", "AimTimeout", "ResolveTimeout",
                    "StaleResolution", "FinishedIsTerminal", "InvalidTimer", "UpgradeReplay", "AllUpgradeCosts",
                    "InsufficientFunds", "InstallReplay", "OccupiedMount", "RevisionOverflow", "InvalidLoadout",
                    "FutureSchema", "NegativeBalance", "StressEconomy1000", "StressTurns1000" };
            }
        }

        static void Require(bool value, string detail)
        { if (!value) throw new InvalidOperationException(detail); }
        static void Near(float actual, double expected, string detail, double tolerance = .003)
        { Require(!float.IsNaN(actual) && Math.Abs(actual-expected) <= tolerance, detail+": "+actual+" vs "+expected); }
        static void Reject(Action action)
        {
            try { action(); } catch (ArgumentException) { return; }
            throw new InvalidOperationException("Invalid input was accepted");
        }
        static Vec3 Flight(Vec3 wind, float step)
        {
            var p = new Vec3(0,10,0); var v = new Vec3(0,10,20);
            int count = (int)Math.Round(2/step);
            for (int i=0; i<count; i++) Ballistics.Step(ref p,ref v,wind,step);
            return p;
        }
        public static void Run(string name, ShipCatalog catalog)
        {
            catalog.Validate();
            var loadout=ShipLoadout.CreateStarter(catalog);
            var yard=new SandboxShipyard(catalog,loadout,100000);
            var turns=new TurnState();
            string id=loadout.modules[0].instanceId;
            switch(name)
            {
                case "NoWind":
                    var p=Flight(new Vec3(),.02f); Near(p.y,10+20-.5*9.81*4,"gravity"); Near(p.z,40,"range"); Near(p.x,0,"lateral"); break;
                case "LateralWind": Near(Flight(new Vec3(2,0,0),.02f).x,4,"lateral acceleration"); break;
                case "HeadWind": Near(Flight(new Vec3(0,0,-3),.02f).z,34,"headwind"); break;
                case "TailWind": Near(Flight(new Vec3(0,0,3),.02f).z,46,"tailwind"); break;
                case "StepSubdivision":
                    var a=Flight(new Vec3(1,0,-2),.1f); var b=Flight(new Vec3(1,0,-2),.01f);
                    Near(a.x,b.x,"subdivision x"); Near(a.y,b.y,"subdivision y"); Near(a.z,b.z,"subdivision z"); break;
                case "MinimumPower": case "MaximumPower":
                    var v=Ballistics.LaunchVelocity(37,40,name=="MinimumPower"?0:1);
                    Near((float)Math.Sqrt(v.x*v.x+v.y*v.y+v.z*v.z),name=="MinimumPower"?10:35,"launch speed"); break;
                case "YawRotation":
                    var east=Ballistics.LaunchVelocity(90,30,.5f); var north=Ballistics.LaunchVelocity(0,30,.5f);
                    Near(east.x,north.z,"yaw axis"); Near(east.z,0,"yaw orthogonal"); Near(east.y,north.y,"vertical invariant"); break;
                case "InvalidPower": foreach(var f in new[]{-.01f,1.01f,float.NaN,float.PositiveInfinity}) Reject(()=>Ballistics.LaunchVelocity(0,30,f)); break;
                case "InvalidStep": foreach(var f in new[]{0f,-.02f,.101f,float.NaN}) Reject(()=>{var q=new Vec3();var s=new Vec3();Ballistics.Step(ref q,ref s,new Vec3(),f);}); break;
                case "InvalidWind": Reject(()=>{var q=new Vec3();var s=new Vec3();var w=new Vec3{x=float.NaN};Ballistics.Step(ref q,ref s,w,.02f);}); break;
                case "HullDamage": case "CannonDestruction": case "MastDestruction":
                    string definition=name=="HullDamage"?"module.hull.01":name=="CannonDestruction"?"module.cannon.01":"module.mast.01";
                    int hp=catalog.Module(definition).HealthAt(1); var module=new ModuleState("qa",hp);
                    int hit=name=="HullDamage"?80:hp; Require(module.ApplyDamage(hit)==hit,"damage applied");
                    Require(module.Health==hp-hit && module.IsDestroyed==(hit==hp),"module health"); break;
                case "ZeroDamage": var untouched=new ModuleState("qa",100);int zeroEvents=0;untouched.Destroyed+=_=>zeroEvents++;untouched.ApplyDamage(0);Require(untouched.Health==100&&zeroEvents==0,"zero damage"); break;
                case "OverkillOnce": var dead=new ModuleState("qa",100);int events=0;dead.Destroyed+=_=>events++;Require(dead.ApplyDamage(int.MaxValue)==100,"overkill cap");for(int i=0;i<100;i++)dead.ApplyDamage(10);Require(events==1&&dead.Health==0,"single destruction");break;
                case "NegativeDamage": Reject(()=>new ModuleState("qa",100).ApplyDamage(-1));break;
                case "TurnOwnership": Require(!turns.TryFire(1)&&!turns.TryFire(-1)&&turns.TryFire(0)&&!turns.TryFire(0),"ownership and double fire");break;
                case "AimTimeout": turns.Tick(19);Require(turns.ActivePlayer==0,"early timeout");turns.Tick(1);Require(turns.ActivePlayer==1&&turns.Remaining==20,"timeout");break;
                case "ResolveTimeout": turns.TryFire(0);turns.Tick(8);Require(turns.ActivePlayer==1&&turns.Phase==BattlePhase.Aiming,"resolution watchdog");break;
                case "StaleResolution": turns.TryFire(0);int old=turns.TurnNumber;turns.Tick(8);turns.TryFire(1);turns.ResolveShot(old);Require(turns.ActivePlayer==1&&turns.Phase==BattlePhase.Resolving,"late projectile");break;
                case "FinishedIsTerminal": turns.TryFire(0);turns.Finish();turns.Tick(1000);turns.ResolveShot(1);Require(turns.Phase==BattlePhase.Finished&&!turns.TryFire(0)&&turns.Remaining==0,"terminal battle");break;
                case "InvalidTimer": Reject(()=>turns.Tick(-1));Reject(()=>turns.Tick(float.NaN));break;
                case "UpgradeReplay": Require(yard.Upgrade(id,0),"first upgrade");for(int i=0;i<1000;i++)Require(!yard.Upgrade(id,0),"replayed revision");Require(yard.Coins==100000-catalog.Module(loadout.modules[0].definitionId).baseCost&&loadout.revision==1,"single charge");break;
                case "AllUpgradeCosts":
                    long spent=0;foreach(var entry in loadout.modules){var d=catalog.Module(entry.definitionId);while(entry.level<d.maxLevel){spent+=(long)d.baseCost*entry.level;Require(yard.Upgrade(entry.instanceId,loadout.revision),"upgrade accepted");}Require(!yard.Upgrade(entry.instanceId,loadout.revision),"max level");}Require(yard.Coins==100000-spent,"all level costs");loadout.Validate(catalog);break;
                case "InsufficientFunds": yard=new SandboxShipyard(catalog,loadout,0);Require(!yard.Upgrade(id,0)&&yard.Coins==0&&loadout.revision==0&&loadout.modules[0].level==1,"atomic rejection");break;
                case "InstallReplay":
                    loadout.modules.RemoveAll(x=>x.mountId=="mount.sail.01");Require(yard.Install("module.sail.01","mount.sail.01",0),"install");long balance=yard.Coins;for(int i=0;i<100;i++)Require(!yard.Install("module.sail.01","mount.sail.01",0),"install replay");Require(balance==yard.Coins&&loadout.revision==1,"install single charge");break;
                case "OccupiedMount": Require(!yard.Install("module.sail.01","mount.sail.01",0)&&yard.Coins==100000&&loadout.revision==0,"occupied");break;
                case "RevisionOverflow": loadout.revision=long.MaxValue;Require(!yard.Upgrade(id,long.MaxValue)&&yard.Coins==100000,"overflow");break;
                case "InvalidLoadout": loadout.modules[1].instanceId=id;Reject(()=>loadout.Validate(catalog));break;
                case "FutureSchema": loadout.schemaVersion=2;Reject(()=>loadout.Validate(catalog));break;
                case "NegativeBalance": Reject(()=>new SandboxShipyard(catalog,loadout,-1));break;
                case "StressEconomy1000":
                    for(int seed=0;seed<1000;seed++){
                        var data=ShipLoadout.CreateStarter(catalog);long coins=seed%11*100;var shop=new SandboxShipyard(catalog,data,coins);long expected=coins;
                        for(int i=0;i<60;i++){var entry=data.modules[(seed+i)%data.modules.Count];var d=catalog.Module(entry.definitionId);long revision=data.revision;int level=entry.level;long cost=(long)d.baseCost*level;bool possible=level<d.maxLevel&&expected>=cost;bool ok=shop.Upgrade(entry.instanceId,revision);Require(ok==possible,"affordability");if(ok){expected-=cost;Require(!shop.Upgrade(entry.instanceId,revision),"retry");}Require(shop.Coins==expected&&shop.Coins>=0,"ledger invariant");data.Validate(catalog);}
                    }break;
                case "StressTurns1000":
                    for(int i=0;i<1000;i++){int player=turns.ActivePlayer;int turn=turns.TurnNumber;Require(turns.TryFire(player),"fire");if(i%2==0)turns.ResolveShot(turn);else turns.Tick(8);Require(turns.ActivePlayer==1-player&&turns.TurnNumber==turn+1&&turns.Phase==BattlePhase.Aiming,"turn progress");turns.ResolveShot(turn);Require(turns.TurnNumber==turn+1,"late callback");}break;
                default: throw new ArgumentException("Unknown QA case: "+name);
            }
        }
    }
}
