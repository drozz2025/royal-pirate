import React from 'react';
import { PirateIcon, type PirateIconName } from './app-icons';
import { PortoArt } from './porto-art';
import type { AppScreenId } from './app-screens';
import { canClaimDaily, CREW, levelFor, missionProgress, MISSIONS, nextDailyStreak, UPGRADES, upgradeCost, type LocalProfile } from './progression';

/** Approved Porto 1:1 screen composition, rendered as real controls over the interactive 3D scene.
 * No image of the reference screen is used as a background: the ship remains live geometry.
 * Currency, level, daily claims and achievement notices are derived from saved local results.
 */
type PortAction = { title:string;icon:PirateIconName;screen:AppScreenId;label:string };
const leftActions:ReadonlyArray<PortAction> = [
  {title:'ARENA',icon:'arena',screen:'battle',label:'Enter the training arena briefing'},
  {title:'BAÚS',icon:'chests',screen:'chests',label:'View the daily supply chest'},
  {title:'EVENTOS',icon:'events',screen:'events',label:'View event availability'},
];
const rightActions:ReadonlyArray<PortAction> = [
  {title:'RECOMPENSAS',icon:'rewards',screen:'rewards',label:'View earned local rewards'},
  {title:'MISSÕES',icon:'missions',screen:'missions',label:'View local missions'},
  {title:'OFERTAS',icon:'offers',screen:'offers',label:'View offer availability'},
];
const nav:ReadonlyArray<{title:string;icon:PirateIconName;screen:AppScreenId|null}> = [
  {title:'PORTO',icon:'port',screen:null},
  {title:'FROTA',icon:'fleet',screen:'fleet'},
  {title:'CARTAS',icon:'cards',screen:'cards'},
  {title:'LOJA',icon:'shop',screen:'shop'},
  {title:'RANKING',icon:'ranking',screen:'ranking'},
];

