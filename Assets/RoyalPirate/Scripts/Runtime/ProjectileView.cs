using System;
using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    public sealed class ProjectileView : MonoBehaviour
    {
        public const float Radius = 0.18f;
        Vec3 position, velocity, wind;
        ShipView owner;
        int damage;
        float age;
        bool completed;
        Action finished;
        public void Initialize(ShotRequest shot, ShipView source, Action onFinished)
        {
            if (shot.Damage <= 0) throw new ArgumentOutOfRangeException(nameof(shot));
            position = shot.Origin; velocity = shot.Velocity; wind = shot.WindAcceleration;
            owner = source; damage = shot.Damage; finished = onFinished;
            transform.position = ShipView.ToUnity(position);
        }
        void FixedUpdate()
        {
            if (completed) return;
            Vector3 previous = ShipView.ToUnity(position);
            Ballistics.Step(ref position, ref velocity, wind, Time.fixedDeltaTime);
            Vector3 next = ShipView.ToUnity(position), delta = next - previous;
            // Check overlaps too: a shot starting in a target must not tunnel out of it.
            foreach (var collider in Physics.OverlapSphere(previous, Radius, ~0, QueryTriggerInteraction.Ignore))
            {
                var module = collider.GetComponentInParent<ModuleView>();
                if (module != null && module.Ship != owner && !module.State.IsDestroyed) { Hit(module); return; }
            }
            RaycastHit[] hits = Physics.SphereCastAll(previous, Radius, delta.normalized,
                delta.magnitude, ~0, QueryTriggerInteraction.Ignore);
            Array.Sort(hits, (a,b) => a.distance.CompareTo(b.distance));
            foreach (var hit in hits)
            {
                var module = hit.collider.GetComponentInParent<ModuleView>();
                if (module == null || module.Ship == owner || module.State.IsDestroyed) continue;
                transform.position = hit.point; Hit(module); return;
            }
            transform.position = next; age += Time.fixedDeltaTime;
            if (age >= 7 || next.y < -1) Complete();
        }
        void Hit(ModuleView module) { module.State.ApplyDamage(damage); Complete(); }
        void Complete()
        {
            if (completed) return;
            completed = true; finished?.Invoke(); Destroy(gameObject);
        }
    }
}
