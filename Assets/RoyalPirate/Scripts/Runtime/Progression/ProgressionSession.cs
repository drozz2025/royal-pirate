using System;
using RoyalPirate.Domain;

namespace RoyalPirate.Progression
{
    // All mutations happen on a copy. The saved aggregate commits before the UI sees a new balance.
    // This service is deliberately offline-only; it never implements production reward authority.
    public sealed class ProgressionSession
    {
        readonly ShipCatalog catalog;
        readonly EconomyConfig config;
        readonly IPlayerProgressStore store;
        PlayerProgress current;
        public PlayerProgress Snapshot => current.Copy();
        public event Action Changed;
        public ProgressionSession(ShipCatalog catalog, EconomyConfig config, IPlayerProgressStore store)
        {
            this.catalog = catalog; this.config = config; this.store = store;
            catalog.Validate(); config.Validate(catalog);
            current = store.Load();
            if (current == null) { current = PlayerProgress.Create(catalog, config); store.Save(current); }
            current.Validate(catalog, config);
        }
        bool Commit(long expectedRevision, Func<PlayerProgress,bool> change)
        {
            if (current.revision != expectedRevision || current.revision == long.MaxValue) return false;
            var next = current.Copy();
            try { if (!change(next)) return false; next.revision = checked(next.revision + 1); next.Validate(catalog,config); }
            catch (OverflowException) { return false; }
            store.Save(next); current = next; Changed?.Invoke(); return true;
        }
        public bool BuildOrUpgrade(string mountId, long revision, DateTime utcNow)
        {
            var mount = catalog.Mount(mountId);
            return Commit(revision, p => {
                if (config.UnlockStage(mount.defaultModuleId) > p.stage) return false;
                var yard = new SandboxShipyard(catalog,p.loadout,p.coins);
                var part = p.loadout.modules.Find(m => m.mountId == mountId);
                bool success = part == null ? yard.Install(mount.defaultModuleId,mountId,p.loadout.revision) : yard.Upgrade(part.instanceId,p.loadout.revision);
                if (!success) return false;
                p.coins = yard.Coins; SetMissionDay(p,utcNow); p.dailyBuilds = 1; return true;
            });
        }
        public bool Remove(string mountId, long revision) => Commit(revision,p => {
            var part = p.loadout.modules.Find(m => m.mountId == mountId);
            if (part == null || catalog.Mount(mountId).kind == ModuleKind.Hull || p.loadout.revision == long.MaxValue) return false;
            p.loadout.modules.Remove(part); p.loadout.revision++;
            foreach (var h in p.heroes) if (h.mountId == mountId) h.mountId = null;
            return true; // Removal has no refund; it cannot mint currency.
        });
        public bool Evolve(long revision) => Commit(revision,p => {
            if (p.stage >= 5 || p.coins < config.stageCosts[p.stage-1]) return false;
            p.coins -= config.stageCosts[p.stage-1]; p.stage++;
            foreach (var h in config.heroes) if (h.unlockStage == p.stage) p.heroes.Add(new HeroProgress { id = h.id });
            return true;
        });
        public bool Equip(string heroId, string mountId, long revision) => Commit(revision,p => {
            var hero = p.heroes.Find(h => h.id == heroId); if (hero == null) return false;
            if (string.IsNullOrEmpty(mountId)) { hero.mountId = null; return true; }
            if (catalog.Mount(mountId).kind != ModuleKind.HeroSlot || !p.loadout.modules.Exists(m => m.mountId == mountId)) return false;
            foreach (var h in p.heroes) if (h.mountId == mountId) h.mountId = null;
            hero.mountId = mountId; return true;
        });
        public bool UpgradeHero(string heroId,long revision) => Commit(revision,p => {
            var hero = p.heroes.Find(h => h.id == heroId); if (hero == null) return false;
            var d = config.Hero(heroId); long cost = (long)d.baseCost * hero.level;
            int xp = checked(d.baseExperience * hero.level);
            if (hero.level >= d.maxLevel || p.coins < cost || hero.experience < xp) return false;
            p.coins -= cost; hero.experience -= xp; hero.level++; return true;
        });
        static void SetMissionDay(PlayerProgress p, DateTime now)
        { string day = now.ToUniversalTime().ToString("yyyy-MM-dd"); if (p.lastDailyDay != day) { p.lastDailyDay = day; p.dailyBuilds = 0; } }
        static void Grant(PlayerProgress p, RewardDefinition r)
        {
            p.coins = checked(p.coins + r.coins); p.gems = checked(p.gems + r.gems);
            p.experience = checked(p.experience + r.experience); p.trophies = checked(p.trophies + r.trophies); p.chests = checked(p.chests + r.chests);
            foreach (var h in p.heroes) h.experience = checked(h.experience + r.experience);
        }
        public bool ClaimWelcome(long revision) => Commit(revision,p => {
            if (p.claimedRewards.Contains("welcome")) return false;
            Grant(p,config.Reward("welcome")); p.claimedRewards.Add("welcome"); return true;
        });
        public bool ClaimDaily(long revision,DateTime now) => Commit(revision,p => {
            SetMissionDay(p,now); string id = "daily."+p.lastDailyDay;
            if (p.dailyBuilds < 1 || p.claimedRewards.Contains(id) || p.claimedRewards.Count >= 2048) return false;
            Grant(p,config.Reward("daily.build")); p.claimedRewards.Add(id); return true;
        });
        public bool OpenChest(long revision) => Commit(revision,p => {
            if (p.chests < 1) return false; p.chests--; Grant(p,config.Reward("chest.basic")); return true;
        });
        public bool SetSound(bool value,long revision) => Commit(revision,p => { p.sound=value; return true; });
        public ShipLoadout BattleLoadout()
        { var copy = current.Copy().loadout; copy.Validate(catalog); return copy; }
    }
}
