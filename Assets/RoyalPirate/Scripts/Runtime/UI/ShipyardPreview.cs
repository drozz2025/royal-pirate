using System;
using System.Collections.Generic;
using RoyalPirate.Domain;
using RoyalPirate.Progression;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UIElements;

namespace RoyalPirate.UI
{
    public sealed class ShipyardPreview : MonoBehaviour
    {
        public ShipArtBindings art;
        public Material materialTemplate;
        public Camera ViewCamera { get; private set; }
        public float Yaw { get; private set; } = 135;
        public float Distance { get; private set; } = 24;
        public event Action<string> Selected;
        Transform ship;
        readonly List<Material> materials=new List<Material>();
        readonly List<Transform> waves=new List<Transform>();
        readonly Dictionary<string,Renderer[]> renderers=new Dictionary<string,Renderer[]>();
        readonly Dictionary<int,Vector2> pointers=new Dictionary<int,Vector2>();
        Vector2 pressPosition; bool dragged; float pinchDistance;
        VisualElement viewport;
        RenderTexture previewTexture;
        string selected;
        public void Initialize(Material template,ShipArtBindings bindings)
        {
            materialTemplate=template; art=bindings;
            var cameraObject=new GameObject("HarbourCamera"); cameraObject.transform.SetParent(transform,false);
            ViewCamera=cameraObject.AddComponent<Camera>(); ViewCamera.tag="MainCamera";
            ViewCamera.fieldOfView=40; ViewCamera.nearClipPlane=.1f; ViewCamera.farClipPlane=180;
            ViewCamera.clearFlags=CameraClearFlags.SolidColor; ViewCamera.backgroundColor=new Color(.17f,.67f,.95f);
            cameraObject.AddComponent<AudioListener>();
            var sun=new GameObject("HarbourSun").AddComponent<Light>(); sun.transform.SetParent(transform,false);
            sun.type=LightType.Directional; sun.intensity=1.3f; sun.transform.rotation=Quaternion.Euler(45,-30,0);
            RenderSettings.ambientLight=new Color(.65f,.78f,.86f);
            var sea=Primitive("Tropical sea",PrimitiveType.Plane,transform,new Vector3(0,-1,0),new Vector3(16,1,16),Material(new Color(.02f,.59f,.77f)));
            sea.GetComponent<Collider>().enabled=false;
            var foam=Material(new Color(.3f,.89f,.95f));
            for (int i=0;i<18;i++)
            {
                var wave=Primitive("Water glint",PrimitiveType.Cube,transform,new Vector3((i%6-3)*5,-.97f,(i/6-1)*9),new Vector3(2,.015f,.10f),foam);
                wave.GetComponent<Collider>().enabled=false; waves.Add(wave.transform);
            }
            var rock=Material(new Color(.58f,.72f,.67f)); var grass=Material(new Color(.32f,.74f,.26f));
            for(int i=0;i<4;i++)
            {
                Vector3 pos=new Vector3((i%2==0?-1:1)*(15+i),0,15+i*7);
                var island=Primitive("Provisional island",PrimitiveType.Sphere,transform,pos,new Vector3(9,5,7),rock); island.GetComponent<Collider>().enabled=false;
                var top=Primitive("Island grass",PrimitiveType.Sphere,transform,pos+Vector3.up*2,new Vector3(8,1.3f,6),grass); top.GetComponent<Collider>().enabled=false;
            }
            PositionCamera();
        }
        public void Show(PlayerProgress state,ShipCatalog catalog,bool showMounts)
        {
            if(ship!=null) { ship.gameObject.SetActive(false); Destroy(ship.gameObject); }
            renderers.Clear();
            ship=new GameObject("Royal Sloop — provisional geometry").transform; ship.SetParent(transform,false);
            // Retain material instances across rebuilds; no per-frame/per-click material leak.
            var wood=GetPalette(0,new Color(.64f,.32f,.12f));
            var gold=GetPalette(1,new Color(1,.66f,.13f)); var navy=GetPalette(2,new Color(.1f,.19f,.34f));
            var metal=GetPalette(3,new Color(.20f,.29f,.37f)); var ghost=GetPalette(4,new Color(.25f,.87f,1,.25f),true);
            foreach(var mount in catalog.mounts)
            {
                var installed=state.loadout.modules.Find(m=>m.mountId==mount.id);
                if(installed==null && !showMounts) continue;
                var definition=catalog.Module(installed?.definitionId ?? mount.defaultModuleId);
                var prefab=installed!=null && art!=null ? art.Find(definition.id,state.stage) : null;
                GameObject part;
                if(prefab!=null)
                { part=Instantiate(prefab,ship); part.transform.localPosition=ToUnity(mount.position); }
                else
                {
                    var tint=installed==null?ghost:definition.kind==ModuleKind.Sail?navy:
                        definition.kind==ModuleKind.Cannon||definition.kind==ModuleKind.Armor?metal:
                        definition.kind==ModuleKind.Bow||definition.kind==ModuleKind.HeroSlot?gold:wood;
                    part=Primitive("PROVISIONAL "+mount.id,PrimitiveType.Cube,ship,ToUnity(mount.position),ToUnity(definition.size),tint);
                }
                var target=part.AddComponent<MountTarget>(); target.MountId=mount.id;
                if(part.GetComponentInChildren<Collider>()==null)
                { var collider=part.AddComponent<BoxCollider>(); collider.size=ToUnity(definition.size); }
                renderers[mount.id]=part.GetComponentsInChildren<Renderer>();
            }
            Highlight(selected);
        }
        readonly Dictionary<int,Material> palette=new Dictionary<int,Material>();
        Material GetPalette(int id,Color color,bool transparent=false)
        { if(!palette.TryGetValue(id,out var value)) { value=Material(color,transparent); palette.Add(id,value); } return value; }
        Material Material(Color color,bool transparent=false)
        {
            var shader=materialTemplate!=null?materialTemplate.shader:Shader.Find("Universal Render Pipeline/Lit");
            if(shader==null) throw new InvalidOperationException("URP material missing. Run Prepare Mobile Project, then Prepare Work 4.");
            var value=materialTemplate!=null?new Material(materialTemplate):new Material(shader); value.color=color;
            if(transparent)
            {
                value.SetFloat("_Surface",1); value.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);
                value.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha); value.SetFloat("_ZWrite",0);
                value.EnableKeyword("_SURFACE_TYPE_TRANSPARENT"); value.renderQueue=(int)RenderQueue.Transparent;
            }
            materials.Add(value); return value;
        }
        static GameObject Primitive(string name,PrimitiveType type,Transform parent,Vector3 pos,Vector3 size,Material material)
        {
            var item=GameObject.CreatePrimitive(type); item.name=name; item.transform.SetParent(parent,false);
            item.transform.localPosition=pos; item.transform.localScale=size; item.GetComponent<Renderer>().sharedMaterial=material; return item;
        }
        static Vector3 ToUnity(Vec3 v)=>new Vector3(v.x,v.y,v.z);
        public void Highlight(string mount)
        {
            selected=mount;
            foreach(var pair in renderers) foreach(var renderer in pair.Value)
            {
                var block=new MaterialPropertyBlock();
                if(pair.Key==mount) block.SetColor("_BaseColor",new Color(1,.79f,.25f));
                renderer.SetPropertyBlock(block);
            }
        }
        public void Rotate(float delta) { Yaw=Mathf.Repeat(Yaw+delta,360); PositionCamera(); }
        public void Zoom(float delta) { Distance=Mathf.Clamp(Distance+delta,17,38); PositionCamera(); }
        void PositionCamera()
        {
            if(ViewCamera==null) return;
            Vector3 target=new Vector3(0,2.7f,0);
            ViewCamera.transform.position=target+Quaternion.Euler(19,Yaw,0)*new Vector3(0,0,-Distance);
            ViewCamera.transform.LookAt(target);
        }
        public void Bind(VisualElement element)
        {
            // Viewport is the only element that can orbit/pick. Menus never leak touch input into 3D.
            viewport=element; pointers.Clear(); pinchDistance=0;
            element.RegisterCallback<PointerDownEvent>(e=> {
                if(e.button!=0) return;
                pointers[e.pointerId]=e.position; pressPosition=e.position; dragged=false;
                element.CapturePointer(e.pointerId); if(pointers.Count>1) { dragged=true; pinchDistance=Pinch(); }
                e.StopPropagation();
            });
            element.RegisterCallback<PointerMoveEvent>(e=> {
                if(!pointers.TryGetValue(e.pointerId,out var previous)) return;
                pointers[e.pointerId]=e.position;
                if(pointers.Count>1) { float next=Pinch(); Zoom((pinchDistance-next)*.03f); pinchDistance=next; dragged=true; }
                else { Vector2 pos=e.position; if(Vector2.Distance(pos,pressPosition)>7) dragged=true; if(dragged) Rotate((pos.x-previous.x)*.35f); }
            });
            element.RegisterCallback<PointerUpEvent>(e=> {
                if(!pointers.ContainsKey(e.pointerId)) return;
                bool pick=!dragged&&pointers.Count==1;
                pointers.Remove(e.pointerId); element.ReleasePointer(e.pointerId);
                if(pick) Pick(e.position); if(pointers.Count>0) dragged=true;
            });
            element.RegisterCallback<PointerCancelEvent>(e=> { pointers.Remove(e.pointerId); element.ReleasePointer(e.pointerId); dragged=true; });
            element.RegisterCallback<PointerCaptureOutEvent>(e=> { pointers.Remove(e.pointerId); });
            element.RegisterCallback<WheelEvent>(e=> { Zoom(e.delta.y*.4f); e.StopPropagation(); });
            element.RegisterCallback<GeometryChangedEvent>(_=>UpdateViewport());
        }
        float Pinch()
        { var values=new List<Vector2>(pointers.Values); return values.Count>1?Vector2.Distance(values[0],values[1]):0; }
        void UpdateViewport()
        {
            if(viewport?.panel==null||ViewCamera==null) return;
            var root=viewport.panel.visualTree; var rect=viewport.worldBound;
            float w=root.resolvedStyle.width,h=root.resolvedStyle.height;
            if(w>0&&h>0&&rect.width>0&&rect.height>0)
                {
                int pixelWidth=Mathf.Clamp(Mathf.RoundToInt(rect.width/w*Screen.width),64,1536);
                int pixelHeight=Mathf.Clamp(Mathf.RoundToInt(rect.height/h*Screen.height),64,1536);
                if(previewTexture==null || previewTexture.width!=pixelWidth || previewTexture.height!=pixelHeight)
                {
                    if(previewTexture!=null) { ViewCamera.targetTexture=null; previewTexture.Release(); Destroy(previewTexture); }
                    previewTexture=new RenderTexture(pixelWidth,pixelHeight,24) {name="Harbour viewport"};
                    previewTexture.Create(); ViewCamera.targetTexture=previewTexture;
                }
                ViewCamera.aspect=(float)pixelWidth/pixelHeight;
                viewport.style.backgroundImage=new StyleBackground(Background.FromRenderTexture(previewTexture));
            }
        }
        void Pick(Vector2 position)
        {
            var rect=viewport.worldBound;
            if(!rect.Contains(position)) return;
            var ray=ViewCamera.ViewportPointToRay(new Vector3((position.x-rect.x)/rect.width,1-(position.y-rect.y)/rect.height,0));
            if(Physics.Raycast(ray,out var hit,150))
            { var target=hit.collider.GetComponentInParent<MountTarget>(); if(target!=null) Selected?.Invoke(target.MountId); }
        }
        void Update()
        {
            for(int i=0;i<waves.Count;i++) { var p=waves[i].localPosition; p.y=-.95f+Mathf.Sin(Time.time*1.5f+i)*.035f; waves[i].localPosition=p; }
            if(ship!=null) { ship.localPosition=Vector3.up*(Mathf.Sin(Time.time)*.08f); ship.localRotation=Quaternion.Euler(0,0,Mathf.Sin(Time.time*.7f)*.7f); }
            UpdateViewport();
        }
        void OnDestroy()
        { if(previewTexture!=null) { previewTexture.Release(); Destroy(previewTexture); } foreach(var material in materials) if(material!=null) Destroy(material); }
    }
}
