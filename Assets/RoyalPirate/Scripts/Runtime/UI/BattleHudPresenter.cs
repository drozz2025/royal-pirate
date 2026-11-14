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
        public readonly string RewardSummary,WindText,TurnText;
        public readonly bool Draw,AbilityArmed;
        public BattleHudState(float playerHealth,float enemyHealth,float seconds,float windAcceleration,float power,
            int turn,bool canFire,bool finished,bool won,bool canUseAbility,string rewardSummary,bool draw=false,string windText=null,string turnText=null,bool abilityArmed=false)
        { PlayerHealth=playerHealth;EnemyHealth=enemyHealth;Seconds=seconds;WindAcceleration=windAcceleration;Power=power;
          Turn=turn;CanFire=canFire;Finished=finished;Won=won;CanUseAbility=canUseAbility;RewardSummary=rewardSummary;Draw=draw;WindText=windText;TurnText=turnText;AbilityArmed=abilityArmed; }
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
        readonly VisualElement container,controls;
        readonly ProgressBar player,enemy;
        readonly Label turn,wind,result;
        readonly Slider power;
        readonly Button fire,ability;
        public BattleHudPresenter(VisualElement parent,IBattleHudSource source)
        {
            this.source=source;container=new VisualElement {name="battle-status"};container.AddToClassList("card");parent.Add(container);
            container.style.position=Position.Absolute;container.style.top=8;container.style.left=12;container.style.right=12;
            controls=new VisualElement {name="battle-controls"};controls.AddToClassList("card");parent.Add(controls);
            controls.style.position=Position.Absolute;controls.style.bottom=8;controls.style.left=12;controls.style.right=12;
            player=new ProgressBar {title="Your ship",lowValue=0,highValue=100};enemy=new ProgressBar{title="Opponent",lowValue=0,highValue=100};
            turn=new Label();wind=new Label();result=new Label();wind.style.whiteSpace=WhiteSpace.Normal;result.style.whiteSpace=WhiteSpace.Normal;power=new Slider("Power",0,1){name="battle-power"};
            fire=new Button(()=>source.RequestFire()){name="battle-fire",text="Fire"};fire.AddToClassList("primary");fire.AddToClassList("action");
            ability=new Button(()=>source.RequestAbility()){text="Ability"};ability.AddToClassList("action");
            foreach(var e in new VisualElement[]{player,enemy,turn,wind,result})container.Add(e);
            controls.Add(power);var row=new VisualElement();row.style.flexDirection=FlexDirection.Row;controls.Add(row);
            fire.style.flexGrow=1;ability.style.flexGrow=1;row.Add(fire);row.Add(ability);
            controls.Add(new Label("Drag the sea to aim"));
            power.RegisterValueChangedCallback(e=>source.SetPower(e.newValue));source.Changed+=Refresh;Refresh();
        }
        void Refresh()
        {
            var s=source.Current;player.value=Mathf.Clamp01(s.PlayerHealth)*100;enemy.value=Mathf.Clamp01(s.EnemyHealth)*100;
            player.title=$"Your ship {player.value:0}%";enemy.title=$"Opponent {enemy.value:0}%";
            turn.text=$"{s.TurnText??"Turn"} {s.Turn} · {Mathf.Max(0,s.Seconds):0}s";wind.text=s.WindText??$"Wind {s.WindAcceleration:0.0} m/s²";
            ability.text=s.AbilityArmed?"Boost armed":"Boost +50%";
            power.SetValueWithoutNotify(Mathf.Clamp01(s.Power));power.SetEnabled(s.CanFire&&!s.Finished);
            fire.SetEnabled(s.CanFire&&!s.Finished);ability.SetEnabled(s.CanUseAbility&&!s.Finished);
            result.text=s.Finished?(s.Draw?"Draw":s.Won?"Victory":"Defeat")+"\n"+(s.RewardSummary??"Rewards awaiting validation"):"";
        }
        public void Dispose() {source.Changed-=Refresh;container.RemoveFromHierarchy();controls.RemoveFromHierarchy();}
    }
}
