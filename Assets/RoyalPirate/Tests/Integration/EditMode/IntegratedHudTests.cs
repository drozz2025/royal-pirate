using System;
using NUnit.Framework;
using RoyalPirate.Domain;
using RoyalPirate.Runtime.Combat;
using RoyalPirate.UI;
using UnityEngine.UIElements;
namespace RoyalPirate.IntegrationTests
{
    public sealed class IntegratedHudTests
    {
        [TestCase(BattleOutcome.PlayerVictory,true,false)]
        [TestCase(BattleOutcome.PlayerDefeat,false,false)]
        [TestCase(BattleOutcome.Draw,false,true)]
        public void OutcomesRemainDistinct(BattleOutcome outcome,bool won,bool draw)
        {
            var s=CombatHudAdapter.Map(new CombatHudState {Outcome=outcome},new AimSettings());
            Assert.That(s.Finished,Is.True);Assert.That(s.Won,Is.EqualTo(won));Assert.That(s.Draw,Is.EqualTo(draw));
        }
        [Test] public void RestrictedPowerAndWindAreMappedWithoutLosingDirection()
        {
            var s=CombatHudAdapter.Map(new CombatHudState {Power=.4f,Wind=new Vec3(-3,0,4)},new AimSettings {minPower=.2f,maxPower=.6f});
            Assert.That(s.Power,Is.EqualTo(.5f).Within(.0001));Assert.That(s.WindAcceleration,Is.EqualTo(5));
            Assert.That(s.WindText,Does.Contain("-3"));
        }
        sealed class Source : IBattleHudSource
        {
            public BattleHudState Current=>new BattleHudState(1,1,20,0,.5f,1,true,false,false,false,null);
            public int Subscriptions,Fires,PowerChanges;
            Action changed;
            public event Action Changed {add{changed+=value;Subscriptions++;}remove{changed-=value;Subscriptions--;}}
            public void RequestFire(){Fires++;}
            public void SetPower(float value){PowerChanges++;}
            public void RequestAbility(){}
            public void Refresh()=>changed?.Invoke();
        }
        [Test] public void PresenterDetachesAndSnapshotRefreshNeverSendsInput()
        {
            var source=new Source();var root=new VisualElement();var presenter=new BattleHudPresenter(root,source);
            Assert.That(source.Subscriptions,Is.EqualTo(1));source.Refresh();
            Assert.That(source.Fires+source.PowerChanges,Is.Zero);
            presenter.Dispose();Assert.That(source.Subscriptions,Is.Zero);Assert.That(root.childCount,Is.Zero);
        }
    }
}
