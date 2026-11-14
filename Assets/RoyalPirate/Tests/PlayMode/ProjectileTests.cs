using System.Collections;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using UnityEngine;
using UnityEngine.TestTools;

namespace RoyalPirate.Tests
{
    public sealed class ProjectileTests
    {
        GameObject target, projectile, source;
        float previousStep;
        [SetUp] public void SetUp() { previousStep=Time.fixedDeltaTime; Time.fixedDeltaTime=0.02f; }
        [TearDown] public void TearDown()
        {
            Object.DestroyImmediate(target); Object.DestroyImmediate(projectile); Object.DestroyImmediate(source);
            Time.fixedDeltaTime=previousStep;
        }
        [UnityTest] public IEnumerator SweptCollisionHitsThinModuleAndResolvesOnce()
        {
            source=new GameObject("source"); var owner=source.AddComponent<ShipView>();
            target=GameObject.CreatePrimitive(PrimitiveType.Cube); target.transform.position=new Vector3(0,3,2);
            target.transform.localScale=new Vector3(5,5,.05f);
            var ship=target.AddComponent<ShipView>(); var module=target.AddComponent<ModuleView>();
            module.Initialize(ship,new ModuleInstallation {instanceId="target",level=1},
                new ModuleDefinition {kind=ModuleKind.Hull,baseHealth=100});
            Physics.SyncTransforms(); int resolutions=0;
            projectile=new GameObject("shot"); projectile.AddComponent<ProjectileView>().Initialize(
                new ShotRequest {Origin=new Vec3(0,3,0),Velocity=new Vec3(0,0,200),Damage=40},owner,()=>resolutions++);
            for(int i=0;i<5;i++) yield return new WaitForFixedUpdate();
            Assert.That(module.State.Health,Is.EqualTo(60)); Assert.That(resolutions,Is.EqualTo(1));
        }
        [UnityTest] public IEnumerator ShotDoesNotDamageItsOwner()
        {
            source=GameObject.CreatePrimitive(PrimitiveType.Cube); source.transform.position=new Vector3(0,3,0);
            var owner=source.AddComponent<ShipView>(); var module=source.AddComponent<ModuleView>();
            module.Initialize(owner,new ModuleInstallation {instanceId="owner",level=1},
                new ModuleDefinition {kind=ModuleKind.Hull,baseHealth=100});
            projectile=new GameObject("shot"); projectile.AddComponent<ProjectileView>().Initialize(
                new ShotRequest {Origin=new Vec3(0,3,0),Velocity=new Vec3(0,0,10),Damage=40},owner,()=>{});
            Physics.SyncTransforms(); for(int i=0;i<5;i++) yield return new WaitForFixedUpdate();
            Assert.That(module.State.Health,Is.EqualTo(100));
        }
    }
}
