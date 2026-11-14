using System;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using RoyalPirate.Runtime.Combat;
using UnityEngine;
namespace RoyalPirate.UI
{
    public sealed class CombatHudAdapter : IBattleHudSource, IDisposable
    {
        readonly BattleBootstrap battle;
        bool disposed;
        public event Action Changed;
        public CombatHudAdapter(BattleBootstrap battle)
        { this.battle=battle; battle.HudChanged+=Read; }
        public BattleHudState Current => Map(battle.Snapshot,battle.aimSettings);
        public static BattleHudState Map(CombatHudState s,AimSettings limits)
        {
            float wind=Mathf.Sqrt(s.Wind.x*s.Wind.x+s.Wind.z*s.Wind.z);
            return new BattleHudState(s.PlayerHealth,s.EnemyHealth,s.Remaining,wind,
                Mathf.InverseLerp(limits.minPower,limits.maxPower,s.Power),s.TurnNumber,s.CanFire,
                s.Outcome!=BattleOutcome.Undecided,s.Outcome==BattleOutcome.PlayerVictory,s.CanUseAbility,
                "Training battle · no rewards granted",s.Outcome==BattleOutcome.Draw,
                $"Wind X {s.Wind.x:+0.00;-0.00;0} / Z {s.Wind.z:+0.00;-0.00;0} m/s²",
                s.ActivePlayer==0?"Your turn":"Opponent turn",s.AbilityArmed);
        }
        void Read(CombatHudState value) => Changed?.Invoke();
        public void RequestFire() { if(!disposed) battle.TryPlayerFire(); }
        public void SetPower(float normalized) { if(!disposed) battle.SetPower(normalized); }
        public void RequestAbility() { if(!disposed) battle.TryAbility(); }
        public void Dispose() { if(disposed)return; disposed=true; battle.HudChanged-=Read; Changed=null; }
    }
}
