using System.Collections;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using RoyalPirate.Runtime.Combat;
using RoyalPirate.UI;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;
namespace RoyalPirate.IntegrationTests
{
    public sealed class IntegratedBattleTests
    {
        Scene scene;BattleBootstrap battle;Touchscreen touch;
        void Configure(Scene loaded,LoadSceneMode mode)
        {
            if(loaded.name!="Integration")return;scene=loaded;
            foreach(var root in loaded.GetRootGameObjects())
            {var b=root.GetComponent<BattleBootstrap>();if(b!=null){battle=b;b.loadSavedShip=false;}}
        }
        [UnitySetUp] public IEnumerator Load()
        {
            SceneManager.sceneLoaded+=Configure;
            yield return SceneManager.LoadSceneAsync("Assets/RoyalPirate/Scenes/Integration.unity",LoadSceneMode.Additive);
            SceneManager.sceneLoaded-=Configure;
            for(int i=0;i<10 && (battle==null || !battle.GetComponent<BattleHudBridge>().Bound);i++)yield return null;
            Assert.That(battle,Is.Not.Null);Assert.That(battle.Ready,Is.True,battle.StartupError);
        }
        [UnityTearDown] public IEnumerator Cleanup()
        {SceneManager.sceneLoaded-=Configure;if(touch!=null)InputSystem.RemoveDevice(touch);if(scene.IsValid()&&scene.isLoaded)yield return SceneManager.UnloadSceneAsync(scene);}
        [UnityTest] public IEnumerator OneHudOwnsControlsAndRebindDoesNotDuplicate()
        {
            var bridge=battle.GetComponent<BattleHudBridge>();Assert.That(bridge.Bound,Is.True);
            Assert.That(battle.GetComponent<CombatHud>(),Is.Null);
            Assert.That(battle.GetComponent<TouchCombatInput>().ExternalActionControls,Is.True);
            var doc=battle.GetComponent<UIDocument>();Assert.That(doc.rootVisualElement.Query<Button>("battle-fire").ToList().Count,Is.EqualTo(1));
            var previousPanel=doc.panelSettings;
            bridge.enabled=false;Assert.That(bridge.Bound,Is.False);bridge.enabled=true;yield return null;yield return null;
            Assert.That(bridge.Bound,Is.True);Assert.That(doc.panelSettings,Is.Not.Null);
            Assert.That(doc.panelSettings,Is.Not.SameAs(previousPanel),"Rebind must attach a fresh panel before enabling UIDocument.");
            Assert.That(doc.rootVisualElement.Query<Button>("battle-fire").ToList().Count,Is.EqualTo(1));
            var fire=doc.rootVisualElement.Q<Button>("battle-fire");var panel=doc.rootVisualElement.panel;
            var origin=RuntimePanelUtils.ScreenToPanel(panel,Vector2.zero);
            var edge=RuntimePanelUtils.ScreenToPanel(panel,new Vector2(Screen.width,Screen.height));
            var center=fire.worldBound.center;
            var p=new Vector2((center.x-origin.x)*Screen.width/(edge.x-origin.x),(center.y-origin.y)*Screen.height/(edge.y-origin.y));
            Assert.That(bridge.BlocksAim(new Vector2(p.x,Screen.height-p.y)),Is.True);
        }
        [UnityTest] public IEnumerator TouchOnToolkitFireDoesNotAimOrShootTwice()
        {
            yield return null;yield return null;
            touch=InputSystem.AddDevice<Touchscreen>();
            var doc=battle.GetComponent<UIDocument>();var fire=doc.rootVisualElement.Q<Button>("battle-fire");
            var panel=doc.rootVisualElement.panel;var a=RuntimePanelUtils.ScreenToPanel(panel,Vector2.zero);
            var b=RuntimePanelUtils.ScreenToPanel(panel,new Vector2(Screen.width,Screen.height));
            var center=fire.worldBound.center;
            var point=new Vector2((center.x-a.x)*Screen.width/(b.x-a.x),Screen.height-(center.y-a.y)*Screen.height/(b.y-a.y));
            float yaw=battle.Snapshot.Yaw;int transitions=0;var previous=battle.Snapshot.Phase;
            System.Action<CombatHudState> observe=s=>{if(previous!=BattlePhase.Resolving && s.Phase==BattlePhase.Resolving)transitions++;previous=s.Phase;};
            battle.HudChanged+=observe;
            InputSystem.QueueStateEvent(touch,new TouchState {touchId=1,phase=TouchPhase.Began,position=point});yield return null;
            InputSystem.QueueStateEvent(touch,new TouchState {touchId=1,phase=TouchPhase.Ended,position=point});yield return null;yield return null;
            battle.HudChanged-=observe;
            Assert.That(transitions,Is.EqualTo(1));Assert.That(battle.Snapshot.Yaw,Is.EqualTo(yaw));
        }
        [UnityTest] public IEnumerator AdapterRejectsDuplicateFireAndInputAfterDisposal()
        {
            var adapter=new CombatHudAdapter(battle);adapter.RequestFire();
            Assert.That(battle.Session.Turns.Phase,Is.EqualTo(BattlePhase.Resolving));
            var projectile=battle.PlayerWeapon.Projectile;adapter.RequestFire();Assert.That(battle.PlayerWeapon.Projectile,Is.SameAs(projectile));
            Assert.That(battle.TryPlayerFire(),Is.False);int events=0;adapter.Changed+=()=>events++;
            adapter.Dispose();adapter.RequestFire();yield return null;Assert.That(events,Is.Zero);
        }
    }
}
