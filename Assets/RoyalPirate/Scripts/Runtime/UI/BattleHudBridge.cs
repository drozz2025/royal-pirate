using System.Collections;
using RoyalPirate.Runtime;
using RoyalPirate.Runtime.Combat;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;
namespace RoyalPirate.UI
{
    [DisallowMultipleComponent, RequireComponent(typeof(BattleBootstrap))]
    public sealed class BattleHudBridge : MonoBehaviour
    {
        BattleBootstrap battle;
        TouchCombatInput input;
        CombatHudAdapter adapter;
        BattleHudPresenter presenter;
        PanelSettings panel;
        UIDocument document;
        VisualElement safe;
        public bool Bound => adapter!=null;
        void Awake() {battle=GetComponent<BattleBootstrap>();battle.diagnosticHud=false;}
        void OnEnable() {StartCoroutine(BindWhenReady());}
        IEnumerator BindWhenReady()
        {
            while(!battle.Ready && battle.StartupError==null) yield return null;
            if(!battle.Ready) yield break;
            // Recover safely if this component is enabled on a diagnostic scene at runtime.
            var diagnostic=GetComponent<CombatHud>();if(diagnostic!=null)diagnostic.enabled=false;
            panel=ScriptableObject.CreateInstance<PanelSettings>();
            panel.themeStyleSheet=Resources.Load<ThemeStyleSheet>("HarbourTheme");
            panel.scaleMode=PanelScaleMode.ScaleWithScreenSize;panel.referenceResolution=new Vector2Int(480,960);panel.match=0;
            document=GetComponent<UIDocument>();if(document==null)document=gameObject.AddComponent<UIDocument>();
            document.enabled=true;document.panelSettings=panel;document.sortingOrder=20;
            var root=document.rootVisualElement;root.Clear();root.pickingMode=PickingMode.Ignore;
            root.style.color=Color.white;root.style.fontSize=18;
            var styles=Resources.Load<StyleSheet>("Harbour");if(styles!=null)root.styleSheets.Add(styles);
            safe=new VisualElement {name="battle-safe",pickingMode=PickingMode.Ignore};
            safe.style.position=Position.Absolute;root.Add(safe);
            adapter=new CombatHudAdapter(battle);presenter=new BattleHudPresenter(safe,adapter);
            var home=new Button(()=>SceneManager.LoadScene("Harbour")){name="battle-harbour",text="‹ Harbour"};
            home.style.position=Position.Absolute;home.style.top=Length.Percent(32);home.style.left=12;home.style.height=48;
            home.SetEnabled(Application.CanStreamedLevelBeLoaded("Harbour"));safe.Add(home);
            var reticle=new Label("+"){pickingMode=PickingMode.Ignore};reticle.style.position=Position.Absolute;
            reticle.style.left=Length.Percent(50);reticle.style.top=Length.Percent(45);reticle.style.fontSize=30;safe.Add(reticle);
            input=GetComponent<TouchCombatInput>();
            if(input!=null){input.ClearCapture();input.ExternalActionControls=true;input.AdditionalUiBlocker=BlocksAim;}
            UpdateSafeArea();
        }
        public bool BlocksAim(Vector2 point)
        {
            if(safe?.panel==null)return true;
            point.y=Screen.height-point.y;
            var p=RuntimePanelUtils.ScreenToPanel(safe.panel,point);
            var picked=safe.panel.Pick(p);
            return picked!=null && picked!=safe && picked!=document.rootVisualElement && safe.Contains(picked);
        }
        void Update() {UpdateSafeArea();}
        void UpdateSafeArea()
        {
            if(safe?.panel==null)return;
            var area=Screen.safeArea;
            var a=RuntimePanelUtils.ScreenToPanel(safe.panel,new Vector2(area.xMin,Screen.height-area.yMax));
            var b=RuntimePanelUtils.ScreenToPanel(safe.panel,new Vector2(area.xMax,Screen.height-area.yMin));
            safe.style.left=a.x;safe.style.top=a.y;safe.style.width=b.x-a.x;safe.style.height=b.y-a.y;
        }
        void OnDisable()
        {
            StopAllCoroutines();presenter?.Dispose();presenter=null;adapter?.Dispose();adapter=null;
            // Fail closed: invisible diagnostic action rectangles must never become active.
            if(input!=null){input.ClearCapture();input.AdditionalUiBlocker=null;input.ExternalActionControls=true;}
            if(document!=null){document.rootVisualElement.Clear();document.enabled=false;}
            if(panel!=null)Destroy(panel);panel=null;safe=null;
        }
    }
}
