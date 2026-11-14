using NUnit.Framework;
using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.QA
{
    public sealed class DomainRegressionTests
    {
        [TestCaseSource(typeof(DomainScenarios), nameof(DomainScenarios.Names))]
        public void DomainContract(string scenario)
        {
            var catalog=JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
            Assert.DoesNotThrow(()=>DomainScenarios.Run(scenario,catalog));
        }
    }
}
