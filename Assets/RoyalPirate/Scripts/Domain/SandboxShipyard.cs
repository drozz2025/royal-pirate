using System;

namespace RoyalPirate.Domain
{
    // Offline development currency ONLY. This is not the production economy authority.
    public sealed class SandboxShipyard
    {
        public long Coins { get; private set; }
        readonly ShipCatalog catalog;
        readonly ShipLoadout loadout;
        public SandboxShipyard(ShipCatalog catalog, ShipLoadout loadout, long coins)
        {
            catalog.Validate(); loadout.Validate(catalog);
            if (coins < 0) throw new ArgumentOutOfRangeException(nameof(coins));
            this.catalog = catalog; this.loadout = loadout; Coins = coins;
        }
        public bool Upgrade(string instanceId, long expectedRevision)
        {
            if (expectedRevision != loadout.revision) return false;
            var entry = loadout.modules.Find(x => x.instanceId == instanceId);
            if (entry == null) return false;
            var definition = catalog.Module(entry.definitionId);
            if (entry.level >= definition.maxLevel) return false;
            long cost = definition.UpgradeCost(entry.level);
            if (Coins < cost || loadout.revision == long.MaxValue) return false;
            Coins -= cost; entry.level++; loadout.revision++; return true;
        }
        public bool Install(string definitionId, string mountId, long expectedRevision)
        {
            if (expectedRevision != loadout.revision || loadout.revision == long.MaxValue ||
                loadout.modules.Exists(x => x.mountId == mountId)) return false;
            var definition = catalog.Module(definitionId); var mount = catalog.Mount(mountId);
            if (definition.kind != mount.kind || Coins < definition.baseCost) return false;
            loadout.modules.Add(new ModuleInstallation { instanceId = Guid.NewGuid().ToString("N"),
                definitionId = definitionId, mountId = mountId });
            Coins -= definition.baseCost; loadout.revision++; return true;
        }
    }
}
