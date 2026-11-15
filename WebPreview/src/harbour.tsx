import React from 'react';
import type { AppScreenId } from './app-screens';

/** Harbour previews the approved pirate-game hierarchy with an actual Three.js ship
 * behind it. Only BATTLE navigates today; never imply purchases, earned chests,
 * rankings or currency balances exist before the corresponding systems ship.
 */
const upcoming:ReadonlyArray<{icon:string;title:string;screen:AppScreenId}> = [
  { icon: '▣', title: 'SHOP', screen:'shop' },
  { icon: '♠', title: 'CARDS', screen:'cards' },
  { icon: '⚓', title: 'SHIP', screen:'fleet' },
  { icon: '✦', title: 'MISSIONS', screen:'missions' },
  { icon: '♜', title: 'RANKING', screen:'profile' },
];
export function Harbour({ onBattle, onInspect, onNavigate, coins }: { onBattle: () => void; onInspect: () => void; onNavigate:(screen:AppScreenId)=>void;coins:number }) {
  return <section className="harbour-screen" aria-label="Royal Pirate harbour">
    <div className="harbour-sky" aria-hidden="true" />
    <header className="harbour-header">
      <button type="button" className="harbour-profile" onClick={()=>onNavigate('profile')} aria-label="Open local captain profile">
        <span className="harbour-avatar" aria-hidden="true">☠</span>
        <div><strong>CAPTAIN</strong><span>ROYAL CROWN</span><small>LOCAL OFFLINE PROFILE</small></div>
      </button>
      <div className="harbour-resources" aria-label="Local coins and unimplemented resource counters">
        <div><span aria-hidden="true">◆</span><strong>—</strong></div>
        <div><span aria-hidden="true">●</span><strong>{coins}</strong></div>
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
        <button type="button" onClick={()=>onNavigate('missions')} className="harbour-side-tile"><span aria-hidden="true">🎁</span><strong>REWARDS</strong><small>OPEN</small></button>
        <button type="button" onClick={()=>onNavigate('missions')} className="harbour-side-tile"><span aria-hidden="true">☷</span><strong>DAILY</strong><small>OPEN</small></button>
      </div>
      <div className="harbour-side harbour-side-right" aria-label="Upcoming crew and specials">
        <button type="button" onClick={()=>onNavigate('cards')} className="harbour-side-tile harbour-character"><span aria-hidden="true">☠</span><strong>CREW</strong><small>OPEN</small></button>
        <button type="button" onClick={()=>onNavigate('missions')} className="harbour-side-tile"><span aria-hidden="true">✦</span><strong>MISSIONS</strong><small>OPEN</small></button>
      </div>
      <div className="harbour-ship-label">
        <span aria-hidden="true">⚓</span><strong>THE ROYAL CROWN</strong><small>YOUR FIRST SHIP · LIVE 3D</small><button className="harbour-inspect-button" type="button" onClick={onInspect} aria-label="Inspect your ship in interactive 3D">VIEW SHIP IN 3D</button>
      </div>
    </div>
    <div className="harbour-lower">
      <section className="harbour-chests" aria-label="Upcoming daily chests">
        <div className="harbour-chest-header"><strong>DAILY CHESTS</strong><small>COMING SOON</small></div>
        <div className="harbour-chest-row" aria-disabled="true">
          {[0,1,2,3].map((i)=><div className={'harbour-chest harbour-chest-'+i} key={i} aria-label={'Chest '+(i+1)+' coming soon'}><span aria-hidden="true">▣</span><small>LOCKED</small></div>)}
        </div>
      </section>
      <div className="harbour-actions">
        <button type="button" className="harbour-secondary-action" onClick={()=>onNavigate('forge')}><span aria-hidden="true">⚒</span><strong>UPGRADES</strong><small>OPEN</small></button>
        <button className="harbour-battle-button" type="button" onClick={onBattle} aria-label="Battle: enter playable naval combat"><span className="harbour-crossed" aria-hidden="true">⚔</span><strong>BATTLE!</strong><small>ENTER NAVAL COMBAT</small></button>
        <button type="button" className="harbour-secondary-action" onClick={()=>onNavigate('forge')}><span aria-hidden="true">⚙</span><strong>FORGE</strong><small>OPEN</small></button>
      </div>
      <nav className="harbour-nav" aria-label="Game screens">
        {upcoming.map((item,i)=><button type="button" key={item.title} onClick={()=>onNavigate(item.screen)} className={'harbour-nav-item '+(i===2?'harbour-nav-current':'')}><span aria-hidden="true">{item.icon}</span><strong>{item.title}</strong><small>OPEN</small></button>)}
      </nav>
      <p className="harbour-disclaimer">LOCAL PREVIEW · COINS & MISSIONS SAVED ON THIS DEVICE · ONLINE RANKING & PAYMENTS NOT LIVE</p>
    </div>
  </section>;
}
