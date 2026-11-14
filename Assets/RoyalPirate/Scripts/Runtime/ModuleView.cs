using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    public sealed class ModuleView : MonoBehaviour
    {
        public ModuleState State { get; private set; }
        public ShipView Ship { get; private set; }
        public ModuleKind Kind { get; private set; }
        public void Initialize(ShipView ship, ModuleInstallation entry, ModuleDefinition definition)
        {
            Ship = ship; Kind = definition.kind;
            State = new ModuleState(entry.instanceId, definition.HealthAt(entry.level));
            State.Destroyed += OnDestroyed;
        }
        void OnDestroyed(ModuleState state)
        {
            // Keep the root/state alive so aggregate health and defeat remain queryable.
            foreach (var c in GetComponentsInChildren<Collider>()) c.enabled = false;
            foreach (var r in GetComponentsInChildren<Renderer>()) r.enabled = false;
        }
        void OnDestroy() { if (State != null) State.Destroyed -= OnDestroyed; }
    }
}
