using System;
using System.IO;
using System.Text;
using RoyalPirate.Domain;
using UnityEngine;

namespace RoyalPirate.Services
{
    // Untrusted local development loadout. Stores no currency, identity tokens or entitlements.
    public sealed class LocalLoadoutStore : IProgressStore
    {
        readonly string path;
        readonly ShipCatalog catalog;
        const int MaximumBytes = 64 * 1024;
        public LocalLoadoutStore(string directory, ShipCatalog catalog)
        {
            if (string.IsNullOrWhiteSpace(directory)) throw new ArgumentException(nameof(directory));
            this.catalog = catalog; catalog.Validate();
            path = Path.Combine(directory, "loadout-v1.json");
        }
        public void Save(ShipLoadout loadout)
        {
            loadout.Validate(catalog);
            string json = JsonUtility.ToJson(loadout, true);
            if (Encoding.UTF8.GetByteCount(json) > MaximumBytes) throw new InvalidDataException("Save too large.");
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string temporary = path + ".tmp";
            File.WriteAllText(temporary, json, Encoding.UTF8);
            // Same-directory atomic replacement; retain the previous valid save as backup.
            if (File.Exists(path)) File.Replace(temporary, path, path + ".bak");
            else File.Move(temporary, path);
        }
        public ShipLoadout Load()
        {
            if (!File.Exists(path)) return null;
            try { return Read(path); }
            catch (Exception e) when (e is ArgumentException || e is InvalidDataException)
            {
                if (File.Exists(path + ".bak")) return Read(path + ".bak");
                throw new InvalidDataException("Invalid save; retained for diagnosis.", e);
            }
        }
        ShipLoadout Read(string source)
        {
            if (new FileInfo(source).Length > MaximumBytes) throw new InvalidDataException("Save too large.");
            var value = JsonUtility.FromJson<ShipLoadout>(File.ReadAllText(source));
            if (value == null) throw new InvalidDataException("Empty save.");
            value.Validate(catalog); return value;
        }
    }
}
