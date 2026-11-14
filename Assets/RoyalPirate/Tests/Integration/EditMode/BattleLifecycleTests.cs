using NUnit.Framework;
using RoyalPirate.Runtime;
using UnityEngine;

namespace RoyalPirate.IntegrationTests
{
    public sealed class BattleLifecycleTests
    {
        [Test]
        public void DestroyingBootstrapBeforeStartPreservesGlobalTiming()
        {
            float originalStep = Time.fixedDeltaTime;
            int originalFrameRate = Application.targetFrameRate;
            var subject = new GameObject("Unstarted battle lifecycle regression");
            try
            {
                subject.AddComponent<BattleBootstrap>();
            }
            finally
            {
                Object.DestroyImmediate(subject);
            }
            Assert.That(Time.fixedDeltaTime, Is.EqualTo(originalStep));
            Assert.That(Application.targetFrameRate, Is.EqualTo(originalFrameRate));
        }
    }
}
