using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;
namespace RoyalPirate.UI.Editor
{
    public static class Work4Setup
    {
        [MenuItem("Royal Pirate/Prepare Work 4 Harbour")]
        public static void Prepare()
        {
            if(!Application.isBatchMode&&!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())return;
            const string scenePath="Assets/RoyalPirate/Scenes/Shipyard/Harbour.unity";
            const string prefabPath="Assets/RoyalPirate/Prefabs/UI/Harbour.prefab";
            const string panelPath="Assets/RoyalPirate/UI/HarbourPanel.asset";
            var material=AssetDatabase.LoadAssetAtPath<Material>("Assets/RoyalPirate/Materials/IntegrationLit.mat");
            if(material==null)throw new InvalidOperationException("Run Royal Pirate/Prepare Mobile Project first (Work 1). This step does not edit the battle scene.");
            var panel=AssetDatabase.LoadAssetAtPath<PanelSettings>(panelPath);
            if(panel==null) {panel=ScriptableObject.CreateInstance<PanelSettings>();AssetDatabase.CreateAsset(panel,panelPath);}
            panel.themeStyleSheet=Resources.Load<ThemeStyleSheet>("HarbourTheme");
            panel.scaleMode=PanelScaleMode.ScaleWithScreenSize;panel.referenceResolution=new Vector2Int(480,960);panel.match=0;
            EditorUtility.SetDirty(panel);
            var scene=EditorSceneManager.OpenScene(scenePath,OpenSceneMode.Single);
            var bootstrap=UnityEngine.Object.FindFirstObjectByType<HarbourBootstrap>();
            if(bootstrap==null)throw new InvalidDataException("Harbour bootstrap missing.");
            bootstrap.materialTemplate=material;bootstrap.panelTemplate=panel;EditorUtility.SetDirty(bootstrap);
            PrefabUtility.SaveAsPrefabAsset(bootstrap.gameObject,prefabPath);EditorSceneManager.SaveScene(scene);
            var scenes=new List<EditorBuildSettingsScene>{new EditorBuildSettingsScene(scenePath,true)};
            foreach(var entry in EditorBuildSettings.scenes)if(entry.path!=scenePath)scenes.Add(entry);
            const string battle="Assets/RoyalPirate/Scenes/Integration.unity";
            if(!scenes.Exists(s=>s.path==battle))scenes.Add(new EditorBuildSettingsScene(battle,true));
            EditorBuildSettings.scenes=scenes.ToArray();AssetDatabase.SaveAssets();
            Debug.Log("Work 4 prepared. Run EditMode / PlayMode tests, then Play Harbour. Device checks remain mandatory.");
        }
    }
}
