using System;
using System.IO;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Progression;
using RoyalPirate.UI;
using UnityEngine;
namespace RoyalPirate.Work4Tests
{
    public sealed class ProgressionTests
    {
        [Test] public void UnityCodecAndFileStoreRunAllProgressionScenarios()
        {
            var catalog=JsonUtility.FromJson<ShipCatalog>(Resources.Load<TextAsset>("Navio01").text);
            var config=JsonUtility.FromJson<EconomyConfig>(Resources.Load<TextAsset>("Work4Economy").text);
            string folder=Path.Combine(Path.GetTempPath(),"work4-unity-"+Guid.NewGuid().ToString("N"));
            try {Assert.That(Work4Scenarios.Run(catalog,config,new UnityProgressCodec(),folder,TestContext.WriteLine),Is.EqualTo(46));}
            finally {if(Directory.Exists(folder))Directory.Delete(folder,true);}
        }
        [TestCase(1179,2556,0,102,1179,2322)]
        [TestCase(1080,2400,0,72,1080,2232)]
        [TestCase(750,1334,0,0,750,1334)]
        [TestCase(2048,2732,0,40,2048,2640)]
        public void SafeAreaInsetsRemainInsideScreen(float w,float h,float x,float y,float sw,float sh)
        {
            var i=HarbourBootstrap.SafeInsets(new Rect(x,y,sw,sh),w,h);
            Assert.That(i.x,Is.InRange(0f,1f));Assert.That(i.y,Is.InRange(0f,1f));
            Assert.That(i.z,Is.InRange(0f,1f));Assert.That(i.w,Is.InRange(0f,1f));
            Assert.That((1-i.x-i.z)*w,Is.EqualTo(sw).Within(.01));
            Assert.That((1-i.y-i.w)*h,Is.EqualTo(sh).Within(.01));
        }
    }
}
