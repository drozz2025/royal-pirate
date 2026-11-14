using System.IO;
using RoyalPirate.Runtime;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace RoyalPirate.Editor
{
    public static class MobileProjectSetup
    {
        const string Root = "Assets/RoyalPirate";
        // Explicit setup, no hidden automatic project mutation. Can also run with -executeMethod.
        [MenuItem("Royal Pirate/Prepare Mobile Project")]
        public static void Prepare()
        {
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            Directory.CreateDirectory(Root + "/Settings");
            Directory.CreateDirectory(Root + "/Materials"); AssetDatabase.Refresh();
            string rendererPath = Root + "/Settings/MobileRenderer.asset";
            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(rendererPath);
            if (renderer == null)
            { renderer = ScriptableObject.CreateInstance<UniversalRendererData>(); AssetDatabase.CreateAsset(renderer,rendererPath); }
            string pipelinePath = Root + "/Settings/MobileURP.asset";
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(pipelinePath);
            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create(renderer);
                pipeline.supportsHDR = false; pipeline.msaaSampleCount = 2; pipeline.renderScale = 1;
                pipeline.shadowDistance = 35; pipeline.supportsCameraDepthTexture = false;
                pipeline.supportsCameraOpaqueTexture = false;
                AssetDatabase.CreateAsset(pipeline,pipelinePath);
            }
            GraphicsSettings.defaultRenderPipeline = pipeline;
            QualitySettings.renderPipeline = pipeline; QualitySettings.vSyncCount = 0;
            PlayerSettings.companyName = "Royal Pirate"; PlayerSettings.productName = "ROYAL PIRATE";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.defaultScreenWidth = 540; PlayerSettings.defaultScreenHeight = 960;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.runInBackground = false;
            // Use the installed Input System; keep project changes explicit and versionable.
            var settings = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
            var input = settings.FindProperty("activeInputHandler");
            if (input != null) { input.intValue = 1; settings.ApplyModifiedPropertiesWithoutUndo(); }
            var materialPath = Root + "/Materials/IntegrationLit.mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (material == null)
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                AssetDatabase.CreateAsset(material,materialPath);
            }
            string scenePath = Root + "/Scenes/Integration.unity";
            var scene = EditorSceneManager.OpenScene(scenePath,OpenSceneMode.Single);
            var bootstrap = Object.FindFirstObjectByType<BattleBootstrap>();
            if (bootstrap == null) throw new System.InvalidOperationException("Integration scene has no bootstrap.");
            bootstrap.materialTemplate = material;
            EditorUtility.SetDirty(bootstrap);
            EditorSceneManager.SaveScene(scene);
            EditorBuildSettings.scenes = new[] {new EditorBuildSettingsScene(scenePath,true)};
            AssetDatabase.SaveAssets();
            Debug.Log("ROYAL PIRATE: setup saved. Open Test Runner; run EditMode and PlayMode. Device validation is still required.");
        }
    }
}
