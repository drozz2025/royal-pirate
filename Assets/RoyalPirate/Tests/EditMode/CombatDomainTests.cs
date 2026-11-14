using NUnit.Framework;
namespace RoyalPirate.Tests
{
    public sealed class CombatDomainTests
    {
        [TestCaseSource(typeof(CombatContractChecks),nameof(CombatContractChecks.Names))]
        public void CombatContract(string name) => CombatContractChecks.Run(name);
    }
}
