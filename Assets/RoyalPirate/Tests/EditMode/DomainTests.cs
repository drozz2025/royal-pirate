using System;
using NUnit.Framework;
using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Tests
{
    public sealed class DomainTests
    {
        ShipCatalog catalog;
        [SetUp] public void SetUp()
        {
            catalog = JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
            catalog.Validate();
        }
        [Test] public void GravityMatchesAnalyticTrajectory()
        {
            var p = new Vec3(0,10,0); var v = new Vec3(0,10,20);
            for (int i=0;i<50;i++) Ballistics.Step(ref p,ref v,new Vec3(),0.02f);
            Assert.That(p.y,Is.EqualTo(15.095f).Within(0.001));
            Assert.That(p.z,Is.EqualTo(20).Within(0.001));
        }
        [Test] public void WindProducesExpectedLateralDisplacement()
        {
            var p = new Vec3(); var v = new Vec3();
            for (int i=0;i<100;i++) Ballistics.Step(ref p,ref v,new Vec3(2,0,0),0.02f);
            Assert.That(p.x,Is.EqualTo(4).Within(0.001));
        }
        [Test] public void InvalidPhysicsInputIsRejected()
        {
            Assert.Throws<ArgumentOutOfRangeException>(()=>Ballistics.LaunchVelocity(0,30,float.NaN));
            Assert.Throws<ArgumentOutOfRangeException>(()=>Ballistics.LaunchVelocity(0,30,2));
        }
        [Test] public void DamageClampsAndDestructionHappensOnce()
        {
            var state = new ModuleState("test",100); int count=0; state.Destroyed += _=>count++;
            Assert.That(state.ApplyDamage(150),Is.EqualTo(100)); state.ApplyDamage(20);
            Assert.That(count,Is.EqualTo(1)); Assert.That(state.Health,Is.Zero);
            Assert.Throws<ArgumentOutOfRangeException>(()=>state.ApplyDamage(-1));
        }
        [Test] public void CompatibleStarterHasEveryMount()
        {
            var loadout = ShipLoadout.CreateStarter(catalog); loadout.Validate(catalog);
            Assert.That(loadout.modules.Count,Is.EqualTo(catalog.mounts.Length));
        }
        [Test] public void IncompatibleModulesAreRejected()
        {
            var loadout = ShipLoadout.CreateStarter(catalog);
            loadout.modules[0].definitionId = "module.cannon.01";
            Assert.Throws<ArgumentException>(()=>loadout.Validate(catalog));
        }
        [Test] public void DuplicateInstancesAreRejected()
        {
            var loadout = ShipLoadout.CreateStarter(catalog);
            loadout.modules[1].instanceId = loadout.modules[0].instanceId;
            Assert.Throws<ArgumentException>(()=>loadout.Validate(catalog));
        }
        [Test] public void UpgradeChargesOnceAndRejectsStaleRevision()
        {
            var loadout=ShipLoadout.CreateStarter(catalog); var yard=new SandboxShipyard(catalog,loadout,1000);
            string id=loadout.modules[0].instanceId;
            Assert.That(yard.Upgrade(id,0),Is.True); Assert.That(yard.Upgrade(id,0),Is.False);
            Assert.That(yard.Coins,Is.EqualTo(900)); Assert.That(loadout.modules[0].level,Is.EqualTo(2));
        }
        [Test] public void InsufficientFundsNeverMutateLoadout()
        {
            var loadout=ShipLoadout.CreateStarter(catalog); var yard=new SandboxShipyard(catalog,loadout,0);
            Assert.That(yard.Upgrade(loadout.modules[0].instanceId,0),Is.False);
            Assert.That(loadout.revision,Is.Zero); Assert.That(loadout.modules[0].level,Is.EqualTo(1));
        }
        [Test] public void ConstructionChargesOnlyForCompatibleEmptyMount()
        {
            var loadout=ShipLoadout.CreateStarter(catalog); loadout.modules.RemoveAll(x=>x.mountId=="mount.sail.01");
            var yard=new SandboxShipyard(catalog,loadout,500);
            Assert.That(yard.Install("module.cannon.01","mount.sail.01",0),Is.False);
            Assert.That(yard.Coins,Is.EqualTo(500));
            Assert.That(yard.Install("module.sail.01","mount.sail.01",0),Is.True);
            Assert.That(yard.Install("module.sail.01","mount.sail.01",1),Is.False);
            Assert.That(yard.Coins,Is.EqualTo(400)); loadout.Validate(catalog);
        }
        [Test] public void TurnsRejectDoubleFireAndAdvanceOnTimeout()
        {
            var turns=new TurnState(); Assert.That(turns.TryFire(1),Is.False);
            Assert.That(turns.TryFire(0),Is.True); Assert.That(turns.TryFire(0),Is.False);
            turns.ResolveShot(turns.TurnNumber); Assert.That(turns.ActivePlayer,Is.EqualTo(1));
            turns.Tick(20); Assert.That(turns.ActivePlayer,Is.EqualTo(0));
            turns.Finish(); turns.Tick(100); Assert.That(turns.Phase,Is.EqualTo(BattlePhase.Finished));
        }
        [Test] public void LateProjectileCannotResolveAnotherTurn()
        {
            var turns=new TurnState(); turns.TryFire(0); int expiredTurn=turns.TurnNumber;
            turns.Tick(8); turns.TryFire(1); turns.ResolveShot(expiredTurn);
            Assert.That(turns.ActivePlayer,Is.EqualTo(1));
            Assert.That(turns.Phase,Is.EqualTo(BattlePhase.Resolving));
        }
    }
}
