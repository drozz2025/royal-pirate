using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using UnityEngine;
using UnityEngine.TestTools;

namespace RoyalPirate.Tests
{
    public sealed class CombatPhysicsTests
    {
        readonly List<GameObject> objects=new List<GameObject>();
        float previousStep;
        GameObject New(string name) { var go=new GameObject(name); objects.Add(go); return go; }
        [SetUp] public void Setup() { previousStep=Time.fixedDeltaTime; Time.fixedDeltaTime=.02f; }
        [TearDown] public void Cleanup()
        { foreach(var go in objects) if(go!=null) Object.DestroyImmediate(go); objects.Clear(); Time.fixedDeltaTime=previousStep; }
        ModuleView Module(Vector3 position,Vector3 size,string id,ModuleKind kind=ModuleKind.Hull,ShipView owner=null)
        {
            var go=New(id); go.transform.position=position; go.AddComponent<BoxCollider>().size=size;
            var ship=owner!=null?owner:go.AddComponent<ShipView>(); var m=go.AddComponent<ModuleView>();
            m.Initialize(ship,new ModuleInstallation {instanceId=id},new ModuleDefinition {kind=kind,baseHealth=100,size=ShipView.ToDomain(size),damage=40}); return m;
        }
        ProjectileView Launch(Vec3 origin,Vec3 velocity,ShipView owner=null)
        {
            var ball=New("shot").AddComponent<ProjectileView>(); ball.SetPooled(true);
            ball.Initialize(new ShotRequest {Origin=origin,Velocity=velocity,Damage=40},owner,()=>{}); Physics.SyncTransforms(); return ball;
        }
        [UnityTest] public IEnumerator NearestThinSurfaceWins()
        {
            var near=Module(new Vector3(0,3,2),new Vector3(4,4,.02f),"near");
            var far=Module(new Vector3(0,3,3),new Vector3(4,4,.02f),"far");
            var shot=Launch(new Vec3(0,3,0),new Vec3(0,0,400)); int events=0; shot.Impacted+=_=>events++;
            yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(near.State.Health,Is.EqualTo(60)); Assert.That(far.State.Health,Is.EqualTo(100)); Assert.That(events,Is.EqualTo(1));
        }
        [UnityTest] public IEnumerator WaterPrecedesSubmergedTargets()
        {
            var target=Module(new Vector3(0,-2,0),new Vector3(2,.1f,2),"submerged");
            var shot=Launch(new Vec3(0,2,0),new Vec3(0,-400,0)); ImpactKind kind=ImpactKind.Expired; shot.Impacted+=hit=>kind=hit.Kind;
            yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(kind,Is.EqualTo(ImpactKind.Water)); Assert.That(target.State.Health,Is.EqualTo(100));
        }
        [UnityTest] public IEnumerator GenericObstacleStopsDamage()
        {
            var wall=New("wall"); wall.transform.position=new Vector3(0,3,1); wall.AddComponent<BoxCollider>().size=new Vector3(4,4,.05f);
            var target=Module(new Vector3(0,3,2),new Vector3(4,4,.1f),"behind-wall");
            var shot=Launch(new Vec3(0,3,0),new Vec3(0,0,300)); ImpactKind kind=ImpactKind.Expired; shot.Impacted+=hit=>kind=hit.Kind;
            yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(kind,Is.EqualTo(ImpactKind.Obstacle)); Assert.That(target.State.Health,Is.EqualTo(100));
        }
        [UnityTest] public IEnumerator InitialOverlapDamagesOnceAndPoolCanBeReused()
        {
            var target=Module(new Vector3(0,3,0),Vector3.one,"overlap");
            var shot=Launch(new Vec3(0,3,0),new Vec3(0,0,10)); int completed=0;
            shot.Impacted+=_=>completed++;
            yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(target.State.Health,Is.EqualTo(60)); Assert.That(shot.gameObject.activeSelf,Is.False);
            shot.Initialize(new ShotRequest {Origin=new Vec3(0,3,0),Velocity=new Vec3(0,0,10),Damage=40},null,()=>{});
            yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(target.State.Health,Is.EqualTo(20)); Assert.That(completed,Is.EqualTo(2));
        }
        [UnityTest] public IEnumerator BufferOverflowStillFindsNearestSurface()
        {
            // Force overlap buffer saturation with owner colliders. The enemy must not disappear from the query.
            var owner=New("owner").AddComponent<ShipView>();
            for(int i=0;i<70;i++) { var part=New("owner-collider"); part.transform.SetParent(owner.transform); part.transform.position=new Vector3(0,3,0); part.AddComponent<BoxCollider>(); }
            var target=Module(new Vector3(0,3,0),Vector3.one,"enemy-overlap");
            var shot=Launch(new Vec3(0,3,0),new Vec3(0,0,20),owner);
            yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(target.State.Health,Is.EqualTo(60)); Assert.That(shot.OverflowQueries,Is.GreaterThan(0));
        }
        [UnityTest] public IEnumerator CancelAndSuspendNeverApplyDamage()
        {
            var target=Module(new Vector3(0,3,2),new Vector3(2,2,.1f),"target");
            var shot=Launch(new Vec3(0,3,0),new Vec3(0,0,200)); shot.Suspended=true;
            yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(shot.transform.position,Is.EqualTo(new Vector3(0,3,0))); shot.Cancel();
            yield return new WaitForFixedUpdate(); Assert.That(target.State.Health,Is.EqualTo(100));
        }
        [Test] public void DestroyedCannonAndInvalidRequestCannotFire()
        {
            var cannon=Module(new Vector3(0,3,0),Vector3.one,"gun",ModuleKind.Cannon);
            var weapon=cannon.Ship.gameObject.AddComponent<CannonWeapon>(); weapon.Initialize(cannon.Ship,cannon,null,()=>{});
            Assert.That(weapon.TryFire(new ShotRequest()),Is.False); Assert.That(weapon.CanFire,Is.True);
            cannon.State.ApplyDamage(100); Assert.That(weapon.CanFire,Is.False);
        }
    }
}
