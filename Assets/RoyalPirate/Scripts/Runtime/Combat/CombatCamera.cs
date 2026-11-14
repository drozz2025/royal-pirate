using UnityEngine;

namespace RoyalPirate.Runtime.Combat
{
    public enum CombatCameraMode { Aiming, Flight, Impact, Victory }
    public sealed class CombatCamera : MonoBehaviour
    {
        Transform cannon, enemy, projectile;
        Vector3 impact;
        public CombatCameraMode Mode { get; private set; }
        public void Initialize(Transform playerCannon,Transform opponent)
        { cannon=playerCannon; enemy=opponent; SnapToAim(); }
        public void SetCannon(Transform activeCannon) { if(activeCannon!=null) cannon=activeCannon; }
        public void Aim() { Mode=CombatCameraMode.Aiming; projectile=null; }
        public void Follow(Transform ball) { projectile=ball; Mode=CombatCameraMode.Flight; }
        public void Impact(Vector3 point) { impact=point; Mode=CombatCameraMode.Impact; }
        public void Victory(Transform defeated) { enemy=defeated; Mode=CombatCameraMode.Victory; }
        void AimPose(out Vector3 position,out Vector3 target)
        {
            Vector3 forward=Vector3.ProjectOnPlane(cannon.forward,Vector3.up).normalized;
            position=cannon.position-forward*2.6f+Vector3.up*1.7f;
            target=enemy.position+Vector3.up*2;
        }
        void SnapToAim()
        {
            Aim(); AimPose(out var p,out var t); transform.SetPositionAndRotation(p,Quaternion.LookRotation(t-p));
        }
        void LateUpdate()
        {
            if(cannon==null || enemy==null) return;
            AimPose(out var p,out var target);
            if(Mode==CombatCameraMode.Flight && projectile!=null && projectile.gameObject.activeSelf)
            { p=Vector3.Lerp(p,projectile.position+new Vector3(1,3,-7),.65f); target=Vector3.Lerp(target,projectile.position,.6f); }
            else if(Mode==CombatCameraMode.Impact)
            { p=impact+new Vector3(5,5,-10); target=impact; }
            else if(Mode==CombatCameraMode.Victory)
            { p=enemy.position+new Vector3(7,6,-12); target=enemy.position+Vector3.up; }
            float blend=1-Mathf.Exp(-9*Time.deltaTime);
            transform.position=Vector3.Lerp(transform.position,p,blend);
            transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(target-transform.position),blend);
        }
    }
}
