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
        ProjectileView projectile;
        bool inFlight;
        Action completion;
        float recoil;
        public bool IsOperational => owner != null && !owner.IsSunk && module != null && !module.State.IsDestroyed;
        public bool CanFire => IsOperational && !inFlight;
        public ModuleView Module => module;
        public ProjectileView Projectile => projectile;
        public Transform Muzzle { get; private set; }
        public event Action<ProjectileImpact> Impacted;
        public void Initialize(ShipView ship, ModuleView cannon, Material material, Action onFinished)
        {
            owner=ship; module=cannon; finished=onFinished; completion=Finish;
            if(cannon == null) return;
            BindMuzzle();
            var ball=GameObject.CreatePrimitive(PrimitiveType.Sphere); ball.name="Cannonball_Pooled";
            ball.transform.SetParent(transform,false); ball.transform.localScale=Vector3.one*ProjectileView.Radius*2;
            ball.GetComponent<Collider>().enabled=false; ball.GetComponent<Renderer>().sharedMaterial=material;
            projectile=ball.AddComponent<ProjectileView>(); projectile.SetPooled(true);
            projectile.Impacted+=ForwardImpact; ball.SetActive(false);
        }
        void BindMuzzle()
        {
            // Module root is unit scale. Prefer an authored Work 2 Muzzle socket if provided.
            Muzzle=module.transform.Find("Muzzle");
            if(Muzzle!=null) return;
            Muzzle=new GameObject("Muzzle").transform; Muzzle.SetParent(module.transform,false);
            Muzzle.localPosition=new Vector3(0,0,module.Dimensions.z*.5f+.25f);
        }
        public void RefreshModule()
        {
            if(inFlight || owner==null || module!=null && !module.State.IsDestroyed) return;
            module=owner.First(ModuleKind.Cannon);
            if(module!=null) BindMuzzle(); else Muzzle=null;
        }
        void ForwardImpact(ProjectileImpact impact) => Impacted?.Invoke(impact);
        void Finish() { inFlight=false; finished?.Invoke(); }
        public void Aim(float worldYaw,float elevation)
        {
            if(module != null && !module.State.IsDestroyed) module.transform.rotation=Quaternion.Euler(-elevation,worldYaw,0);
        }
        public bool TryFire(ShotRequest request)
        {
            if(!CanFire || !ShotValidation.IsValid(request)) return false;
            inFlight=true; recoil=.16f; projectile.Initialize(request,owner,completion); return true;
        }
        void Update()
        {
            if (module==null || module.Visual==null || module.State.IsDestroyed) return;
            recoil=Mathf.Max(0,recoil-Time.deltaTime);
            module.Visual.localPosition=Vector3.back*(.25f*recoil/.16f);
        }
        public void CancelShot() { if(projectile != null) projectile.Cancel(); inFlight=false; }
    }
}
