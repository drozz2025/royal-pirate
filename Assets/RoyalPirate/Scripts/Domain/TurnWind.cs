using System;

namespace RoyalPirate.Domain
{
    public sealed class TurnWind
    {
        public uint Seed { get; }
        public float MaximumAcceleration { get; }
        public TurnWind(uint seed, float maximumAcceleration = 1.2f)
        {
            Guard.Finite(maximumAcceleration, nameof(maximumAcceleration));
            if (maximumAcceleration < 0 || maximumAcceleration > 8) throw new ArgumentOutOfRangeException(nameof(maximumAcceleration));
            Seed = seed; MaximumAcceleration = maximumAcceleration;
        }
        // Stateless hash: repeatable by seed and turn, independent of frame rate or other random consumers.
        public Vec3 ForTurn(int turn)
        {
            if (turn < 1) throw new ArgumentOutOfRangeException(nameof(turn));
            double direction = Unit(Seed ^ unchecked((uint)turn * 747796405u)) * Math.PI * 2;
            float magnitude = Unit(Seed ^ unchecked((uint)turn * 2891336453u)) * MaximumAcceleration;
            return new Vec3((float)Math.Sin(direction) * magnitude, 0, (float)Math.Cos(direction) * magnitude);
        }
        public static float Unit(uint value)
        {
            unchecked { value ^= value >> 16; value *= 0x7feb352du; value ^= value >> 15; value *= 0x846ca68bu; value ^= value >> 16; }
            return (value & 0xffffffu) / 16777216f;
        }
    }
}
