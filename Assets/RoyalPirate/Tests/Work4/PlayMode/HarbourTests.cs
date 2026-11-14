using System;
using System.Collections;
using System.IO;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Progression;
using RoyalPirate.Services;
using RoyalPirate.UI;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;
namespace RoyalPirate.Work4Tests
{
    public sealed class HarbourTests
    {
        HarbourBootstrap app; string path;
        [UnitySetUp] public IEnumerator Setup()
        {
            path=Path.Combine(Path.GetTempPath(),"work4-play-"+Guid.NewGuid().ToString("N"));
            var go=new GameObject("HarbourTest");go.SetActive(false);app=go.AddComponent<HarbourBootstrap>();app.saveDirectoryOverride=path;
            go.SetActive(true);yield return null;yield return null;
            Assert.That(app.Session,Is.Not.Null,"Check URP preparation / console errors.");
        }
        [UnityTearDown] public IEnumerator Cleanup()
        {
            if(app!=null)UnityEngine.Object.Destroy(app.gameObject);yield return null;
            if(Directory.Exists(path))Directory.Delete(path,true);
        }
        static void Activate(Button button)
        { Assert.That(button,Is.Not.Null);button.Focus();using(var evt=NavigationSubmitEvent.GetPooled())button.SendEvent(evt); }
        [UnityTest] public IEnumerator MenuButtonsBuildSaveReloadAndReturn()
        {
            Activate(app.Root.Q<Button>("shipyard"));yield return null;
            Assert.That(app.Navigation.Current,Is.EqualTo(MenuScreen.Shipyard));
            app.SelectMount("mount.bow.01");long coins=app.Session.Snapshot.coins;
            Activate(app.Root.Q<Button>("build-upgrade"));yield return null;
            var built=app.Session.Snapshot.loadout.modules.Find(m=>m.mountId=="mount.bow.01");Assert.That(built,Is.Not.Null);
            Assert.That(app.Session.Snapshot.coins,Is.EqualTo(coins-100));string id=built.instanceId;
            Activate(app.Root.Q<Button>("build-upgrade"));yield return null;
            Assert.That(app.Session.Snapshot.loadout.modules.Find(m=>m.instanceId==id).level,Is.EqualTo(2));
            Activate(app.Root.Q<Button>("home"));yield return null;Assert.That(app.Navigation.Current,Is.EqualTo(MenuScreen.Home));
            UnityEngine.Object.Destroy(app.gameObject);yield return null;
            var go=new GameObject("Reload");go.SetActive(false);app=go.AddComponent<HarbourBootstrap>();app.saveDirectoryOverride=path;go.SetActive(true);
            yield return null;yield return null;
            Assert.That(app.Session.Snapshot.loadout.modules.Find(m=>m.instanceId==id).level,Is.EqualTo(2));
            Assert.That(app.Session.Snapshot.coins,Is.EqualTo(coins-200));
        }
        [UnityTest] public IEnumerator OrbitZoomAndAllRoutesRemainUsable()
        {
            app.Open(MenuScreen.Shipyard);yield return null;
            float yaw=app.Preview.Yaw;app.Preview.Rotate(45);Assert.That(app.Preview.Yaw,Is.Not.EqualTo(yaw));
            app.Preview.Zoom(-1000);Assert.That(app.Preview.Distance,Is.EqualTo(17));app.Preview.Zoom(1000);Assert.That(app.Preview.Distance,Is.EqualTo(38));
            foreach(MenuScreen screen in Enum.GetValues(typeof(MenuScreen)))
            {app.Open(screen);yield return null;Assert.That(app.Root.Q("screen-body"),Is.Not.Null);app.Open(MenuScreen.Home);}
        }
        [UnityTest] public IEnumerator BattleProjectionMatchesSavedShip()
        {
            var p=app.Session.Snapshot;app.Session.BuildOrUpgrade("mount.bow.01",p.revision,DateTime.UtcNow);
            var catalog=JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
            IProgressStore store=new LocalLoadoutStore(path,catalog);store.Save(app.Session.BattleLoadout());
            Assert.That(JsonUtility.ToJson(store.Load()),Is.EqualTo(JsonUtility.ToJson(app.Session.Snapshot.loadout)));
            yield return null;
        }
        [UnityTest] public IEnumerator PortraitLayoutsKeepActionsWithinSafeArea()
        {
            int oldW=Screen.width,oldH=Screen.height;
            try
            {
                foreach(var size in new[]{new Vector2Int(390,844),new Vector2Int(360,640),new Vector2Int(768,1024)})
                {
                    Screen.SetResolution(size.x,size.y,false);yield return null;yield return null;
                    Assert.That(Screen.width,Is.EqualTo(size.x),"Requested resolution was not applied by this Unity test host.");
                    Assert.That(Screen.height,Is.EqualTo(size.y),"Requested resolution was not applied by this Unity test host.");
                    app.Open(MenuScreen.Shipyard);yield return null;yield return null;
                    var bounds=app.Root.Q("safe-area").worldBound;var action=app.Root.Q<Button>("build-upgrade").worldBound;
                    Assert.That(action.height,Is.GreaterThanOrEqualTo(48));
                    Assert.That(action.yMax,Is.LessThanOrEqualTo(bounds.yMax+1));Assert.That(action.xMax,Is.LessThanOrEqualTo(bounds.xMax+1));
                }
            }
            finally {Screen.SetResolution(oldW,oldH,false);}
        }
    }
}
