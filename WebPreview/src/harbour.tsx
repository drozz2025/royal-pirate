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
      <h1 className="harbour-logo" aria-label="ROYAL PIRATE">
        <svg className="harbour-logo-crest" viewBox="0 0 260 132" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="portoCrestRim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff4bb"/><stop offset=".18" stopColor="#efc36e"/>
              <stop offset=".48" stopColor="#b7732a"/><stop offset=".72" stopColor="#f7c86b"/>
              <stop offset="1" stopColor="#6c391d"/>
            </linearGradient>
            <linearGradient id="portoCrestNavy" x1="0" y1="0" x2=".75" y2="1">
              <stop offset="0" stopColor="#3a7095"/><stop offset=".23" stopColor="#1c466f"/>
              <stop offset=".64" stopColor="#0b244a"/><stop offset="1" stopColor="#091c3a"/>
            </linearGradient>
            <linearGradient id="portoCrestLetter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fffbd3"/><stop offset=".28" stopColor="#ffe49a"/>
              <stop offset=".54" stopColor="#e3a84b"/><stop offset=".8" stopColor="#fbd781"/>
              <stop offset="1" stopColor="#8a4b26"/>
            </linearGradient>
            <linearGradient id="portoCrestCrown" x1="0" y1="0" x2=".8" y2="1">
              <stop offset="0" stopColor="#fff8c7"/><stop offset=".43" stopColor="#f9cd58"/>
              <stop offset="1" stopColor="#a3601e"/>
            </linearGradient>
          </defs>
          <path d="M23 24 237 24 251 41 251 105 230 123 30 123 9 105 9 41Z" fill="#261c20" stroke="#56311c" strokeWidth="4"/>
          <path d="M24 24 236 24 251 41 251 102 231 120 29 120 9 102 9 41Z" fill="url(#portoCrestRim)" stroke="#ffe4a1" strokeWidth="2.5"/>
          <path d="M28 29 232 29 243 43 243 99 227 113 33 113 17 99 17 43Z" fill="url(#portoCrestNavy)" stroke="#603619" strokeWidth="4"/>
          <path d="M32 33 228 33 239 45 239 96 224 108 36 108 21 96 21 45Z" fill="none" stroke="#d8a65d" strokeWidth="1.5" opacity=".92"/>
          <path d="M24 44q107-21 212-4" fill="none" stroke="#a5dafa" strokeWidth="2" opacity=".2"/>
          <path d="M39 108h182" stroke="#fbd68b" strokeWidth="2.3" opacity=".65"/>
          <path d="M49 117h162" stroke="#8b441d" strokeWidth="2.2"/>
          <path d="M103 21 99 7l14 8 16-13 17 13 14-8-4 14Z" fill="url(#portoCrestCrown)" stroke="#804115" strokeWidth="2.5"/>
          <path d="M102 21h55v7h-55z" fill="url(#portoCrestCrown)" stroke="#804115" strokeWidth="2"/>
          <path d="m99 7 14 8 16-13 17 13 14-8" fill="none" stroke="#fff8ce" strokeWidth="1.6"/>
          <circle cx="130" cy="22" r="3.4" fill="#d7413e" stroke="#ffedb5" strokeWidth="1.3"/>
          <circle cx="113" cy="23" r="2.1" fill="#339bc1"/><circle cx="147" cy="23" r="2.1" fill="#339bc1"/>
          <path d="M31 48h19m160 0h19M31 94h13m172 0h13" stroke="#e2b865" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
          <circle cx="28" cy="71" r="2.5" fill="#fff0b2"/><circle cx="232" cy="71" r="2.5" fill="#fff0b2"/>
          <text x="130" y="70" textAnchor="middle" textLength="188" lengthAdjust="spacingAndGlyphs"
            fontFamily="Georgia, 'Times New Roman', serif" fontWeight="900" fontSize="46" stroke="#53290f"
            strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" fill="url(#portoCrestLetter)">ROYAL</text>
          <text x="130" y="105" textAnchor="middle" textLength="193" lengthAdjust="spacingAndGlyphs"
            fontFamily="Georgia, 'Times New Roman', serif" fontWeight="900" fontSize="45" stroke="#53290f"
            strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" fill="url(#portoCrestLetter)">PIRATE</text>
        </svg>
      </h1>
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
