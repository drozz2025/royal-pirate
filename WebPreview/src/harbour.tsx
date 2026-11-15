import React from 'react';
import { PirateIcon } from './app-icons';
import type { AppScreenId } from './app-screens';
import { canClaimDaily, levelFor, missionProgress, MISSIONS, nextDailyStreak, type LocalProfile } from './progression';

/** Live Three.js harbour with navigable app-first menus.
 * All displayed resource amounts and milestones come from the local battle profile.
 */
const upcoming:ReadonlyArray<{icon:string;title:string;screen:AppScreenId}> = [
  { icon: '▣', title: 'SHOP', screen:'shop' },
  { icon: '♠', title: 'CARDS', screen:'cards' },
  { icon: '⚓', title: 'FLEET', screen:'fleet' },
  { icon: '✦', title: 'MISSIONS', screen:'missions' },
  { icon: '♜', title: 'PROFILE', screen:'profile' },
];
export function Harbour({ onBattle, onNavigate, profile, selected=false, hidden=false }: { onBattle: () => void; onNavigate:(screen:AppScreenId)=>void;profile:LocalProfile;selected?:boolean;hidden?:boolean }) {
  const now=Date.now();
  const dailyAvailable=canClaimDaily(profile,now);
  const nextDay=nextDailyStreak(profile,now);
  const dailyPrize=15+nextDay*5;
  const readyMissions=MISSIONS.filter(m=>missionProgress(profile,m.id)>=m.target&&!profile.claimedMissions.includes(m.id)).length;
  const milestoneWins=Math.min(profile.wins,10);
  return <section className="harbour-screen" aria-label="Royal Pirate harbour" aria-hidden={hidden} inert={hidden}>
    <div className="harbour-sky" aria-hidden="true" />
    <header className="harbour-header">
      <button type="button" className="harbour-profile" onClick={()=>onNavigate('profile')} aria-label="Open local captain profile">
        <span className="harbour-avatar" aria-hidden="true">☠</span>
        <div><strong>CAPTAIN · LEVEL {levelFor(profile.xp)}</strong><span>ROYAL CROWN</span><small>LOCAL OFFLINE PROFILE</small></div>
      </button>
      <div className="harbour-resources" role="group" aria-label="Local captain statistics">
        <div className="harbour-stat" aria-label={profile.coins+' locally earned coins'}><span className="harbour-stat-glyph" aria-hidden="true">●</span><strong>{profile.coins}</strong><small>COINS</small></div>
        <div className="harbour-stat" aria-label={profile.wins+' victories from real battles'}><span className="harbour-stat-glyph" aria-hidden="true">★</span><strong>{profile.wins}</strong><small>WINS</small></div>
      </div>
    </header>
    <section className="harbour-arena" aria-label="Training waters">
      <span className="harbour-arena-crest" aria-hidden="true"><PirateIcon name="battle" size={32}/></span>
      <div className="harbour-arena-body">
        <div className="harbour-arena-title"><strong>TRAINING WATERS</strong><span>ARENA 01</span></div>
        <div className="harbour-arena-track" role="progressbar" aria-label="Victories towards ten-win milestone" aria-valuemin={0} aria-valuemax={10} aria-valuenow={milestoneWins}><span style={{width:`${milestoneWins*10}%`}}/></div>
        <small>{profile.wins} VICTORIES · LOCAL 10-WIN MILESTONE</small>
      </div>
      <span className="harbour-arena-cup" aria-hidden="true">★</span>
    </section>
    <div className="harbour-central">
    </div>
    <div className="harbour-lower">
      <div className="harbour-actions">
        <button type="button" className="harbour-secondary-action" onClick={()=>onNavigate('forge')}><span aria-hidden="true"><PirateIcon name="forge" size={27}/></span><strong>FORGE</strong><small>UPGRADES</small></button>
        <button className="harbour-battle-button" type="button" onClick={onBattle} aria-label="Battle: enter playable naval combat"><span className="harbour-crossed" aria-hidden="true"><PirateIcon name="battle" size={40}/></span><strong>BATTLE!</strong><small>ENTER NAVAL COMBAT</small></button>
        <button type="button" className={'harbour-secondary-action harbour-compact-daily '+(dailyAvailable?'harbour-reward-ready':'')} onClick={()=>onNavigate('missions')} aria-label={dailyAvailable?`Daily supply ready: claim ${dailyPrize} local coins in Missions`:`Daily supply collected today, streak ${profile.dailyStreak} of 7. Open calendar in Missions`}>
          <span aria-hidden="true">🎁</span><strong>DAILY</strong><small>{dailyAvailable?`DAY ${nextDay} · CLAIM`:`✓ ${profile.dailyStreak}/7`}</small>
        </button>
      </div>
      <nav className="harbour-nav" aria-label="Game screens">
        {upcoming.map((item,i)=><button type="button" key={item.title} onClick={()=>onNavigate(item.screen)} className={'harbour-nav-item '+(i===2?'harbour-nav-current':'')} aria-label={item.screen==='missions'&&readyMissions?`Missions: ${readyMissions} reward claims ready`:item.title}><span aria-hidden="true"><PirateIcon name={item.screen} size={25}/></span><strong>{item.title}</strong><small>{item.screen==='missions'&&readyMissions?readyMissions+' READY':'OPEN'}</small></button>)}
      </nav>
      <p className="harbour-disclaimer">LOCAL PREVIEW · COINS & MISSIONS SAVED ON THIS DEVICE · ONLINE RANKING & IAP NOT LIVE</p>
    </div>
  </section>;
}
