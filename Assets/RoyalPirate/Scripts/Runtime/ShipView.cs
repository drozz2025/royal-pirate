using System;
using System.Collections.Generic;
using RoyalPirate.Domain;
using RoyalPirate.Runtime.Combat;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    public sealed class ShipView : MonoBehaviour, IShip
    {
        readonly List<ModuleView> modules=new List<ModuleView>();
        public IReadOnlyList<ModuleView> Modules => modules;
        public string ShipId { get; private set; }
        public event Action<ModuleView,int,Vector3> Damaged;
        public bool IsSunk
        { get { foreach(var m in modules) if(m.Kind==ModuleKind.Hull) return m.State.IsDestroyed; return false; } }
        public bool HasCannon
        { get { foreach(var m in modules) if(m.Kind==ModuleKind.Cannon && !m.State.IsDestroyed) return true; return false; } }
        public float HealthFraction
        {
            get
            {
                long current=0,maximum=0;
                foreach(var m in modules) { current+=m.State.Health; maximum+=m.State.MaxHealth; }
                return maximum==0?0:(float)current/maximum;
            }
        }
        public void NotifyDamage(ModuleView module,int damage,Vector3 point) => Damaged?.Invoke(module,damage,point);
        public void Assemble(ShipCatalog catalog, ShipLoadout loadout, Material wood, Material sail, Material metal)
        {
            if(modules.Count!=0) throw new InvalidOperationException("Already assembled.");
            loadout.Validate(catalog); ShipId=loadout.shipId;
            foreach(var entry in loadout.modules)
            {
                var definition=catalog.Module(entry.definitionId); var mount=catalog.Mount(entry.mountId);
                var root=new GameObject(mount.id); root.transform.SetParent(transform,false); root.transform.localPosition=ToUnity(mount.position);
                // Keep root/socket scale at one. Size is on the visual and BoxCollider, not the aiming pivot.
                var visual=GameObject.CreatePrimitive(PrimitiveType.Cube); visual.name="GreyboxVisual"; visual.transform.SetParent(root.transform,false);
                visual.transform.localScale=ToUnity(definition.size); visual.GetComponent<Collider>().enabled=false;
                visual.GetComponent<Renderer>().sharedMaterial=definition.kind==ModuleKind.Sail?sail:
                    definition.kind==ModuleKind.Cannon || definition.kind==ModuleKind.Armor?metal:wood;
                root.AddComponent<BoxCollider>().size=ToUnity(definition.size);
                var view=root.AddComponent<ModuleView>(); view.Initialize(this,entry,definition); modules.Add(view);
                var destruction=root.AddComponent<ModuleDestruction>(); destruction.Initialize(view,visual.transform);
                view.BindVisual(visual.transform,destruction);
            }
        }
        public ModuleView First(ModuleKind kind)
        { foreach(var m in modules) if(m.Kind==kind && !m.State.IsDestroyed) return m; return null; }
        void Update()
        {
            if(IsSunk && transform.position.y> -12)
            { transform.position+=Vector3.down*Time.deltaTime; transform.Rotate(Vector3.forward,8*Time.deltaTime,Space.Self); }
        }
        public static Vector3 ToUnity(Vec3 v) => new Vector3(v.x,v.y,v.z);
        public static Vec3 ToDomain(Vector3 v) => new Vec3(v.x,v.y,v.z);
    }
}
