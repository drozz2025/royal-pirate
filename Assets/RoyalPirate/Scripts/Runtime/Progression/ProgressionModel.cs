using System;
using System.Collections.Generic;
using RoyalPirate.Domain;

namespace RoyalPirate.Progression
{
    public enum HeroClass { Captain, Gunner, Navigator, Engineer, Special }
    public enum HeroRarity { Common, Rare, Epic, Legendary }
    [Serializable] public sealed class HeroDefinition
    {
        public string id, name, abilityId;
        public HeroClass heroClass;
        public HeroRarity rarity;
        public int unlockStage, baseCost, baseExperience, maxLevel;
    }
    [Serializable] public sealed class HeroProgress
    {
        public string id, mountId;
        public int level = 1, experience;
    }
    [Serializable] public sealed class ModuleGate { public string moduleId; public int stage; }
    [Serializable] public sealed class RewardDefinition
    {
        public string id;
        public int coins, gems, experience, trophies, chests;
    }
    [Serializable] public sealed class ShipRoadmapEntry
    {
        public string id, name, shipClass;
        public int unlockTrophies, weaponCapacity;
        public bool available;
    }
    [Serializable] public sealed class EconomyConfig
    {
        public int schemaVersion = 1, initialCoins, initialGems, experiencePerLevel;
        public string[] starterMountIds, stageNames;
        public int[] stageCosts;
        public ModuleGate[] moduleGates;
        public HeroDefinition[] heroes;
        public RewardDefinition[] rewards;
        public ShipRoadmapEntry[] ships;
        public RewardDefinition Reward(string id)
        { foreach (var r in rewards) if (r.id == id) return r; throw new ArgumentException("Unknown reward."); }
        public HeroDefinition Hero(string id)
        { foreach (var h in heroes) if (h.id == id) return h; throw new ArgumentException("Unknown hero."); }
        public int UnlockStage(string id)
        { foreach (var gate in moduleGates) if (gate.moduleId == id) return gate.stage; throw new ArgumentException("Missing module gate."); }
        public void Validate(ShipCatalog catalog)
        {
            if (schemaVersion != 1 || initialCoins < 0 || initialGems < 0 || experiencePerLevel < 1 ||
                stageNames == null || stageNames.Length != 5 || stageCosts == null || stageCosts.Length != 4 ||
                starterMountIds == null || moduleGates == null || heroes == null || rewards == null || ships == null)
                throw new ArgumentException("Invalid economy configuration.");
            foreach (int cost in stageCosts) if (cost < 1) throw new ArgumentException("Invalid stage price.");
            var seen = new HashSet<string>();
            foreach (var g in moduleGates)
            { catalog.Module(g.moduleId); if (!seen.Add(g.moduleId) || g.stage < 1 || g.stage > 5) throw new ArgumentException("Invalid gate."); }
            foreach (var m in catalog.modules) UnlockStage(m.id);
            seen.Clear(); bool hull = false;
            foreach (var id in starterMountIds)
            { var m = catalog.Mount(id); if (!seen.Add(id) || UnlockStage(m.defaultModuleId) != 1) throw new ArgumentException("Invalid starter."); hull |= m.kind == ModuleKind.Hull; }
            if (!hull) throw new ArgumentException("Starter hull missing.");
            seen.Clear();
            foreach (var h in heroes)
                if (h == null || !seen.Add(Guard.Id(h.id)) || string.IsNullOrWhiteSpace(h.name) || string.IsNullOrWhiteSpace(h.abilityId) ||
                    h.unlockStage < 1 || h.unlockStage > 5 || h.baseCost < 1 || h.baseExperience < 1 || h.maxLevel < 1 || h.maxLevel > 100 ||
                    !Enum.IsDefined(typeof(HeroClass), h.heroClass) || !Enum.IsDefined(typeof(HeroRarity), h.rarity)) throw new ArgumentException("Invalid hero.");
            seen.Clear();
            foreach (var r in rewards)
                if (r == null || !seen.Add(Guard.Id(r.id)) || r.coins < 0 || r.gems < 0 || r.experience < 0 || r.trophies < 0 || r.chests < 0)
                    throw new ArgumentException("Invalid reward.");
            seen.Clear(); int available = 0;
            foreach (var s in ships)
            {
                if (s == null || !seen.Add(Guard.Id(s.id)) || s.unlockTrophies < 0 || s.weaponCapacity < 1) throw new ArgumentException("Invalid ship roadmap.");
                if (s.available) { available++; if (s.id != catalog.shipId) throw new ArgumentException("Catalog not implemented."); }
            }
            if (available != 1) throw new ArgumentException("One ship is implemented in this milestone.");
        }
    }
    [Serializable] public sealed class PlayerProgress
    {
        public int schemaVersion = 1;
        public string playerId, displayName = "Captain", environment = "offline-sandbox";
        public long revision, coins, gems;
        public int experience, trophies, chests, stage = 1;
        public bool sound = true;
        public ShipLoadout loadout;
        public List<HeroProgress> heroes = new List<HeroProgress>();
        public List<string> claimedRewards = new List<string>();
        public string lastDailyDay;
        public int dailyBuilds;
        public PlayerProgress Copy()
        {
            var copy = (PlayerProgress)MemberwiseClone();
            copy.loadout = new ShipLoadout { schemaVersion = loadout.schemaVersion, shipId = loadout.shipId, revision = loadout.revision };
            foreach (var m in loadout.modules) copy.loadout.modules.Add(new ModuleInstallation { instanceId = m.instanceId, definitionId = m.definitionId, mountId = m.mountId, level = m.level });
            copy.heroes = new List<HeroProgress>();
            foreach (var h in heroes) copy.heroes.Add(new HeroProgress { id = h.id, level = h.level, experience = h.experience, mountId = h.mountId });
            copy.claimedRewards = new List<string>(claimedRewards); return copy;
        }
        public void Validate(ShipCatalog catalog, EconomyConfig config)
        {
            if (schemaVersion != 1 || environment != "offline-sandbox" || !Guid.TryParseExact(playerId, "N", out _) ||
                string.IsNullOrWhiteSpace(displayName) || displayName.Length > 30 || revision < 0 || coins < 0 || gems < 0 ||
                experience < 0 || trophies < 0 || chests < 0 || stage < 1 || stage > 5 || loadout == null ||
                heroes == null || claimedRewards == null || claimedRewards.Count > 2048 || dailyBuilds < 0 || dailyBuilds > 1)
                throw new ArgumentException("Invalid local progress.");
            loadout.Validate(catalog);
            foreach (var m in loadout.modules)
                if (config.UnlockStage(m.definitionId) > stage) throw new ArgumentException("Locked module in save.");
            var ids = new HashSet<string>(); var mounts = new HashSet<string>();
            foreach (var h in heroes)
            {
                if (h == null || !ids.Add(Guard.Id(h.id))) throw new ArgumentException("Duplicate hero.");
                var d = config.Hero(h.id);
                if (h.level < 1 || h.level > d.maxLevel || h.experience < 0 || d.unlockStage > stage) throw new ArgumentException("Invalid hero level.");
                if (!string.IsNullOrEmpty(h.mountId) && (!mounts.Add(h.mountId) || catalog.Mount(h.mountId).kind != ModuleKind.HeroSlot ||
                    !loadout.modules.Exists(m => m.mountId == h.mountId))) throw new ArgumentException("Invalid hero position.");
            }
            ids.Clear(); foreach (string id in claimedRewards) if (!ids.Add(Guard.Id(id))) throw new ArgumentException("Duplicate claim.");
            if (!string.IsNullOrEmpty(lastDailyDay) && !DateTime.TryParseExact(lastDailyDay,"yyyy-MM-dd",System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,out _)) throw new ArgumentException("Invalid mission day.");
        }
        public static PlayerProgress Create(ShipCatalog catalog, EconomyConfig config)
        {
            config.Validate(catalog);
            var value = new PlayerProgress { playerId = Guid.NewGuid().ToString("N"), coins = config.initialCoins, gems = config.initialGems,
                loadout = new ShipLoadout { shipId = catalog.shipId } };
            foreach (string id in config.starterMountIds) value.loadout.modules.Add(new ModuleInstallation {
                instanceId = Guid.NewGuid().ToString("N"), mountId = id, definitionId = catalog.Mount(id).defaultModuleId });
            foreach (var hero in config.heroes) if (hero.unlockStage == 1) value.heroes.Add(new HeroProgress { id = hero.id });
            value.Validate(catalog,config); return value;
        }
    }
    public interface IPlayerProgressStore { PlayerProgress Load(); void Save(PlayerProgress value); }
    public interface IProgressCodec { string Encode(PlayerProgress value); PlayerProgress Decode(string text); }
    public enum MenuScreen { Home, Shipyard, Heroes, Shop, Missions, Rewards, Settings, Fleet, Ranking }
    public sealed class MenuNavigation
    {
        public MenuScreen Current { get; private set; }
        public void Open(MenuScreen screen) { if (!Enum.IsDefined(typeof(MenuScreen),screen)) throw new ArgumentException("Unknown screen."); Current = screen; }
        public void Home() => Current = MenuScreen.Home;
    }
}
