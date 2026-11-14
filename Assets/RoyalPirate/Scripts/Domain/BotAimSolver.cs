using System;

namespace RoyalPirate.Domain
{
    public struct AimSolution
    {
        public float Yaw, Elevation, Power;
    }
    public static class BotAimSolver
    {
        // Inverse of the same constant-acceleration integrator. Search flight time, then add bounded error.
        // This chooses an intent only. ProjectileView still determines every collision and all damage.
        public static AimSolution Choose(Vec3 origin, Vec3 target, Vec3 wind, float facingYaw, AimSettings limits, uint seed)
        {
            var best = new AimSolution { Yaw = facingYaw, Elevation = 15, Power = limits.ClampPower(.25f) };
            bool found = false;
            for (int i=20;i<=240;i++)
            {
                float t=i*.025f;
                double vx=(target.x-origin.x-.5f*wind.x*t*t)/t;
                double vy=(target.y-origin.y+.5f*Ballistics.Gravity*t*t)/t;
                double vz=(target.z-origin.z-.5f*wind.z*t*t)/t;
                double horizontal=Math.Sqrt(vx*vx+vz*vz), speed=Math.Sqrt(horizontal*horizontal+vy*vy);
                float power=(float)(speed-10)/25, elevation=(float)(Math.Atan2(vy,horizontal)*180/Math.PI);
                float yaw=(float)(Math.Atan2(vx,vz)*180/Math.PI);
                float relative=Wrap(yaw-facingYaw);
                if (power<limits.minPower || power>limits.maxPower || elevation<limits.minElevation || elevation>limits.maxElevation || Math.Abs(relative)>limits.yawLimit) continue;
                best = new AimSolution { Yaw=facingYaw+relative, Elevation=elevation, Power=power }; found=true; break;
            }
            // Deliberately imperfect; no collision probing, HP targeting, or corrective homing.
            best.Yaw=facingYaw+AimSettings.Clamp(Wrap(best.Yaw-facingYaw)+(TurnWind.Unit(seed)-.5f)*6,-limits.yawLimit,limits.yawLimit);
            best.Elevation=AimSettings.Clamp(best.Elevation+(TurnWind.Unit(seed+1)-.5f)*4,limits.minElevation,limits.maxElevation);
            best.Power=limits.ClampPower(best.Power+(TurnWind.Unit(seed+2)-.5f)*.07f);
            if (!found) best.Power=limits.ClampPower(best.Power);
            return best;
        }
        static float Wrap(float angle) { while(angle>180) angle-=360; while(angle< -180) angle+=360; return angle; }
    }
}
