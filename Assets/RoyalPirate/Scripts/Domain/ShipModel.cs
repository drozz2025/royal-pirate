using System;
using System.Collections.Generic;

namespace RoyalPirate.Domain
{
    [Serializable]
    public sealed class ModuleDefinition
    {
        public string id;
        public ModuleKind kind;
        public int baseHealth;
        public int baseCost;
        public int damage;
        public int maxLevel = 5;
        public Vec3 size;
        public int HealthAt(int level) => checked(baseHealth + (level - 1) * (baseHealth / 4));
        public int UpgradeCost(int level) => checked(baseCost * level);
    }

    [Serializable]
    public sealed class MountDefinition
    {
        public string id;
        public ModuleKind kind;
        public string defaultModuleId;
        public Vec3 position;
    }

    [Serializable]
    public sealed class ShipCatalog
    {
        public string shipId;
        public ModuleDefinition[] modules;
        public MountDefinition[] mounts;
        public ModuleDefinition Module(string id)
        {
            foreach (var item in modules) if (item.id == id) return item;
            throw new ArgumentException("Unknown module: " + id);
        }
        public MountDefinition Mount(string id)
        {
            foreach (var item in mounts) if (item.id == id) return item;
            throw new ArgumentException("Unknown mount: " + id);
        }
        public void Validate()
        {
            Guard.Id(shipId);
            if (modules == null || mounts == null || modules.Length == 0 || mounts.Length == 0)
                throw new ArgumentException("Empty catalog.");
            var ids = new HashSet<string>();
            foreach (var item in modules)
            {
                if (item == null || !ids.Add(Guard.Id(item.id)) || item.baseHealth < 1 ||
                    item.baseHealth > 1000000 || item.baseCost < 1 || item.baseCost > 1000000 ||
                    item.maxLevel < 1 || item.maxLevel > 100 || item.damage < 0 ||
                    !Enum.IsDefined(typeof(ModuleKind), item.kind)) throw new ArgumentException("Invalid module.");
                Guard.Finite(item.size.x, "size"); Guard.Finite(item.size.y, "size"); Guard.Finite(item.size.z, "size");
                if (item.size.x <= 0 || item.size.y <= 0 || item.size.z <= 0) throw new ArgumentException("Invalid dimensions.");
            }
            ids.Clear(); int hulls = 0;
            foreach (var mount in mounts)
            {
                if (mount == null || !ids.Add(Guard.Id(mount.id)) || Module(mount.defaultModuleId).kind != mount.kind)
                    throw new ArgumentException("Invalid mount.");
                Guard.Finite(mount.position.x, "position"); Guard.Finite(mount.position.y, "position"); Guard.Finite(mount.position.z, "position");
                if (mount.kind == ModuleKind.Hull) hulls++;
            }
            if (hulls != 1) throw new ArgumentException("Exactly one structural hull is required.");
        }
    }

    [Serializable]
    public sealed class ModuleInstallation
    {
        public string instanceId;
        public string definitionId;
        public string mountId;
        public int level = 1;
    }

    [Serializable]
    public sealed class ShipLoadout
    {
        public int schemaVersion = 1;
        public string shipId;
        public long revision;
        public List<ModuleInstallation> modules = new List<ModuleInstallation>();
        public void Validate(ShipCatalog catalog)
        {
            if (schemaVersion != 1 || shipId != catalog.shipId || revision < 0 || modules == null || modules.Count > catalog.mounts.Length)
                throw new ArgumentException("Unsupported or invalid loadout.");
            var instances = new HashSet<string>(); var slots = new HashSet<string>(); int hulls = 0;
            foreach (var entry in modules)
            {
                if (entry == null || !instances.Add(Guard.Id(entry.instanceId)) || !slots.Add(Guard.Id(entry.mountId)))
                    throw new ArgumentException("Duplicate module or occupied mount.");
                var definition = catalog.Module(entry.definitionId);
                if (catalog.Mount(entry.mountId).kind != definition.kind || entry.level < 1 || entry.level > definition.maxLevel)
                    throw new ArgumentException("Incompatible module or invalid level.");
                if (definition.kind == ModuleKind.Hull) hulls++;
            }
            if (hulls != 1) throw new ArgumentException("A loadout requires one hull.");
        }
        public static ShipLoadout CreateStarter(ShipCatalog catalog)
        {
            catalog.Validate();
            var result = new ShipLoadout { shipId = catalog.shipId };
            foreach (var mount in catalog.mounts)
                result.modules.Add(new ModuleInstallation { instanceId = Guid.NewGuid().ToString("N"),
                    definitionId = mount.defaultModuleId, mountId = mount.id });
            result.Validate(catalog); return result;
        }
    }

    public sealed class ModuleState : IDamageable
    {
        public string InstanceId { get; }
        public int MaxHealth { get; }
        public int Health { get; private set; }
        public bool IsDestroyed => Health == 0;
        public event Action<ModuleState> Destroyed;
        public ModuleState(string id, int maximumHealth)
        {
            InstanceId = Guard.Id(id);
            if (maximumHealth < 1) throw new ArgumentOutOfRangeException(nameof(maximumHealth));
            MaxHealth = Health = maximumHealth;
        }
        public int ApplyDamage(int amount)
        {
            if (amount < 0) throw new ArgumentOutOfRangeException(nameof(amount));
            int applied = Math.Min(Health, amount); Health -= applied;
            if (applied > 0 && IsDestroyed) Destroyed?.Invoke(this);
            return applied;
        }
    }
}
