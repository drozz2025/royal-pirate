using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Runtime.Combat
{
    public struct CombatHudState
    {
        public string PlayerName, EnemyName, HeroName;
        public float PlayerHealth, EnemyHealth, Remaining, Power, Yaw, Elevation;
        public Vec3 Wind;
        public BattlePhase Phase;
        public BattleOutcome Outcome;
        public int ActivePlayer, TurnNumber;
        public bool CanFire, CanUseAbility, AbilityArmed;
    }
    public struct CombatControlRects
    {
        // Screen pixels, origin bottom-left (Input System coordinates).
        public Rect Aim, Power, Fire, Ability;
        public static CombatControlRects ForSafeArea(Rect safe)
        {
            float scale=Mathf.Min(safe.width/420f,safe.height/800f);
            float pad=16*scale, bottom=safe.yMin;
            return new CombatControlRects {
                Aim=new Rect(safe.xMin,bottom+225*scale,safe.width,Mathf.Max(0,safe.height-405*scale)),
                Power=new Rect(safe.xMin+pad,bottom+145*scale,safe.width-2*pad,50*scale),
                Fire=new Rect(safe.xMin+pad,bottom+24*scale,safe.width*.57f-pad,90*scale),
                Ability=new Rect(safe.xMin+safe.width*.59f,bottom+24*scale,safe.width*.41f-pad,90*scale)
            };
        }
    }
    // Single diagnostic presentation replaces Work 1 OnGUI. Work 4 can replace this subscriber.
    public sealed class CombatHud : MonoBehaviour
    {
        BattleBootstrap battle;
        CombatHudState state;
        GUIStyle label,button;
        static readonly string[] WindArrows={"↑","↗","→","↘","↓","↙","←","↖"};
        public void Initialize(BattleBootstrap source) { battle=source; battle.HudChanged+=Read; state=battle.Snapshot; }
        void Read(CombatHudState value) => state=value;
        static Rect GuiRect(Rect r) => new Rect(r.x,Screen.height-r.yMax,r.width,r.height);
        static void Bar(Rect rect,float fraction,Color color)
        {
            GUI.color=new Color(.08f,.1f,.15f,.95f); GUI.DrawTexture(rect,Texture2D.whiteTexture);
            rect.width*=Mathf.Clamp01(fraction); GUI.color=color; GUI.DrawTexture(rect,Texture2D.whiteTexture); GUI.color=Color.white;
        }
        void OnGUI()
        {
            if(battle==null || !battle.Ready) return;
            Rect safe=Screen.safeArea; float scale=Mathf.Min(safe.width/420f,safe.height/800f);
            if(label==null) { label=new GUIStyle(GUI.skin.label); button=new GUIStyle(GUI.skin.box) { alignment=TextAnchor.MiddleCenter,wordWrap=true }; }
            label.fontSize=Mathf.RoundToInt(18*scale); button.fontSize=Mathf.RoundToInt(21*scale);
            float x=safe.xMin+16*scale, top=Screen.height-safe.yMax+8*scale, w=safe.width-32*scale;
            GUI.Box(new Rect(safe.xMin,top-8*scale,safe.width,172*scale),GUIContent.none);
            GUI.Label(new Rect(x,top,w,26*scale),$"{state.EnemyName}  {state.EnemyHealth:P0}",label);
            Bar(new Rect(x,top+28*scale,w,12*scale),state.EnemyHealth,new Color(.9f,.16f,.18f));
            GUI.Label(new Rect(x,top+42*scale,w,26*scale),$"{state.PlayerName}  {state.PlayerHealth:P0}",label);
            Bar(new Rect(x,top+70*scale,w,12*scale),state.PlayerHealth,new Color(.15f,.5f,1));
            string status=state.Outcome!=BattleOutcome.Undecided?state.Outcome.ToString():
                (state.ActivePlayer==0?"Your turn":"Bot turn")+ $"  {state.Remaining:0.0}s  {state.Phase}";
            GUI.Label(new Rect(x,top+86*scale,w,26*scale),status,label);
            GUI.Label(new Rect(x,top+112*scale,w,26*scale),$"Wind {WindArrows[(Mathf.RoundToInt(Mathf.Atan2(state.Wind.x,state.Wind.z)*4/Mathf.PI)+8)%8]} · X {state.Wind.x:+0.00;-0.00;0} / Z {state.Wind.z:+0.00;-0.00;0} m/s²",label);
            float magnitude=Mathf.Sqrt(state.Wind.x*state.Wind.x+state.Wind.z*state.Wind.z);
            GUI.Label(new Rect(x,top+136*scale,w,26*scale),$"{magnitude:0.00} m/s²  ·  X right / Z toward enemy",label);
            var rects=CombatControlRects.ForSafeArea(safe);
            var powerRect=GuiRect(rects.Power);
            GUI.Box(powerRect,GUIContent.none); Bar(new Rect(powerRect.x+8*scale,powerRect.y+32*scale,powerRect.width-16*scale,10*scale),state.Power,new Color(.95f,.7f,.15f));
            GUI.Label(new Rect(powerRect.x+8*scale,powerRect.y,powerRect.width,28*scale),$"Power {state.Power:P0}  ·  {state.Yaw:0}° / {state.Elevation:0}°",label);
            GUI.color=state.CanFire?Color.white:Color.gray; GUI.Box(GuiRect(rects.Fire),"FIRE",button);
            GUI.color=state.CanUseAbility?Color.white:Color.gray;
            GUI.Box(GuiRect(rects.Ability),state.AbilityArmed?"BOOST ARMED":"BOOST +50%",button); GUI.color=Color.white;
            GUI.Label(new Rect(x,Screen.height-safe.yMin-22*scale,w,22*scale),state.HeroName+" · drag the sea to aim",label);
            // Reticle is an aiming marker, not a promise of a hit.
            GUI.Label(new Rect(Screen.width*.5f-8*scale,Screen.height*.45f-16*scale,32*scale,32*scale),"+",button);
        }
        void OnDestroy() { if(battle!=null) battle.HudChanged-=Read; }
    }
}
