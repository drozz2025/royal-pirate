using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace RoyalPirate.UI.Editor
{
    public static class IntegrationProjectSetup
    {
        [MenuItem("Royal Pirate/Prepare First Battle Integration")]
        public static void Prepare()
        {
            if(!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())return;
            RoyalPirate.Editor.MobileProjectSetup.Prepare();
            Work4Setup.Prepare();
            Debug.Log("Harbour and Integration prepared. Run EditMode and PlayMode tests before device validation.");
        }
    }
}
