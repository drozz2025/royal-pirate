using System;
using RoyalPirate.Domain;

namespace RoyalPirate.Tests
{
    // Identical production-source tests run in the .NET harness and Unity EditMode.
    public static class CombatContractChecks
    {
        public static readonly string[] Names={
            "parabola", "power-range", "lateral-wind", "longitudinal-wind", "repeat-shot", "step-partition",
            "wind-repeat", "wind-varies", "wind-bound", "zero-wind", "extreme-physics", "invalid-wind", "invalid-shot",
            "aim-limits", "power-limits", "invalid-aim", "damage", "destroy-once", "turn-alternation", "timer-config",
            "invalid-fire", "resolution-timeout", "late-resolution", "victory", "defeat", "draw", "disarmed",
            "ability-target", "ability-cooldown", "ability-expiry", "hero-destroyed", "bot-repeat", "bot-bounds" };
        static void Assert(bool condition,string message) { if(!condition) throw new Exception(message); }
        static bool Near(float a,float b,float tolerance=.001f) => Math.Abs(a-b)<tolerance;
        static void Reject(Action action)
        { try { action(); } catch(ArgumentException) { return; } throw new Exception("Expected invalid input rejection"); }
        static Vec3 Simulate(Vec3 origin,Vec3 velocity,Vec3 wind,int count=100,float dt=.02f)
        { for(int i=0;i<count;i++) Ballistics.Step(ref origin,ref velocity,wind,dt); return origin; }
        static float Range(float power)
        {
            var p=new Vec3(0,0,0); var v=Ballistics.LaunchVelocity(0,35,power);
            while(p.y>=0) Ballistics.Step(ref p,ref v,new Vec3(),.01f);
            return p.z;
        }
        public static void Run(string name)
        {
            switch(name)
            {
                case "parabola":
                    var p=Simulate(new Vec3(0,10,0),new Vec3(0,10,20),new Vec3(),50);
                    Assert(Near(p.y,15.095f)&&Near(p.z,20),name); break;
                case "power-range": Assert(Range(1)>Range(.5f)&&Range(.5f)>Range(0)&&Range(1)>100,name); break;
                case "lateral-wind": Assert(Near(Simulate(new Vec3(),new Vec3(),new Vec3(2,0,0)).x,4),name); break;
                case "longitudinal-wind":
                    Assert(Near(Simulate(new Vec3(),new Vec3(0,0,10),new Vec3(0,0,-2)).z,16),name); break;
                case "repeat-shot":
                    var launch=Ballistics.LaunchVelocity(12,34,.6f);
                    var a=Simulate(new Vec3(0,3,0),launch,new Vec3(.8f,0,-.4f));
                    var b=Simulate(new Vec3(0,3,0),launch,new Vec3(.8f,0,-.4f));
                    Assert(a.x==b.x&&a.y==b.y&&a.z==b.z,name); break;
                case "step-partition":
                    a=Simulate(new Vec3(),new Vec3(3,12,20),new Vec3(.5f,0,-1),100,.02f);
                    b=Simulate(new Vec3(),new Vec3(3,12,20),new Vec3(.5f,0,-1),200,.01f);
                    Assert(Near(a.x,b.x)&&Near(a.y,b.y)&&Near(a.z,b.z),name); break;
                case "wind-repeat":
                    a=new TurnWind(73).ForTurn(9); b=new TurnWind(73).ForTurn(9); Assert(a.x==b.x&&a.z==b.z,name); break;
                case "wind-varies":
                    var wind=new TurnWind(73); a=wind.ForTurn(1); b=wind.ForTurn(2); Assert(a.x!=b.x||a.z!=b.z,name); break;
                case "wind-bound":
                    wind=new TurnWind(73,8);
                    for(int i=1;i<=5000;i++) { a=wind.ForTurn(i); Assert(a.y==0&&a.x*a.x+a.z*a.z<=64.001f,name); } break;
                case "zero-wind": a=new TurnWind(1,0).ForTurn(1); Assert(a.x==0&&a.z==0,name); break;
                case "extreme-physics":
                    foreach(float power in new[]{0f,1f}) foreach(float elevation in new[]{5f,70f}) foreach(float gust in new[]{-8f,8f})
                    { a=Simulate(new Vec3(),Ballistics.LaunchVelocity(40,elevation,power),new Vec3(gust,0,gust),700,.01f); Assert(!float.IsNaN(a.x)&&!float.IsInfinity(a.z),name); } break;
                case "invalid-wind": Reject(()=>new TurnWind(1,float.NaN)); Reject(()=>new TurnWind(1,-1)); Reject(()=>new TurnWind(1,9)); break;
                case "invalid-shot":
                    var shot=new ShotRequest {Origin=new Vec3(),Velocity=new Vec3(0,10,20),Damage=80}; Assert(ShotValidation.IsValid(shot),name);
                    shot.Velocity.x=float.NaN; Assert(!ShotValidation.IsValid(shot),name); shot.Velocity=new Vec3(); shot.Damage=0; Assert(!ShotValidation.IsValid(shot),name); break;
                case "aim-limits":
                    var settings=new AimSettings(); float yaw=0,pitch=15; settings.Drag(ref yaw,ref pitch,10,10); Assert(yaw==40&&pitch==70,name);
                    settings.Drag(ref yaw,ref pitch,-10,-10); Assert(yaw== -40&&pitch==5,name); break;
                case "power-limits": settings=new AimSettings {minPower=.2f,maxPower=.7f}; settings.Validate(); Assert(settings.ClampPower(-4)==.2f&&settings.ClampPower(4)==.7f,name); break;
                case "invalid-aim": Reject(()=>new AimSettings {minElevation=1}.Validate()); Reject(()=>new AimSettings {minPower=.8f,maxPower=.2f}.Validate()); break;
                case "damage":
                    var hp=new ModuleState("cannon",120); Assert(hp.ApplyDamage(80)==80&&hp.Health==40,name); Assert(hp.ApplyDamage(80)==40&&hp.IsDestroyed,name); break;
                case "destroy-once":
                    hp=new ModuleState("mast",120); int events=0; hp.Destroyed+=_=>events++; hp.ApplyDamage(120); hp.ApplyDamage(1); Assert(events==1,name); break;
                case "turn-alternation":
                    var session=new CombatSession(); Assert(session.TryFire(0,true),name); session.Resolve(1); Assert(session.Turns.ActivePlayer==1&&session.Turns.TurnNumber==2,name); break;
                case "timer-config": session=new CombatSession(3); session.Tick(2); Assert(Near(session.RemainingSeconds,1),name); session.Tick(1.001f); Assert(session.Turns.ActivePlayer==1,name); break;
                case "invalid-fire":
                    session=new CombatSession(); Assert(!session.TryFire(1,true)&&!session.TryFire(0,false)&&session.TryFire(0,true)&&!session.TryFire(0,true),name); break;
                case "resolution-timeout": session=new CombatSession(2); session.TryFire(0,true); session.Tick(7); Assert(session.Turns.Phase==BattlePhase.Resolving,name); session.Tick(1); Assert(session.Turns.ActivePlayer==1,name); break;
                case "late-resolution": session=new CombatSession(); session.TryFire(0,true); session.Tick(8); session.TryFire(1,true); session.Resolve(1); Assert(session.Turns.ActivePlayer==1&&session.Turns.Phase==BattlePhase.Resolving,name); break;
                case "victory": session=new CombatSession(); session.Evaluate(false,true,true,true); Assert(session.Outcome==BattleOutcome.PlayerVictory&&!session.TryFire(0,true),name); break;
                case "defeat": session=new CombatSession(); session.Evaluate(true,false,true,true); session.Tick(100); Assert(session.Outcome==BattleOutcome.PlayerDefeat&&session.Turns.Phase==BattlePhase.Finished,name); break;
                case "draw": session=new CombatSession(); session.Evaluate(true,true,false,false); Assert(session.Outcome==BattleOutcome.Draw,name); break;
                case "disarmed":
                    session=new CombatSession(); session.Evaluate(false,false,true,false); Assert(session.Outcome==BattleOutcome.PlayerVictory,name);
                    session=new CombatSession(); session.Evaluate(false,false,false,false); Assert(session.Outcome==BattleOutcome.Draw,name); break;
                case "ability-target":
                    var ability=new ReinforcedShot("gun",()=>true); Assert(!ability.TryActivate("other",1)&&ability.TryActivate("gun",1)&&ability.DamageFor(80,1)==120,name); break;
                case "ability-cooldown": ability=new ReinforcedShot("gun",()=>true); ability.TryActivate("gun",1); Assert(!ability.CanActivate(1)&&!ability.CanActivate(5)&&ability.CanActivate(7),name); break;
                case "ability-expiry": ability=new ReinforcedShot("gun",()=>true); ability.TryActivate("gun",1); Assert(ability.DamageFor(80,3)==80,name); break;
                case "hero-destroyed": bool alive=true; ability=new ReinforcedShot("gun",()=>alive); ability.TryActivate("gun",1); alive=false; Assert(ability.DamageFor(80,1)==80&&!ability.CanActivate(7),name); break;
                case "bot-repeat":
                    var first=BotAimSolver.Choose(new Vec3(0,2,26),new Vec3(0,.2f,0),new Vec3(.4f,0,-.6f),180,new AimSettings(),6);
                    var second=BotAimSolver.Choose(new Vec3(0,2,26),new Vec3(0,.2f,0),new Vec3(.4f,0,-.6f),180,new AimSettings(),6);
                    Assert(first.Yaw==second.Yaw&&first.Power==second.Power&&first.Elevation==second.Elevation,name); break;
                case "bot-bounds":
                    for(uint i=0;i<500;i++) { var aim=BotAimSolver.Choose(new Vec3(0,2,26),new Vec3(0,.2f,0),new TurnWind(i,8).ForTurn(1),180,new AimSettings(),i); Assert(aim.Power>=0&&aim.Power<=1&&aim.Elevation>=5&&aim.Elevation<=70&&Math.Abs(aim.Yaw-180)<=40,name); } break;
                default: throw new ArgumentException(name);
            }
        }
    }
}
