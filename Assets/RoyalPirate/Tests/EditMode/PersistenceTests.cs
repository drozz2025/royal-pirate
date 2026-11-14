using System;
using System.IO;
using System.Threading;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Services;
using UnityEngine;

namespace RoyalPirate.Tests
{
    public sealed class PersistenceTests
    {
        string directory;
        ShipCatalog catalog;
        [SetUp] public void SetUp()
        {
            directory=Path.Combine(Path.GetTempPath(),"RoyalPirateTests",Guid.NewGuid().ToString("N"));
            catalog=JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
        }
        [TearDown] public void TearDown() { if(Directory.Exists(directory)) Directory.Delete(directory,true); }
        [Test] public void RoundTripPreservesInstanceIdsLevelsAndRevision()
        {
            var store=new LocalLoadoutStore(directory,catalog); Assert.That(store.Load(),Is.Null);
            var original=ShipLoadout.CreateStarter(catalog); original.modules[0].level=3; original.revision=4;
            store.Save(original); var loaded=store.Load();
            Assert.That(loaded.modules[0].instanceId,Is.EqualTo(original.modules[0].instanceId));
            Assert.That(loaded.modules[0].level,Is.EqualTo(3)); Assert.That(loaded.revision,Is.EqualTo(4));
        }
        [Test] public void CorruptPrimaryFallsBackToPreviousValidSave()
        {
            var store=new LocalLoadoutStore(directory,catalog); var value=ShipLoadout.CreateStarter(catalog);
            store.Save(value); value.revision=1; store.Save(value);
            File.WriteAllText(Path.Combine(directory,"loadout-v1.json"),"{}");
            Assert.That(store.Load().revision,Is.Zero);
        }
        [Test] public void TamperedLevelCannotBeSaved()
        {
            var store=new LocalLoadoutStore(directory,catalog); var value=ShipLoadout.CreateStarter(catalog);
            value.modules[0].level=int.MaxValue;
            Assert.Throws<ArgumentException>(()=>store.Save(value));
        }
        [Test] public void CommerceFailsClosed()
        {
            var commerce=new DisabledCommerce();
            Assert.ThrowsAsync<NotSupportedException>(async ()=>await commerce.VerifyReceipt("apple","fake",CancellationToken.None));
            Assert.ThrowsAsync<NotSupportedException>(async ()=>await commerce.Claim("fake","same",CancellationToken.None));
        }
    }
}
