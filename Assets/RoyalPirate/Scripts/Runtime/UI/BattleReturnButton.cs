using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;
namespace RoyalPirate.UI
{
    // Temporary return control for the unchanged Work 1 battle harness. Work 3 owns battle input/HUD.
    public sealed class BattleReturnButton : MonoBehaviour
    {
        PanelSettings panel;
        void Awake() {DontDestroyOnLoad(gameObject);SceneManager.sceneLoaded+=Loaded;}
        void Loaded(Scene scene,LoadSceneMode mode)
        {
            if(scene.name!="Integration") {Destroy(gameObject);return;}
            panel=ScriptableObject.CreateInstance<PanelSettings>();panel.themeStyleSheet=Resources.Load<ThemeStyleSheet>("HarbourTheme");panel.scaleMode=PanelScaleMode.ScaleWithScreenSize;panel.referenceResolution=new Vector2Int(480,960);
            var doc=gameObject.AddComponent<UIDocument>();doc.panelSettings=panel;doc.sortingOrder=100;
            var root=doc.rootVisualElement;root.pickingMode=PickingMode.Ignore;
            root.style.position=Position.Absolute;root.style.left=12;root.style.top=Length.Percent(38);
            var button=new Button(()=>SceneManager.LoadScene("Harbour")){text="< Harbour"};button.style.width=140;button.style.height=54;
            button.style.fontSize=18;button.style.backgroundColor=new Color(.04f,.14f,.25f);button.style.color=Color.white;root.Add(button);
        }
        void OnDestroy() {SceneManager.sceneLoaded-=Loaded;if(panel!=null)Destroy(panel);}
    }
}
