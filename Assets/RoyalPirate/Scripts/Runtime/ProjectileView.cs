using System;
using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    public enum ImpactKind { Module, Obstacle, Water, Expired }
    public struct ProjectileImpact
    {
        public ImpactKind Kind;
        public Vector3 Point;
        public ModuleView Module;
        public int AppliedDamage;
    }

    public sealed class ProjectileView : MonoBehaviour
    {
        public const float Radius = 0.18f, Lifetime = 7f, SimulationStep = .01f, WaterHeight = -1f;
        readonly Collider[] overlaps = new Collider[64];
        readonly RaycastHit[] hits = new RaycastHit[64];
        Vec3 position, velocity, wind;
        ShipView owner;
        int damage;
        float age;
        bool completed = true, pooled;
        Action finished;
        public bool InFlight => !completed;
        public bool Suspended { get; set; }
        public int OverflowQueries { get; private set; }
        public event Action<ProjectileImpact> Impacted;

        public void SetPooled(bool value) => pooled = value;
        public void Initialize(ShotRequest shot, ShipView source, Action onFinished)
        {
            if (!ShotValidation.IsValid(shot)) throw new ArgumentOutOfRangeException(nameof(shot));
            position = shot.Origin; velocity = shot.Velocity; wind = shot.WindAcceleration;
            owner = source; damage = shot.Damage; finished = onFinished; age = 0; completed = false;
            transform.position = ShipView.ToUnity(position); gameObject.SetActive(true);
        }
        void FixedUpdate()
        {
            // Sweeps approximate a curve with <=10 ms chords (gravity sag <0.13 mm per chord).
            // Same integrator as domain tests; never add a second Rigidbody integrator.
            if (Suspended) return;
            float remaining = Time.fixedDeltaTime;
            while (!completed && remaining > .000001f)
            {
                float dt = Mathf.Min(SimulationStep, Mathf.Min(remaining, Lifetime-age));
                if (dt <= 0) { Report(ImpactKind.Expired, transform.position, null); return; }
                Step(dt); remaining -= dt;
            }
        }
        bool Eligible(Collider collider, out ModuleView module)
        {
            module = collider.GetComponentInParent<ModuleView>();
            if (collider.transform.IsChildOf(transform)) return false;
            if (module != null) return module.Ship != owner && module.State != null && !module.State.IsDestroyed;
            return owner == null || !collider.transform.IsChildOf(owner.transform);
        }
        void Step(float dt)
        {
            Vector3 previous = ShipView.ToUnity(position);
            if (previous.y <= WaterHeight + Radius) { Report(ImpactKind.Water, new Vector3(previous.x,WaterHeight,previous.z),null); return; }
            int count = Physics.OverlapSphereNonAlloc(previous,Radius,overlaps,~0,QueryTriggerInteraction.Ignore);
            Collider[] candidates = overlaps;
            if (count == overlaps.Length)
            { candidates=Physics.OverlapSphere(previous,Radius,~0,QueryTriggerInteraction.Ignore); count=candidates.Length; OverflowQueries++; }
            // Overlap ties use collider IDs for stable selection within this scene/process.
            Collider chosen = null; ModuleView chosenModule = null;
            for(int i=0;i<count;i++)
                if (Eligible(candidates[i],out var module) && (chosen == null || candidates[i].GetInstanceID()<chosen.GetInstanceID()))
                { chosen=candidates[i]; chosenModule=module; }
            if (chosen != null) { Report(chosenModule != null ? ImpactKind.Module : ImpactKind.Obstacle, previous, chosenModule); return; }

            Ballistics.Step(ref position, ref velocity, wind, dt);
            Vector3 next = ShipView.ToUnity(position), delta = next-previous;
            float distance = delta.magnitude, nearest = distance+1;
            Vector3 point = next; chosen = null; chosenModule = null;
            count = distance > 0 ? Physics.SphereCastNonAlloc(previous,Radius,delta/distance,hits,distance,~0,QueryTriggerInteraction.Ignore) : 0;
            RaycastHit[] sweeps=hits;
            if (count == hits.Length)
            { sweeps=Physics.SphereCastAll(previous,Radius,delta/distance,distance,~0,QueryTriggerInteraction.Ignore); count=sweeps.Length; OverflowQueries++; }
            for(int i=0;i<count;i++)
            {
                var hit=sweeps[i];
                if (!Eligible(hit.collider,out var module)) continue;
                if (hit.distance < nearest || (Mathf.Approximately(hit.distance,nearest) && chosen != null && hit.collider.GetInstanceID()<chosen.GetInstanceID()))
                { nearest=hit.distance; point=hit.point; chosen=hit.collider; chosenModule=module; }
            }
            // Resolve the first surface, including sea, rather than damaging targets below water.
            if (next.y <= WaterHeight+Radius)
            {
                float fraction=(previous.y-WaterHeight-Radius)/(previous.y-next.y);
                if (fraction*distance <= nearest)
                {
                    point=Vector3.Lerp(previous,next,fraction); point.y=WaterHeight;
                    Report(ImpactKind.Water,point,null); return;
                }
            }
            if (chosen != null) { Report(chosenModule != null ? ImpactKind.Module : ImpactKind.Obstacle,point,chosenModule); return; }
            transform.position=next; age+=dt;
            if(age >= Lifetime-.00001f) Report(ImpactKind.Expired,next,null);
        }
        void Report(ImpactKind kind, Vector3 point, ModuleView module)
        {
            if(completed) return;
            completed=true; transform.position=point;
            int applied=module != null ? module.ApplyImpact(damage,point,ShipView.ToUnity(velocity)) : 0;
            Impacted?.Invoke(new ProjectileImpact {Kind=kind,Point=point,Module=module,AppliedDamage=applied});
            var callback=finished; finished=null;
            if(pooled) gameObject.SetActive(false); else Destroy(gameObject);
            callback?.Invoke();
        }
        public void Cancel()
        {
            completed=true; finished=null;
            if(pooled) gameObject.SetActive(false); else Destroy(gameObject);
        }
    }
}
