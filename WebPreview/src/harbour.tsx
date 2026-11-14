import React from 'react';

/** Harbour previews the approved pirate-game hierarchy with an actual Three.js ship
 * behind it. Only BATTLE navigates today; never imply purchases, earned chests,
 * rankings or currency balances exist before the corresponding systems ship.
 */
const upcoming = [
  { icon: '▣', title: 'SHOP' },
  { icon: '♠', title: 'CARDS' },
  { icon: '⚓', title: 'SHIP' },
  { icon: '✦', title: 'MISSIONS' },
  { icon: '🏆', title: 'RANKING' },
];
export function Harbour({ onBattle }: { onBattle: () => void }) {
  return <section className="harbour-screen" aria-label="Royal Pirate harbour">
    <div className="harbour-sky" aria-hidden="true" />
    <header className="harbour-header">
      <div className="harbour-profile">
        <span className="harbour-avatar" aria-hidden="true">☠</span>
        <div><strong>CAPTAIN</strong><span>ROYAL CROWN</span><small>FIRST VOYAGE · LEVEL 1 PREVIEW</small></div>
      </div>
      <div className="harbour-resources" aria-label="Resource counters coming soon">
        <div><span aria-hidden="true">◆</span><strong>—</strong></div>
        <div><span aria-hidden="true">●</span><strong>—</strong></div>
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
        <div className="harbour-side-tile"><span aria-hidden="true">🎁</span><strong>REWARDS</strong><small>SOON</small></div>
        <div className="harbour-side-tile"><span aria-hidden="true">☷</span><strong>DAILY</strong><small>SOON</small></div>
      </div>
      <div className="harbour-side harbour-side-right" aria-label="Upcoming crew and specials">
        <div className="harbour-side-tile harbour-character"><span aria-hidden="true">☠</span><strong>CREW</strong><small>SOON</small></div>
        <div className="harbour-side-tile"><span aria-hidden="true">✦</span><strong>SPECIAL</strong><small>SOON</small></div>
      </div>
      <div className="harbour-ship-label">
        <span aria-hidden="true">⚓</span><strong>THE ROYAL CROWN</strong><small>YOUR FIRST SHIP · LIVE 3D</small>
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
        <div className="harbour-secondary-action" aria-disabled="true"><span aria-hidden="true">⚒</span><strong>UPGRADES</strong><small>SOON</small></div>
        <button className="harbour-battle-button" type="button" onClick={onBattle} aria-label="Battle: enter playable naval combat"><span className="harbour-crossed" aria-hidden="true">⚔</span><strong>BATTLE!</strong><small>ENTER NAVAL COMBAT</small></button>
        <div className="harbour-secondary-action" aria-disabled="true"><span aria-hidden="true">⚙</span><strong>FORGE</strong><small>SOON</small></div>
      </div>
      <nav className="harbour-nav" aria-label="Upcoming game features">
        {upcoming.map((item,i)=><span key={item.title} className={'harbour-nav-item '+(i===2?'harbour-nav-current':'')} aria-disabled="true"><span aria-hidden="true">{item.icon}</span><strong>{item.title}</strong><small>{i===2?'PREVIEW':'SOON'}</small></span>)}
      </nav>
      <p className="harbour-disclaimer">BROWSER DEMO · Rewards, currency, purchases and ranking not yet enabled</p>
    </div>
  </section>;
}
