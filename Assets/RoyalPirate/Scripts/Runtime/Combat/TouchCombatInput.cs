using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace RoyalPirate.Runtime.Combat
{
    public sealed class TouchCombatInput : MonoBehaviour
    {
        enum Gesture { None, Aim, Power, Fire, Ability }
        struct Contact { public int Id; public Gesture Kind; public Vector2 Previous; }
        readonly Contact[] contacts=new Contact[12];
        BattleBootstrap battle;
        int aimId=int.MinValue, powerId=int.MinValue;
        // Work 4 supplies its own UI raycast/exclusion here, without an EventSystem dependency.
        public Func<Vector2,bool> AdditionalUiBlocker { get; set; }
        // In integrated mode UI Toolkit exclusively owns fire/power/ability.
        public bool ExternalActionControls { get; set; }
        public void ClearCapture() => ResetCapture();
        public void Initialize(BattleBootstrap source) => battle=source;
        void OnEnable() => EnhancedTouchSupport.Enable();
        void OnDisable() { EnhancedTouchSupport.Disable(); ResetCapture(); }
        void OnApplicationFocus(bool focus) { if(!focus) ResetCapture(); }
        void OnApplicationPause(bool paused) { if(paused) ResetCapture(); }
        void ResetCapture() { Array.Clear(contacts,0,contacts.Length); aimId=powerId=int.MinValue; }
        void Update()
        {
            if(battle==null || !battle.CanPlayerAct) { ResetCapture(); return; }
            var rects=CombatControlRects.ForSafeArea(Screen.safeArea);
            foreach(var touch in Touch.activeTouches)
            {
                if(touch.phase==TouchPhase.Began) Begin(touch.touchId,touch.screenPosition,rects);
                else if(touch.phase==TouchPhase.Ended || touch.phase==TouchPhase.Canceled) End(touch.touchId,touch.screenPosition,rects,touch.phase==TouchPhase.Ended);
                else Move(touch.touchId,touch.screenPosition,rects);
            }
            if(Touch.activeTouches.Count!=0 || Mouse.current==null) return;
            var mouse=Mouse.current; var p=mouse.position.ReadValue();
            if(mouse.leftButton.wasPressedThisFrame) Begin(-1,p,rects);
            else if(mouse.leftButton.wasReleasedThisFrame) End(-1,p,rects,true);
            else if(mouse.leftButton.isPressed) Move(-1,p,rects);
        }
        void Begin(int id,Vector2 p,CombatControlRects r)
        {
            if(AdditionalUiBlocker!=null && AdditionalUiBlocker(p)) return;
            Gesture kind=ExternalActionControls ? (r.Aim.Contains(p)?Gesture.Aim:Gesture.None) : r.Fire.Contains(p)?Gesture.Fire:r.Ability.Contains(p)?Gesture.Ability:
                r.Power.Contains(p)?Gesture.Power:r.Aim.Contains(p)?Gesture.Aim:Gesture.None;
            if(kind==Gesture.None || kind==Gesture.Aim && aimId!=int.MinValue || kind==Gesture.Power && powerId!=int.MinValue) return;
            for(int i=0;i<contacts.Length;i++) if(contacts[i].Kind==Gesture.None)
            {
                contacts[i]=new Contact {Id=id,Kind=kind,Previous=p};
                if(kind==Gesture.Aim) aimId=id;
                if(kind==Gesture.Power) { powerId=id; SetPower(p,r); }
                return;
            }
        }
        void SetPower(Vector2 p,CombatControlRects r) => battle.SetPower(Mathf.InverseLerp(r.Power.xMin,r.Power.xMax,p.x));
        void Move(int id,Vector2 p,CombatControlRects r)
        {
            for(int i=0;i<contacts.Length;i++) if(contacts[i].Kind!=Gesture.None && contacts[i].Id==id)
            {
                var contact=contacts[i];
                if(contact.Kind==Gesture.Aim)
                {
                    // Leaving the aim region never activates a button or adjusts aim over controls.
                    if(r.Aim.Contains(p) && r.Aim.Contains(contact.Previous) && (AdditionalUiBlocker==null || !AdditionalUiBlocker(p)))
                    { var delta=p-contact.Previous; battle.DragAim(delta.x/Screen.safeArea.width,delta.y/Screen.safeArea.height); }
                }
                else if(contact.Kind==Gesture.Power) SetPower(p,r);
                contact.Previous=p; contacts[i]=contact; return;
            }
        }
        void End(int id,Vector2 p,CombatControlRects r,bool released)
        {
            for(int i=0;i<contacts.Length;i++) if(contacts[i].Kind!=Gesture.None && contacts[i].Id==id)
            {
                var kind=contacts[i].Kind; contacts[i]=default;
                if(aimId==id) aimId=int.MinValue; if(powerId==id) powerId=int.MinValue;
                if(!released || AdditionalUiBlocker!=null && AdditionalUiBlocker(p)) return;
                if(kind==Gesture.Fire && r.Fire.Contains(p)) battle.TryPlayerFire();
                else if(kind==Gesture.Ability && r.Ability.Contains(p)) battle.TryAbility();
                return;
            }
        }
    }
}
