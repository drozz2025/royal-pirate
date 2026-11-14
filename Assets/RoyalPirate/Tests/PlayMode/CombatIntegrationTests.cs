using System.Collections;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using RoyalPirate.Runtime.Combat;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace RoyalPirate.Tests
{
    public sealed class CombatIntegrationTests
    {
        Scene scene;
        BattleBootstrap battle;
        Touchscreen touchscreen;
        void Configure(Scene loaded,LoadSceneMode mode)
        {
            if(loaded.name!="Integration") return;
            scene=loaded;
            foreach(var root in loaded.GetRootGameObjects())
            {
                var component=root.GetComponent<BattleBootstrap>();
                if(component==null) continue;
                battle=component; battle.loadSavedShip=false; battle.turnSeconds=20;
            }
        }
        [UnitySetUp] public IEnumerator LoadExistingIntegrationScene()
        {
            SceneManager.sceneLoaded+=Configure;
            yield return SceneManager.LoadSceneAsync("Assets/RoyalPirate/Scenes/Integration.unity",LoadSceneMode.Additive);
            SceneManager.sceneLoaded-=Configure;
            yield return null;
            Assert.That(battle,Is.Not.Null); Assert.That(battle.Ready,Is.True,battle.StartupError);
        }
        [UnityTearDown] public IEnumerator Cleanup()
        {
            SceneManager.sceneLoaded-=Configure;
            if(touchscreen!=null) InputSystem.RemoveDevice(touchscreen);
            if(scene.IsValid() && scene.isLoaded) yield return SceneManager.UnloadSceneAsync(scene);
        }
        [UnityTest] public IEnumerator CameraMuzzleHudShotAndBotAreWired()
        {
            var camera=battle.GetComponentInChildren<CombatCamera>();
            var cannon=battle.PlayerWeapon.Module.transform;
            Assert.That(Vector3.Dot(camera.transform.position-cannon.position,Vector3.forward),Is.LessThan(0));
            Assert.That(battle.PlayerWeapon.Muzzle.position.z,Is.GreaterThan(cannon.position.z));
            Assert.That(battle.Snapshot.PlayerHealth,Is.EqualTo(battle.Player.HealthFraction));
            Assert.That(battle.TryPlayerFire(),Is.True); Assert.That(battle.TryPlayerFire(),Is.False);
            bool botFired=false;
            for(int i=0;i<650;i++)
            {
                yield return new WaitForFixedUpdate();
                if(battle.Session.Turns.ActivePlayer==1 && battle.Session.Turns.Phase==BattlePhase.Resolving) {botFired=true;break;}
            }
            Assert.That(botFired,Is.True,"A resolved player shot must lead to a real bot shot.");
        }
        void Touch(int id,TouchPhase phase,Vector2 position)
        { InputSystem.QueueStateEvent(touchscreen,new TouchState {touchId=id,phase=phase,position=position}); }
        [UnityTest] public IEnumerator TouchDragIsCapturedAndUiGestureCannotAimOrFireAccidentally()
        {
            touchscreen=InputSystem.AddDevice<Touchscreen>();
            var input=battle.GetComponent<TouchCombatInput>();
            var document=battle.GetComponent<UnityEngine.UIElements.UIDocument>();if(document!=null)document.enabled=false;
            input.ExternalActionControls=false; input.AdditionalUiBlocker=null;
            var controls=CombatControlRects.ForSafeArea(Screen.safeArea);
            var start=controls.Aim.center;
            Touch(1,TouchPhase.Began,start); yield return null;
            Touch(1,TouchPhase.Moved,start+new Vector2(40,30)); yield return null;
            Assert.That(battle.Snapshot.Yaw,Is.GreaterThan(0)); Assert.That(battle.Snapshot.Elevation,Is.GreaterThan(15));
            // Drag an aim finger over FIRE: ending there must not turn into a button tap.
            Touch(1,TouchPhase.Ended,controls.Fire.center); yield return null;
            Assert.That(battle.Session.Turns.Phase,Is.EqualTo(BattlePhase.Aiming));
            float yaw=battle.Snapshot.Yaw;
            Touch(2,TouchPhase.Began,controls.Power.center); yield return null;
            Touch(2,TouchPhase.Moved,new Vector2(controls.Power.xMax-1,controls.Power.center.y)); yield return null;
            Touch(2,TouchPhase.Ended,controls.Power.center); yield return null;
            Assert.That(battle.Snapshot.Yaw,Is.EqualTo(yaw)); Assert.That(battle.Snapshot.Power,Is.GreaterThan(.9f));
        }
        [UnityTest] public IEnumerator DestroyedMastFallsAndHullSinks()
        {
            var mast=battle.Enemy.First(ModuleKind.Mast); mast.State.ApplyDamage(mast.State.MaxHealth);
            Assert.That(mast.GetComponent<Collider>().enabled,Is.False);
            Assert.That(mast.Visual.GetComponent<Rigidbody>().isKinematic,Is.False);
            var hull=battle.Enemy.First(ModuleKind.Hull); float height=battle.Enemy.transform.position.y;
            hull.State.ApplyDamage(hull.State.MaxHealth);
            yield return null; yield return new WaitForFixedUpdate(); yield return null;
            Assert.That(battle.Enemy.transform.position.y,Is.LessThan(height));
            Assert.That(battle.Session.Outcome,Is.EqualTo(BattleOutcome.PlayerVictory));
        }
        [TestCase(1080,1920)] [TestCase(1170,2532)] [TestCase(1080,2400)]
        public void SafeAreaControlsAreSeparated(int width,int height)
        {
            var safe=new Rect(0,40,width,height-110); var r=CombatControlRects.ForSafeArea(safe);
            Assert.That(r.Aim.Overlaps(r.Power),Is.False); Assert.That(r.Aim.Overlaps(r.Fire),Is.False);
            Assert.That(r.Power.Overlaps(r.Ability),Is.False); Assert.That(r.Fire.Overlaps(r.Ability),Is.False);
            Assert.That(safe.Contains(r.Fire.min),Is.True); Assert.That(safe.Contains(r.Ability.max-Vector2.one),Is.True);
        }
    }
}