export function Harbour({ onBattle, onNavigate, profile, selected=false, hidden=false }: {
  onBattle:()=>void;onNavigate:(screen:AppScreenId)=>void;profile:LocalProfile;selected?:boolean;hidden?:boolean
}) {
  const now=Date.now(),dailyAvailable=canClaimDaily(profile,now),day=nextDailyStreak(profile,now);
  const dailyCoins=15+day*5;
  const readyMissions=MISSIONS.filter(m=>missionProgress(profile,m.id)>=m.target&&!profile.claimedMissions.includes(m.id)).length;
  const level=levelFor(profile.xp);
  const levelStart=80*(level-1)*(level-1),levelEnd=80*level*level;
  const xpPercent=level>=20?100:Math.min(100,Math.max(0,Math.round(100*(profile.xp-levelStart)/(levelEnd-levelStart))));
  const coins=new Intl.NumberFormat('pt-PT').format(profile.coins);
  // Only show action dots when this saved local profile can actually use them.
  // The reference mock-up contains shop/gem notifications, but no such economy exists yet.
  const fleetUpgradeReady=UPGRADES.some(u=>profile.upgrades[u.id]<5&&profile.coins>=upgradeCost(u.id,profile.upgrades[u.id]));
  const crewCardReady=CREW.some(c=>!profile.ownedCrew.includes(c.id)&&c.cost>0&&profile.coins>=c.cost);
  const onAction=(screen:AppScreenId)=>onNavigate(screen);
  const side=(items:ReadonlyArray<PortAction>,sideName:string)=>(
    <nav className={'harbour-flank harbour-flank-'+sideName} aria-label={sideName==='left'?'Arena, chests and events':'Rewards, missions and offers'}>
      {items.map(item=>{
        const ready=item.screen==='chests'&&dailyAvailable||item.screen==='rewards'&&(dailyAvailable||readyMissions>0)||item.screen==='missions'&&readyMissions>0;
        const label=item.screen==='chests'
          ?(dailyAvailable?'Daily supply ready: claim '+dailyCoins+' local coins in Missions':'Daily supply collected today, streak '+profile.dailyStreak+' of 7')
          :item.screen==='missions'&&readyMissions?'Missions: '+readyMissions+' reward claims ready':item.label;
        return <button type="button" key={item.screen} className={'harbour-flank-button'+(ready?' is-ready':'')} onClick={()=>onAction(item.screen)} aria-label={label}>
          <span className="harbour-flank-icon" aria-hidden="true"><PortoArt name={item.icon} size={48}/></span>
          <strong>{item.title}</strong>
          {item.screen==='battle'&&<small className="harbour-training-mode">TREINO LOCAL</small>}
          {item.screen==='battle'&&<small className="harbour-local-wins" aria-label={profile.wins+' local battle victories'}>★ {profile.wins} VITÓRIAS</small>}
          {ready&&<span className="harbour-alert" aria-hidden="true">!</span>}
        </button>;
      })}
    </nav>
  );
  return <section className="harbour-screen" aria-label="Royal Pirate Porto" aria-hidden={hidden} inert={hidden}>
    <div className="harbour-sky" aria-hidden="true"/>
    <header className="harbour-header">
      <button type="button" className="harbour-profile" onClick={()=>onAction('profile')} aria-label={'Captain profile, level '+level+', local progress'}>
        <span className="harbour-avatar" aria-hidden="true"><PirateIcon name="profile" size={36}/></span>
        <span className="harbour-level">
          <strong>NV. {level}</strong>
          <span className="harbour-level-track" role="progressbar" aria-label="Captain level experience" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpPercent}><span style={{width:xpPercent+'%'}}/></span>
        </span>
      </button>
      <h1 className="harbour-logo"><span className="harbour-logo-crown" aria-hidden="true">♛</span><span>ROYAL</span><b>PIRATE</b></h1>
      <div className="harbour-wallet" role="group" aria-label="Local captain statistics">
        <div className="harbour-resources">
          <span className="harbour-stat" aria-label={profile.coins+' locally earned coins'}><span className="harbour-stat-glyph" aria-hidden="true">●</span><strong>{coins}</strong></span>
          <span className="harbour-stat" aria-label={profile.wins+' victories from real battles'}><span className="harbour-stat-glyph" aria-hidden="true"><PirateIcon name="ranking" size={20}/></span><strong>{profile.wins}</strong></span>
        </div>
        <button type="button" className="harbour-settings" onClick={()=>onAction('profile')} aria-label="Captain profile and local settings"><PirateIcon name="settings" size={27}/></button>
      </div>
    </header>
    <div className="harbour-central" aria-hidden="true"/>
    {side(leftActions,'left')}
    {side(rightActions,'right')}
    <button type="button" className="harbour-battle-button" onClick={onBattle} aria-label="Batalha: iniciar combate naval jogável">
      <span className="harbour-crossed" aria-hidden="true"><PortoArt name="battle" size={52}/></span><strong>BATALHA!</strong>
    </button>
    <nav className="harbour-nav" aria-label="Main game navigation">
      {nav.map(item=>{
        const actionable=item.screen==='fleet'?fleetUpgradeReady:item.screen==='cards'?crewCardReady:false;
        return <button type="button" key={item.title}
          className={'harbour-nav-item'+(item.screen===null?' harbour-nav-current':'')}
          disabled={item.screen===null} aria-current={item.screen===null?'page':undefined}
          onClick={item.screen?()=>onAction(item.screen!):undefined}
          aria-label={item.screen===null?'Porto, current screen':item.title+(actionable?', melhoria disponível':'')}>
          <span className="harbour-nav-icon" aria-hidden="true"><PortoArt name={item.icon} size={42}/></span>
          <strong>{item.title}</strong>
          {actionable&&<span className="harbour-nav-alert" aria-hidden="true">!</span>}
        </button>;
      })}
    </nav>
    <span className="harbour-sr-only" role="status">{selected?'3D ship selected. Drag directly on the ship to rotate, pinch to zoom.':''} Local offline preview. Online rankings and purchases are not available.</span>
  </section>;
}
