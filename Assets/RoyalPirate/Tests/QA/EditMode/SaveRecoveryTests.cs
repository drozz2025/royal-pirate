using System;
using System.IO;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Services;
using UnityEngine;

namespace RoyalPirate.QA
{
    public sealed class SaveRecoveryTests
    {
        string directory,primary;
        ShipCatalog catalog;
        ShipLoadout value;
        LocalLoadoutStore store;
        [SetUp] public void SetUp()
        {
            directory=Path.Combine(Path.GetTempPath(),"RoyalPirateQA",Guid.NewGuid().ToString("N"));
            primary=Path.Combine(directory,"loadout-v1.json");
            catalog=JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
            value=ShipLoadout.CreateStarter(catalog);store=new LocalLoadoutStore(directory,catalog);
        }
        [TearDown] public void TearDown(){if(Directory.Exists(directory))Directory.Delete(directory,true);}
        [Test] public void InterruptedTemporaryWriteDoesNotOverridePrimary()
        {
            store.Save(value);File.WriteAllText(primary+".tmp","{truncated");
            Assert.That(store.Load().modules[0].instanceId,Is.EqualTo(value.modules[0].instanceId));
            value.revision=1;store.Save(value);Assert.That(store.Load().revision,Is.EqualTo(1));
        }
        [Test] public void OversizedPrimaryRecoversBackup()
        {
            store.Save(value);value.revision=1;store.Save(value);
            File.WriteAllText(primary,new string('x',65537));Assert.That(store.Load().revision,Is.Zero);
        }
        [Test] public void InvalidSaveDoesNotOverwriteExistingData()
        {
            store.Save(value);var before=File.ReadAllBytes(primary);value.modules[0].level=0;
            Assert.Throws<ArgumentException>(()=>store.Save(value));CollectionAssert.AreEqual(before,File.ReadAllBytes(primary));
        }
        [Test] public void RepeatedSavesPreserveUpgradeAndRevision()
        {
            var yard=new SandboxShipyard(catalog,value,1000);Assert.That(yard.Upgrade(value.modules[0].instanceId,0),Is.True);
            for(int i=0;i<100;i++)store.Save(value);
            var copy=store.Load();Assert.That(copy.revision,Is.EqualTo(1));Assert.That(copy.modules[0].level,Is.EqualTo(2));
        }
        [Test] public void UnsupportedSchemaIsRetainedForDiagnosis()
        {
            store.Save(value);value.schemaVersion=2;File.WriteAllText(primary,JsonUtility.ToJson(value));
            Assert.Throws<InvalidDataException>(()=>store.Load());Assert.That(File.Exists(primary),Is.True);
        }
        [Test] public void StoragePathFailureIsReportedWithoutDeletingOtherData()
        {
            Directory.CreateDirectory(directory);string occupied=Path.Combine(directory,"occupied");File.WriteAllText(occupied,"keep");
            var blocked=new LocalLoadoutStore(occupied,catalog);
            Assert.That(()=>blocked.Save(value),Throws.InstanceOf<IOException>());
            Assert.That(File.ReadAllText(occupied),Is.EqualTo("keep"));
        }
        // Desired recovery contracts. Intentionally active: failures block release, never count as passes.
        // Work 1 owns LocalLoadoutStore; propose fixes there before changing shared production code.
        [Test, Category("ReleaseBlocker")]
        public void W5R02_MissingPrimaryRecoversExistingBackup()
        {
            store.Save(value);value.revision=1;store.Save(value);File.Delete(primary);
            var recovered=store.Load();Assert.That(recovered,Is.Not.Null,"Valid backup must not be ignored");
            Assert.That(recovered.revision,Is.Zero);
        }
        [Test, Category("ReleaseBlocker")]
        public void W5R03_RecoverySaveMustNotReplaceGoodBackupWithCorruptPrimary()
        {
            store.Save(value);value.revision=1;store.Save(value);File.WriteAllText(primary,"{}");
            var recovered=store.Load();store.Save(recovered);File.WriteAllText(primary,"{}");
            Assert.DoesNotThrow(()=>store.Load(),"Saving recovered data must retain a valid backup");
        }
    }
}
