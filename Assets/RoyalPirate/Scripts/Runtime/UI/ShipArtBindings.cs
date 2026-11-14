using System;
using UnityEngine;

namespace RoyalPirate.UI
{
    // Work 2 can provide this asset without editing models or gameplay contracts.
    // Prefabs use metres, Y up, Z forward and origin at their mount; keep root scale 1.
    [CreateAssetMenu(menuName="Royal Pirate/UI/Ship art bindings")]
    public sealed class ShipArtBindings : ScriptableObject
    {
        [Serializable] public sealed class Entry
        { public string definitionId; public int stage=1; public GameObject prefab; }
        public Entry[] entries=Array.Empty<Entry>();
        public GameObject Find(string id,int stage)
        {
            Entry best=null;
            foreach (var entry in entries)
                if (entry.definitionId==id && entry.stage<=stage && entry.prefab!=null && (best==null || entry.stage>best.stage)) best=entry;
            return best?.prefab;
        }
    }
}
