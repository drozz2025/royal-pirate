using System.Collections.Generic;
using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    public sealed class ShipView : MonoBehaviour, IShip
    {
        readonly List<ModuleView> modules = new List<ModuleView>();
        public IReadOnlyList<ModuleView> Modules => modules;
        public string ShipId { get; private set; }
        public bool IsSunk
        {
            get { foreach (var module in modules) if (module.Kind == ModuleKind.Hull) return module.State.IsDestroyed; return false; }
        }
        public float HealthFraction
        {
            get
            {
                long current = 0, maximum = 0;
                foreach (var module in modules) { current += module.State.Health; maximum += module.State.MaxHealth; }
                return maximum == 0 ? 0 : (float)current / maximum;
            }
        }
        public void Assemble(ShipCatalog catalog, ShipLoadout loadout, Material wood, Material sail, Material metal)
        {
            if (modules.Count != 0) throw new System.InvalidOperationException("Already assembled.");
            loadout.Validate(catalog); ShipId = loadout.shipId;
            foreach (var entry in loadout.modules)
            {
                var definition = catalog.Module(entry.definitionId);
                var mount = catalog.Mount(entry.mountId);
                // Explicit greybox geometry. Work 2 replaces visuals, preserving mounts and state.
                var part = GameObject.CreatePrimitive(PrimitiveType.Cube);
                part.name = mount.id; part.transform.SetParent(transform, false);
                part.transform.localPosition = ToUnity(mount.position);
                part.transform.localScale = ToUnity(definition.size);
                part.GetComponent<Renderer>().sharedMaterial = definition.kind == ModuleKind.Sail ? sail :
                    definition.kind == ModuleKind.Cannon || definition.kind == ModuleKind.Armor ? metal : wood;
                var view = part.AddComponent<ModuleView>(); view.Initialize(this, entry, definition); modules.Add(view);
            }
        }
        void Update()
        {
            if (IsSunk && transform.position.y > -12)
            {
                transform.position += Vector3.down * Time.deltaTime;
                transform.Rotate(Vector3.forward, 8 * Time.deltaTime, Space.Self);
            }
        }
        public static Vector3 ToUnity(Vec3 value) => new Vector3(value.x, value.y, value.z);
        public static Vec3 ToDomain(Vector3 value) => new Vec3(value.x, value.y, value.z);
    }
}
