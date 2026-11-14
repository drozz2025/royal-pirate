using System;

namespace RoyalPirate.Domain
{
    public enum BattleOutcome { Undecided, PlayerVictory, PlayerDefeat, Draw }

    // Adds policies around Work 1 TurnState; existing contracts and default timing stay intact.
    public sealed class CombatSession
    {
        public TurnState Turns { get; } = new TurnState();
        public BattleOutcome Outcome { get; private set; }
        public float AimSeconds { get; }
        public float RemainingSeconds => Turns.Phase == BattlePhase.Aiming ? Turns.Remaining * AimSeconds / 20f : Turns.Remaining;
        public CombatSession(float aimSeconds = 20)
        {
            Guard.Finite(aimSeconds, nameof(aimSeconds));
            if (aimSeconds < 2 || aimSeconds > 120) throw new ArgumentOutOfRangeException(nameof(aimSeconds));
            AimSeconds = aimSeconds;
        }
        public void Tick(float seconds)
        {
            Guard.Finite(seconds, nameof(seconds));
            if (seconds < 0) throw new ArgumentOutOfRangeException(nameof(seconds));
            Turns.Tick(Turns.Phase == BattlePhase.Aiming ? seconds * 20f / AimSeconds : seconds);
        }
        public bool TryFire(int side, bool weaponReady) => weaponReady && Turns.TryFire(side);
        public void Resolve(int shotTurn) => Turns.ResolveShot(shotTurn);
        public void Evaluate(bool playerSunk, bool enemySunk, bool playerArmed, bool enemyArmed)
        {
            if (Outcome != BattleOutcome.Undecided) return;
            bool playerLost = playerSunk || !playerArmed, enemyLost = enemySunk || !enemyArmed;
            if (!playerLost && !enemyLost) return;
            Outcome = playerLost && enemyLost ? BattleOutcome.Draw : playerLost ? BattleOutcome.PlayerDefeat : BattleOutcome.PlayerVictory;
            Turns.Finish();
        }
    }

    [Serializable]
    public sealed class AimSettings
    {
        public float yawLimit = 40, minElevation = 5, maxElevation = 70;
        public float minPower = 0, maxPower = 1, sensitivity = 80;
        public void Validate()
        {
            foreach (float f in new[] { yawLimit, minElevation, maxElevation, minPower, maxPower, sensitivity }) Guard.Finite(f, "aim");
            if (yawLimit <= 0 || yawLimit > 80 || minElevation < 5 || maxElevation > 70 || minElevation > maxElevation ||
                minPower < 0 || maxPower > 1 || minPower > maxPower || sensitivity <= 0 || sensitivity > 360)
                throw new ArgumentException("Invalid aim limits.");
        }
        public void Drag(ref float yaw, ref float elevation, float normalizedX, float normalizedY)
        {
            Guard.Finite(normalizedX, nameof(normalizedX)); Guard.Finite(normalizedY, nameof(normalizedY));
            yaw = Clamp(yaw + normalizedX * sensitivity, -yawLimit, yawLimit);
            elevation = Clamp(elevation + normalizedY * sensitivity, minElevation, maxElevation);
        }
        public float ClampPower(float value) { Guard.Finite(value, nameof(value)); return Clamp(value, minPower, maxPower); }
        internal static float Clamp(float value, float min, float max) => Math.Max(min, Math.Min(max, value));
    }

    public static class ShotValidation
    {
        public static bool IsValid(ShotRequest shot)
        {
            return FiniteBounded(shot.Origin, 10000) && FiniteBounded(shot.Velocity, 500) &&
                FiniteBounded(shot.WindAcceleration, 20) && shot.WindAcceleration.y == 0 && shot.Damage > 0 && shot.Damage <= 1000000;
        }
        static bool FiniteBounded(Vec3 v, float bound) => Valid(v.x,bound) && Valid(v.y,bound) && Valid(v.z,bound);
        static bool Valid(float f,float bound) => !float.IsNaN(f) && !float.IsInfinity(f) && Math.Abs(f) <= bound;
    }
}
