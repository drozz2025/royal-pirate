using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime.Combat
{
    // Cosmetic physics only, at most one body per destroyed module. Never feeds back into health.
    public sealed class ModuleDestruction : MonoBehaviour
    {
        ModuleView module;
        Transform visual;
        Rigidbody body;
        float age;
        bool broken;
        Vector3 impulse=Vector3.right*1.5f+Vector3.up*2;
        Vector3 impactPoint;
        bool hasImpact;
        public bool PhysicalDebris { get; set; } = true;
        public void Initialize(ModuleView view,Transform mesh)
        {
            module=view; visual=mesh;
            if(module.Kind != ModuleKind.Hull)
            {
                body=visual.gameObject.AddComponent<Rigidbody>(); body.isKinematic=true; body.useGravity=false;
                // Disabled colliders: cosmetic pieces cannot block shots, hit ships, or create physics stacks.
            }
        }
        public void RecordImpact(Vector3 point,Vector3 incomingVelocity)
        { impactPoint=point; impulse=incomingVelocity.normalized*2+Vector3.up*2; hasImpact=true; }
        public void Break()
        {
            if(broken) return; broken=true;
            // Leave hull visible for progressive sinking; disappearance would hide the defeat animation.
            if(module.Kind==ModuleKind.Hull) return;
            if(!PhysicalDebris || body==null) { visual.gameObject.SetActive(false); return; }
            body.isKinematic=false; body.useGravity=true;
            if(hasImpact) body.AddForceAtPosition(impulse,impactPoint,ForceMode.VelocityChange);
            else body.AddForce(impulse,ForceMode.VelocityChange);
            body.AddTorque(transform.forward*2+transform.right,ForceMode.VelocityChange);
        }
        void Update()
        {
            if(!broken || module.Kind==ModuleKind.Hull || !visual.gameObject.activeSelf) return;
            age+=Time.deltaTime;
            if(age>3 || visual.position.y< -2)
            { if(body!=null) { body.isKinematic=true; body.useGravity=false; } visual.gameObject.SetActive(false); }
        }
    }
}
