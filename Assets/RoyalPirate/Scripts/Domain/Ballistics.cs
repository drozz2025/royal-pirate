using System;

namespace RoyalPirate.Domain
{
    [Serializable]
    public struct Vec3
    {
        public float x, y, z;
        public Vec3(float x, float y, float z)
        {
            Guard.Finite(x, nameof(x)); Guard.Finite(y, nameof(y)); Guard.Finite(z, nameof(z));
            this.x = x; this.y = y; this.z = z;
        }
        public static Vec3 operator +(Vec3 a, Vec3 b) => new Vec3(a.x+b.x, a.y+b.y, a.z+b.z);
        public static Vec3 operator *(Vec3 a, float scale) => new Vec3(a.x*scale, a.y*scale, a.z*scale);
    }

    public static class Ballistics
    {
        public const float Gravity = 9.81f;
        // SI units: metres, seconds, velocity m/s, effective wind acceleration m/s².
        // Exact constant-acceleration integration; collision queries remain in the Unity adapter.
        public static void Step(ref Vec3 position, ref Vec3 velocity, Vec3 windAcceleration, float dt)
        {
            Guard.Finite(dt, nameof(dt));
            if (dt <= 0 || dt > 0.1f) throw new ArgumentOutOfRangeException(nameof(dt));
            var a = windAcceleration + new Vec3(0, -Gravity, 0);
            position = position + velocity * dt + a * (0.5f * dt * dt);
            velocity = velocity + a * dt;
        }

        public static Vec3 LaunchVelocity(float yawDegrees, float elevationDegrees, float power)
        {
            Guard.Finite(yawDegrees, nameof(yawDegrees));
            Guard.Finite(elevationDegrees, nameof(elevationDegrees));
            Guard.Finite(power, nameof(power));
            if (power < 0 || power > 1 || elevationDegrees < 5 || elevationDegrees > 70)
                throw new ArgumentOutOfRangeException(nameof(power));
            double yaw = yawDegrees * Math.PI / 180, pitch = elevationDegrees * Math.PI / 180;
            float speed = 10 + 25 * power;
            return new Vec3((float)(Math.Sin(yaw)*Math.Cos(pitch)*speed),
                (float)(Math.Sin(pitch)*speed), (float)(Math.Cos(yaw)*Math.Cos(pitch)*speed));
        }
    }
}
