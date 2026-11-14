using System;

namespace RoyalPirate.Domain
{
    public enum BattlePhase { Aiming, Resolving, Finished }
    public sealed class TurnState
    {
        public int ActivePlayer { get; private set; }
        public BattlePhase Phase { get; private set; } = BattlePhase.Aiming;
        public float Remaining { get; private set; } = 20;
        public int TurnNumber { get; private set; } = 1;
        public bool TryFire(int player)
        {
            if (player != ActivePlayer || Phase != BattlePhase.Aiming) return false;
            Phase = BattlePhase.Resolving; Remaining = 8; return true;
        }
        public void ResolveShot(int expectedTurnNumber)
        {
            if (Phase == BattlePhase.Resolving && TurnNumber == expectedTurnNumber) Next();
        }
        public void Tick(float dt)
        {
            Guard.Finite(dt, nameof(dt));
            if (dt < 0) throw new ArgumentOutOfRangeException(nameof(dt));
            if (Phase == BattlePhase.Finished) return;
            Remaining = Math.Max(0, Remaining - dt);
            if (Remaining == 0) Next();
        }
        void Next() { ActivePlayer = 1-ActivePlayer; Phase = BattlePhase.Aiming; Remaining = 20; TurnNumber++; }
        public void Finish() { Phase = BattlePhase.Finished; Remaining = 0; }
    }
}
