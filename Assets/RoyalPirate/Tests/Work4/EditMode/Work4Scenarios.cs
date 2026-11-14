using System;
using System.IO;
using System.Linq;
using RoyalPirate.Domain;
using RoyalPirate.Progression;

namespace RoyalPirate.Work4Tests
{
    // Same scenarios execute in the no-NuGet .NET runner and in Unity with UnityProgressCodec.
    public static class Work4Scenarios
    {
        sealed class MemoryStore : IPlayerProgressStore
        {
            public PlayerProgress Value; public bool Fail;
            public PlayerProgress Load()=>Value?.Copy();
            public void Save(PlayerProgress p) {if(Fail)throw new IOException("Simulated disk full");Value=p.Copy();}
        }
        public static int Run(ShipCatalog catalog,EconomyConfig config,IProgressCodec codec,string folder,Action<string> log)
        {
            int count=0;
            void Check(bool ok,string name) {if(!ok)throw new Exception("FAIL "+name);count++;log("PASS "+name);}
            void Reject(Action action,string name)
            {try{action();}catch(Exception e)when(e is ArgumentException||e is InvalidDataException||e is FutureProgressVersionException||e is IOException){Check(true,name);return;}throw new Exception("Expected rejection: "+name);}
            var now=new DateTime(2026,11,14,12,0,0,DateTimeKind.Utc);
            var memory=new MemoryStore();var session=new ProgressionSession(catalog,config,memory);
            var first=session.Snapshot;Check(first.loadout.modules.Count==5&&first.coins==config.initialCoins,"starter / configurable wallet");
            Check(Guid.TryParseExact(first.playerId,"N",out _),"stable guest identifier");
            string bow="mount.bow.01",hull="mount.hull.01",armor="mount.armor.01",slot="mount.heroslot.01";
            Check(session.BuildOrUpgrade(bow,0,now),"build empty mount");
            Check(session.Snapshot.coins==first.coins-catalog.Module("module.bow.01").baseCost,"build debit exact");
            long balance=session.Snapshot.coins;
            Check(!session.BuildOrUpgrade(bow,0,now)&&session.Snapshot.coins==balance,"stale transaction no charge");
            Check(session.BuildOrUpgrade(bow,1,now)&&session.Snapshot.loadout.modules.Find(m=>m.mountId==bow).level==2,"upgrade existing part");
            Check(!session.BuildOrUpgrade(armor,2,now)&&session.Snapshot.revision==2,"locked module no mutation");
            Check(!session.Remove(hull,2)&&session.Snapshot.revision==2,"structural hull cannot be removed");
            balance=session.Snapshot.coins;Check(session.Remove(bow,2)&&session.Snapshot.coins==balance,"remove without currency creation");
            Check(session.Evolve(3)&&session.Snapshot.stage==2,"evolution unlocks second stage");
            Check(session.BuildOrUpgrade(armor,4,now),"build newly unlocked armor");
            var copy=session.Snapshot;copy.coins=0;copy.loadout.modules.Clear();
            Check(session.Snapshot.coins>0&&session.Snapshot.loadout.modules.Count>0,"snapshots cannot mutate authority");
            var battle=session.BattleLoadout();var current=session.Snapshot;
            Check(codec.Encode(current)==codec.Encode(new ProgressionSession(catalog,config,memory).Snapshot),"restart preserves full aggregate");
            Check(battle.modules.Select(m=>m.instanceId+":"+m.level).SequenceEqual(current.loadout.modules.Select(m=>m.instanceId+":"+m.level))&&battle.revision==current.loadout.revision,"combat snapshot has exact instances levels and revision");
            battle.modules.Clear();Check(session.BattleLoadout().modules.Count>0,"battle copy isolated from saved loadout");
            Check(session.ClaimWelcome(5)&&!session.ClaimWelcome(6),"welcome reward idempotent");
            Check(session.OpenChest(6)&&!session.OpenChest(7),"chest consumed exactly once");
            Check(session.ClaimDaily(7,now)&&!session.ClaimDaily(8,now),"daily claim idempotent");
            Check(!session.ClaimDaily(8,now.AddDays(1)),"tomorrow mission requires new activity");
            Check(session.BuildOrUpgrade(slot,8,now),"build hero position");
            Check(session.Equip("hero.mara",slot,9),"equip unlocked hero");
            Check(session.Equip("hero.bruno",slot,10)&&session.Snapshot.heroes.Count(h=>h.mountId==slot)==1,"one hero per mount / replacement");
            Check(!session.Equip("hero.nyx",slot,11),"locked hero rejected");
            Check(!session.Equip("hero.mara",hull,11),"wrong hero mount rejected");
            Check(session.UpgradeHero("hero.mara",11)&&session.Snapshot.heroes.Find(h=>h.id=="hero.mara").level==2,"hero upgrade spends configured xp and coins");
            Check(session.Remove(slot,12)&&session.Snapshot.heroes.All(h=>string.IsNullOrEmpty(h.mountId)),"removing hero mount unequips crew");
            string before=codec.Encode(session.Snapshot);memory.Fail=true;
            Reject(()=>session.BuildOrUpgrade(bow,13,now),"disk failure surfaced");
            Check(before==codec.Encode(session.Snapshot),"disk failure rolls back wallet modules revision and mission");memory.Fail=false;
            memory.Value.coins=0;session=new ProgressionSession(catalog,config,memory);
            before=codec.Encode(session.Snapshot);
            Check(!session.BuildOrUpgrade(bow,session.Snapshot.revision,now)&&before==codec.Encode(session.Snapshot),"insufficient balance atomic");
            memory.Value.coins=100000;memory.Value.loadout.modules.Find(m=>m.mountId==hull).level=5;
            session=new ProgressionSession(catalog,config,memory);
            Check(!session.BuildOrUpgrade(hull,session.Snapshot.revision,now),"maximum module level");
            memory.Value.revision=long.MaxValue;session=new ProgressionSession(catalog,config,memory);
            Check(!session.Evolve(long.MaxValue),"aggregate revision overflow rejected");
            var invalid=first.Copy();invalid.loadout.modules.Add(invalid.loadout.modules[0]);Reject(()=>invalid.Validate(catalog,config),"duplicate module save rejected");
            invalid=first.Copy();invalid.schemaVersion=2;Reject(()=>invalid.Validate(catalog,config),"unsupported aggregate version rejected");
            invalid=first.Copy();invalid.coins=-1;Reject(()=>invalid.Validate(catalog,config),"negative wallet rejected");
            var navigation=new MenuNavigation();foreach(MenuScreen screen in Enum.GetValues(typeof(MenuScreen))) {navigation.Open(screen);if(navigation.Current!=screen)throw new Exception("navigation");navigation.Home();}
            Check(navigation.Current==MenuScreen.Home,"all menu routes return home");
            var store=new AtomicProgressStore(folder,codec,catalog,config);
            Check(store.Load()==null,"empty folder is new profile");store.Save(first);
            var second=first.Copy();second.coins--;second.revision++;store.Save(second);
            Check(codec.Encode(store.Load())==codec.Encode(second),"file roundtrip full aggregate");
            File.WriteAllText(store.PathName,"{broken json");
            Check(store.Load().coins==first.coins&&store.RecoveredBackup,"corrupt primary recovers validated backup");
            store.Save(second);Check(store.Load().coins==second.coins&&Directory.GetFiles(folder,"*.corrupt.*").Length==1,"recovery preserves corrupt evidence and valid backup");
            File.Delete(store.PathName);Check(store.Load()!=null&&store.RecoveredBackup,"missing primary recovers backup");
            store.Save(second);File.WriteAllText(store.PathName,codec.Encode(new PlayerProgress {schemaVersion=2}));
            Reject(()=>store.Load(),"future version blocks backup downgrade");Reject(()=>store.Save(first),"future version blocks overwrite");
            File.WriteAllText(store.PathName,new string('x',AtomicProgressStore.MaximumBytes+1));
            Check(store.Load()!=null&&store.RecoveredBackup,"oversized primary falls back to bounded backup");
            File.WriteAllText(store.PathName+".bak","bad");Reject(()=>store.Load(),"both corrupt generations block startup");
            string interrupted=Path.Combine(folder,"interrupted");Directory.CreateDirectory(interrupted);File.WriteAllText(Path.Combine(interrupted,"work4-progress-v1.json.tmp"),"unfinished");
            Reject(()=>new AtomicProgressStore(interrupted,codec,catalog,config).Load(),"interrupted initial save not silently reset");
            memory=new MemoryStore {Value=PlayerProgress.Create(catalog,config)};memory.Value.coins=10000000;
            session=new ProgressionSession(catalog,config,memory);var random=new Random(143);
            for(int i=0;i<5000;i++)
            {
                var p=session.Snapshot;string mount=catalog.mounts[random.Next(catalog.mounts.Length)].id;long rev=random.Next(5)==0?p.revision-1:p.revision;
                switch(random.Next(7))
                {case 0:case 1:session.BuildOrUpgrade(mount,rev,now);break;case 2:session.Remove(mount,rev);break;
                 case 3:session.Evolve(rev);break;case 4:session.ClaimWelcome(rev);break;case 5:session.OpenChest(rev);break;case 6:session.ClaimDaily(rev,now);break;}
                session.Snapshot.Validate(catalog,config);
                if(codec.Encode(session.Snapshot)!=codec.Encode(memory.Value))throw new Exception("Unpersisted transaction "+i);
            }
            Check(true,"5000 deterministic transaction interleavings maintain valid saved aggregates");
            return count;
        }
    }
}
