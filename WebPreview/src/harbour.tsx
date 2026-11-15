import React from 'react';
import { PirateIcon } from './app-icons';
import type { AppScreenId } from './app-screens';
import { canClaimDaily, levelFor, missionProgress, MISSIONS, nextDailyStreak, type LocalProfile } from './progression';

/** Live Three.js harbour with navigable app-first menus.
 * Coins are the strictly local earned balance; unsupported gems/rankings remain blank.
 */
const upcoming:ReadonlyArray<{icon:string;title:string;screen:AppScreenId}> = [
  { icon: '▣', title: 'SHOP', screen:'shop' },
  { icon: '♠', title: 'CARDS', screen:'cards' },
  { icon: '⚓', title: 'SHIP', screen:'fleet' },
  { icon: '✦', title: 'MISSIONS', screen:'missions' },
  { icon: '♜', title: 'RANKING', screen:'profile' },
];
export function Harbour({ onBattle, onInspect, onNavigate, profile, hidden=false }: { onBattle: () => void; onInspect: () => void; onNavigate:(screen:AppScreenId)=>void;profile:LocalProfile;hidden?:boolean }) {
  const now=Date.now();
  const dailyAvailable=canClaimDaily(profile,now);
  const nextDay=nextDailyStreak(profile,now);
  const displayedStreak=dailyAvailable&&nextDay===1?0:profile.dailyStreak;
  const dailyPrize=15+nextDay*5;
  const readyMissions=MISSIONS.filter(m=>missionProgress(profile,m.id)>=m.target&&!profile.claimedMissions.includes(m.id)).length;
  return <section className="harbour-screen" aria-label="Royal Pirate harbour" aria-hidden={hidden} inert={hidden}>
    <div className="harbour-sky" aria-hidden="true" />
    <header className="harbour-header">
      <button type="button" className="harbour-profile" onClick={()=>onNavigate('profile')} aria-label="Open local captain profile">
        <span className="harbour-avatar" aria-hidden="true">☠</span>
        <div><strong>CAPTAIN · LEVEL {levelFor(profile.xp)}</strong><span>ROYAL CROWN</span><small>LOCAL OFFLINE PROFILE</small></div>
      </button>
      <div className="harbour-resources" aria-label="Local coins and unimplemented resource counters">
        <div><span aria-hidden="true">◆</span><strong>—</strong></div>
        <div aria-label={profile.coins+' locally earned coins'}><span aria-hidden="true">●</span><strong>{profile.coins}</strong></div>
        <div><span aria-hidden="true">▰</span><strong>—</strong></div>
      </div>
    </header>
    <section className="harbour-arena" aria-label="Training waters">
      <span className="harbour-arena-crest" aria-hidden="true">⚔</span>
      <div className="harbour-arena-body">
        <div className="harbour-arena-title"><strong>TRAINING WATERS</strong><span>ARENA 01</span></div>
        <div className="harbour-arena-track" aria-hidden="true"><span/></div>
        <small>THE FIRST BROADSIDE · PLAYABLE PREVIEW</small>
      </div>
      <span className="harbour-arena-cup" aria-hidden="true">★</span>
    </section>
    <div className="harbour-central">
      <div className="harbour-side harbour-side-left" aria-label="Upcoming rewards">
        <button type="button" onClick={()=>onNavigate('missions')} className={'harbour-side-tile '+(dailyAvailable?'harbour-reward-ready':'')} aria-label={dailyAvailable?`Daily supply ready: ${dailyPrize} coins`:'Daily supply already collected today'}><span aria-hidden="true">🎁</span><strong>SUPPLY</strong><small>{dailyAvailable?'CLAIM':'COLLECTED'}</small></button>
        <button type="button" onClick={()=>onNavigate('missions')} className="harbour-side-tile" aria-label={`Daily reward calendar, day ${nextDay} of 7`}><span aria-hidden="true">☷</span><strong>DAILY</strong><small>DAY {nextDay}/7</small></button>
      </div>
      <div className="harbour-side harbour-side-right" aria-label="Upcoming crew and specials">
        <button type="button" onClick={()=>onNavigate('cards')} className="harbour-side-tile harbour-character"><span aria-hidden="true">☠</span><strong>CREW</strong><small>OPEN</small></button>
        <button type="button" onClick={()=>onNavigate('missions')} className="harbour-side-tile" aria-label={readyMissions?`${readyMissions} missions ready to claim`:'Open missions'}><span aria-hidden="true">✦</span><strong>MISSIONS</strong><small>{readyMissions?readyMissions+' READY':'OPEN'}</small></button>
      </div>
      <div className="harbour-ship-label">
        <span aria-hidden="true">⚓</span><strong>THE ROYAL CROWN</strong><small>YOUR FIRST SHIP · LIVE 3D</small><button className="harbour-inspect-button" type="button" onClick={onInspect} aria-label="Inspect your ship in interactive 3D">VIEW SHIP IN 3D</button>
      </div>
    </div>
    <div className="harbour-lower">
      <section className="harbour-chests harbour-daily-route" aria-label="Seven-day daily supply route">
        <div className="harbour-chest-header"><strong>DAILY SUPPLY ROUTE</strong><small>{dailyAvailable?'READY TO CLAIM':'COLLECTED TODAY'}</small></div>
        <button type="button" className="harbour-daily-button" onClick={()=>onNavigate('missions')} aria-label={dailyAvailable?`Open daily supply, claim ${dailyPrize} local coins`:'Open daily supply calendar'}>
          <span className="harbour-daily-days">{Array.from({length:7},(_,n)=>n+1).map(n=><span key={n} className={n<=displayedStreak?'earned':dailyAvailable&&n===nextDay?'next':''} aria-label={`Day ${n}, ${n<=displayedStreak?'streak earned':dailyAvailable&&n===nextDay?'ready':'upcoming'}`}><b>{n<=displayedStreak?'✓':n}</b></span>)}</span>
          <span className="harbour-daily-summary">{dailyAvailable?`+ ${dailyPrize} COINS · CLAIM IN MISSIONS`:`STREAK ${displayedStreak}/7 · RESET 00:00 UTC`}</span>
        </button>
      </section>
      <div className="harbour-actions">
        <button type="button" className="harbour-secondary-action" onClick={()=>onNavigate('forge')}><span aria-hidden="true"><PirateIcon name="forge" size={27}/></span><strong>UPGRADES</strong><small>OPEN</small></button>
        <button className="harbour-battle-button" type="button" onClick={onBattle} aria-label="Battle: enter playable naval combat"><span className="harbour-crossed" aria-hidden="true"><PirateIcon name="battle" size={40}/></span><strong>BATTLE!</strong><small>ENTER NAVAL COMBAT</small></button>
        <button type="button" className="harbour-secondary-action" onClick={()=>onNavigate('forge')}><span aria-hidden="true"><PirateIcon name="forge" size={27}/></span><strong>FORGE</strong><small>OPEN</small></button>
      </div>
      <nav className="harbour-nav" aria-label="Game screens">
        {upcoming.map((item,i)=><button type="button" key={item.title} onClick={()=>onNavigate(item.screen)} className={'harbour-nav-item '+(i===2?'harbour-nav-current':'')} aria-label={item.screen==='missions'&&readyMissions?`Missions: ${readyMissions} reward claims ready`:item.title}><span aria-hidden="true"><PirateIcon name={item.screen} size={25}/></span><strong>{item.title}</strong><small>{item.screen==='missions'&&readyMissions?readyMissions+' READY':'OPEN'}</small></button>)}
      </nav>
      <p className="harbour-disclaimer">LOCAL PREVIEW · COINS & MISSIONS SAVED ON THIS DEVICE · ONLINE RANKING & IAP NOT LIVE</p>
    </div>
  </section>;
}
