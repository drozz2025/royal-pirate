using System;

namespace RoyalPirate.Domain
{
    // Free battle-only ability, bound to a real hero slot and cannon. No progression or purchase mutation.
    public sealed class ReinforcedShot : IHeroAbility
    {
        readonly string cannonId;
        readonly Func<bool> isHeroAlive;
        int nextTurn = 1, armedTurn;
        public string AbilityId => "ability.reinforced-shot.01";
        public bool IsArmed(int turn) => armedTurn == turn;
        public ReinforcedShot(string targetCannonId, Func<bool> heroAlive)
        { cannonId = Guard.Id(targetCannonId); isHeroAlive = heroAlive ?? throw new ArgumentNullException(nameof(heroAlive)); }
        public bool CanActivate(int turnNumber) => turnNumber >= nextTurn && turnNumber > 0 && !IsArmed(turnNumber) && isHeroAlive();
        public bool TryActivate(string targetInstanceId, int turnNumber)
        {
            if (targetInstanceId != cannonId || !CanActivate(turnNumber)) return false;
            armedTurn = turnNumber; nextTurn = turnNumber > int.MaxValue-6 ? int.MaxValue : turnNumber+6; return true;
        }
        public int DamageFor(int baseDamage, int turnNumber)
        {
            if (baseDamage < 0 || baseDamage > 1000000) throw new ArgumentOutOfRangeException(nameof(baseDamage));
            return IsArmed(turnNumber) && isHeroAlive() ? baseDamage + baseDamage/2 : baseDamage;
        }
    }
}
