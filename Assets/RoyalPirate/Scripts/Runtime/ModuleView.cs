using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    public sealed class ModuleView : MonoBehaviour
    {
        public ModuleState State { get; private set; }
        public ShipView Ship { get; private set; }
        public ModuleKind Kind { get; private set; }
        public Vector3 Dimensions { get; private set; }
        public int WeaponDamage { get; private set; }
        public Transform Visual { get; private set; }
        Collider[] colliders;
        Renderer[] renderers;
        Combat.ModuleDestruction destruction;
        public void Initialize(ShipView ship, ModuleInstallation entry, ModuleDefinition definition)
        {
            Ship=ship; Kind=definition.kind; Dimensions=ShipView.ToUnity(definition.size); WeaponDamage=definition.damage;
            State=new ModuleState(entry.instanceId,definition.HealthAt(entry.level)); State.Destroyed+=OnDestroyed;
            colliders=GetComponentsInChildren<Collider>(); renderers=GetComponentsInChildren<Renderer>();
        }
        public void BindVisual(Transform visual, Combat.ModuleDestruction effect) { Visual=visual; destruction=effect; }
        public int ApplyImpact(int damage, Vector3 point, Vector3 incomingVelocity)
        {
            if(destruction!=null) destruction.RecordImpact(point,incomingVelocity);
            int applied=State.ApplyDamage(damage);
            if(applied>0) Ship?.NotifyDamage(this,applied,point);
            return applied;
        }
        void OnDestroyed(ModuleState state)
        {
            // Gameplay state and module roots survive visual destruction. Colliders never stay hittable.
            foreach(var c in colliders) if(c != null) c.enabled=false;
            if(destruction != null) destruction.Break();
            else foreach(var r in renderers) if(r != null) r.enabled=false;
        }
        void OnDestroy() { if(State != null) State.Destroyed-=OnDestroyed; }
    }
}
