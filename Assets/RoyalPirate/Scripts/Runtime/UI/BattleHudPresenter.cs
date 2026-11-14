using System;
using UnityEngine;
using UnityEngine.UIElements;
namespace RoyalPirate.UI
{
    // Additive presentation port for Work 3 review; no combat rules, physics or local reward grants.
    public readonly struct BattleHudState
    {
        public readonly float PlayerHealth,EnemyHealth,Seconds,WindAcceleration,Power;
        public readonly int Turn;
        public readonly bool CanFire,Finished,Won,CanUseAbility;
        public readonly string RewardSummary;
        public BattleHudState(float playerHealth,float enemyHealth,float seconds,float windAcceleration,float power,
            int turn,bool canFire,bool finished,bool won,bool canUseAbility,string rewardSummary)
        { PlayerHealth=playerHealth;EnemyHealth=enemyHealth;Seconds=seconds;WindAcceleration=windAcceleration;Power=power;
          Turn=turn;CanFire=canFire;Finished=finished;Won=won;CanUseAbility=canUseAbility;RewardSummary=rewardSummary; }
    }
    public interface IBattleHudSource
    {
        BattleHudState Current { get; }
        event Action Changed;
        void RequestFire();
        void SetPower(float normalized);
        void RequestAbility();
    }
    public sealed class BattleHudPresenter : IDisposable
    {
        readonly IBattleHudSource source;
        readonly VisualElement container;
        readonly ProgressBar player,enemy;
        readonly Label turn,wind,result;
        readonly Slider power;
        readonly Button fire,ability;
        public BattleHudPresenter(VisualElement parent,IBattleHudSource source)
        {
            this.source=source;container=new VisualElement();container.AddToClassList("card");parent.Add(container);
            player=new ProgressBar {title="Your ship",lowValue=0,highValue=100};enemy=new ProgressBar{title="Opponent",lowValue=0,highValue=100};
            turn=new Label();wind=new Label();result=new Label();power=new Slider("Power",0,1);
            fire=new Button(()=>source.RequestFire()){text="Fire"};fire.AddToClassList("primary");fire.AddToClassList("action");
            ability=new Button(()=>source.RequestAbility()){text="Ability"};ability.AddToClassList("action");
            foreach(var e in new VisualElement[]{player,enemy,turn,wind,power,fire,ability,result})container.Add(e);
            power.RegisterValueChangedCallback(e=>source.SetPower(e.newValue));source.Changed+=Refresh;Refresh();
        }
        void Refresh()
        {
            var s=source.Current;player.value=Mathf.Clamp01(s.PlayerHealth)*100;enemy.value=Mathf.Clamp01(s.EnemyHealth)*100;
            player.title=$"Your ship {player.value:0}%";enemy.title=$"Opponent {enemy.value:0}%";
            turn.text=$"Turn {s.Turn} · {Mathf.Max(0,s.Seconds):0}s";wind.text=$"Wind acceleration {s.WindAcceleration:0.0} m/s²";
            power.SetValueWithoutNotify(Mathf.Clamp01(s.Power));power.SetEnabled(s.CanFire&&!s.Finished);
            fire.SetEnabled(s.CanFire&&!s.Finished);ability.SetEnabled(s.CanUseAbility&&!s.Finished);
            result.text=s.Finished?(s.Won?"Victory":"Defeat")+"\n"+(s.RewardSummary??"Rewards awaiting validation"):"";
        }
        public void Dispose() {source.Changed-=Refresh;container.RemoveFromHierarchy();}
    }
}
