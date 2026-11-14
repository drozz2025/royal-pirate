using System;
using System.Threading;
using System.Threading.Tasks;

namespace RoyalPirate.Domain
{
    public enum ModuleKind { Hull, Bow, Stern, Deck, Mast, Sail, Cannon, Cabin, Armor, HeroSlot }

    public interface IDamageable
    {
        string InstanceId { get; }
        int Health { get; }
        int MaxHealth { get; }
        bool IsDestroyed { get; }
        int ApplyDamage(int amount);
    }

    public interface IShip
    {
        string ShipId { get; }
        bool IsSunk { get; }
        float HealthFraction { get; }
    }

    public interface IWeapon
    {
        bool CanFire { get; }
        bool TryFire(ShotRequest request);
    }

    public interface IProgressStore
    {
        void Save(ShipLoadout loadout);
        ShipLoadout Load();
    }

    // Production-facing ports only. No client-side balance setter, receipt grant or reward grant.
    public interface IAccountService
    {
        Task<string> SignInGuest(CancellationToken cancellation);
        Task LinkIdentity(string provider, string identityToken, CancellationToken cancellation);
    }

    public interface IProgressionService
    {
        Task<ShipLoadout> GetLoadout(CancellationToken cancellation);
        Task<ShipLoadout> Upgrade(string instanceId, long expectedRevision,
            string idempotencyKey, CancellationToken cancellation);
    }

    public interface IRewardService
    {
        Task Claim(string serverIssuedClaimId, string idempotencyKey, CancellationToken cancellation);
    }

    public interface IPurchaseService
    {
        Task VerifyReceipt(string platform, string receipt, CancellationToken cancellation);
    }

    public interface IHeroAbility
    {
        string AbilityId { get; }
        bool CanActivate(int turnNumber);
        bool TryActivate(string targetInstanceId, int turnNumber);
    }

    public interface ILeaderboardService
    {
        Task<string> GetSnapshot(CancellationToken cancellation);
        // No client score setter. A backend derives ranking from verified battle outcomes.
    }

    public interface IDailyMissionService
    {
        Task<string> GetServerMissions(CancellationToken cancellation);
    }

    public interface IRewardedAdService
    {
        // A completion grants nothing locally; a verified provider callback creates a claim.
        Task Show(string serverPlacementSessionId, CancellationToken cancellation);
    }

    public interface IBattleService
    {
        Task<string> StartBattle(string loadoutRevision, CancellationToken cancellation);
        Task SubmitShot(string battleId, int turnNumber, ShotRequest intent,
            string idempotencyKey, CancellationToken cancellation);
    }

    [Serializable]
    public struct ShotRequest
    {
        public Vec3 Origin;
        public Vec3 Velocity;
        public Vec3 WindAcceleration;
        public int Damage;
    }

    public static class Guard
    {
        public static void Finite(float value, string name)
        {
            if (float.IsNaN(value) || float.IsInfinity(value))
                throw new ArgumentOutOfRangeException(name);
        }
        public static string Id(string id)
        {
            if (string.IsNullOrWhiteSpace(id) || id.Length > 100)
                throw new ArgumentException("Invalid identifier.");
            return id;
        }
    }
}
