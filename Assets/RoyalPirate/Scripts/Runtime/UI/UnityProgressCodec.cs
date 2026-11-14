using RoyalPirate.Progression;
using UnityEngine;

namespace RoyalPirate.UI
{
    public sealed class UnityProgressCodec : IProgressCodec
    {
        public string Encode(PlayerProgress value) => JsonUtility.ToJson(value,true);
        public PlayerProgress Decode(string text) => JsonUtility.FromJson<PlayerProgress>(text);
    }
}
