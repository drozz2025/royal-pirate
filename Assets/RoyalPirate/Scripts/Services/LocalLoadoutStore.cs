using RoyalPirate.Domain;
using UnityEngine;
namespace RoyalPirate.Services
{
    // Untrusted local development loadout. No wallet, credentials or entitlements.
    public sealed class LocalLoadoutStore : IProgressStore
    {
        sealed class UnityCodec : ILoadoutCodec
        {
            public string Encode(ShipLoadout value) => JsonUtility.ToJson(value, true);
            public ShipLoadout Decode(string text) => JsonUtility.FromJson<ShipLoadout>(text);
        }
        readonly LoadoutFileStore store;
        public LocalLoadoutStore(string directory, ShipCatalog catalog)
        { store = new LoadoutFileStore(directory, catalog, new UnityCodec()); }
        public void Save(ShipLoadout loadout) => store.Save(loadout);
        public ShipLoadout Load() => store.Load();
    }
}
