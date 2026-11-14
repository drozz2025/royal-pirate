using System;
using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime
{
    public sealed class CannonWeapon : MonoBehaviour, IWeapon
    {
        ShipView owner;
        ModuleView module;
        Action finished;
        Material projectileMaterial;
        bool inFlight;
        public bool CanFire => owner != null && !owner.IsSunk && module != null && !module.State.IsDestroyed && !inFlight;
        public void Initialize(ShipView ship, ModuleView cannon, Material material, Action onFinished)
        { owner = ship; module = cannon; projectileMaterial = material; finished = onFinished; }
        public bool TryFire(ShotRequest request)
        {
            if (!CanFire || request.Damage <= 0) return false;
            inFlight = true;
            var ball = GameObject.CreatePrimitive(PrimitiveType.Sphere); ball.name = "Cannonball";
            ball.transform.localScale = Vector3.one * ProjectileView.Radius * 2;
            ball.GetComponent<Collider>().enabled = false;
            ball.GetComponent<Renderer>().sharedMaterial = projectileMaterial;
            ball.AddComponent<ProjectileView>().Initialize(request, owner, () => { inFlight = false; finished?.Invoke(); });
            return true;
        }
    }
}
