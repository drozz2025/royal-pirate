using System.Collections;
using System.Text.RegularExpressions;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime;
using UnityEngine;
using UnityEngine.TestTools;

namespace RoyalPirate.Tests
{
    public sealed class BattleStartupFailureTests
    {
        [UnityTest]
        public IEnumerator InvalidAimConfigurationRetainsVisibleDiagnostic()
        {
            var root = new GameObject("Battle_Invalid_Aim");
            var battle = root.AddComponent<BattleBootstrap>();
            battle.aimSettings = new AimSettings { minElevation = 1 };

            LogAssert.Expect(LogType.Exception, new Regex("Invalid aim limits"));
            yield return null;

            Assert.That(battle.Ready, Is.False);
            Assert.That(battle.StartupError, Does.Contain("Invalid aim limits"));
            Assert.That(battle.enabled, Is.True,
                "Disabling the component also disables OnGUI, hiding its startup diagnostic.");

            Object.Destroy(root);
            yield return null;
        }
    }
}
