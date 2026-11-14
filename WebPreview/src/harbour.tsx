import React from 'react';

/** The harbour is the first real navigation screen. All unimplemented destinations
 * are labelled as future content rather than pretending to grant rewards/currency.
 */
export function Harbour({ onBattle }: { onBattle: () => void }) {
  return <section className="harbour-screen" aria-label="Royal Pirate harbour">
    <div className="harbour-sky" aria-hidden="true" />
    <header className="harbour-header">
      <div className="harbour-profile"><span className="harbour-avatar" aria-hidden="true">☠</span><div><strong>ROYAL PIRATE</strong><small>CAPTAIN'S HARBOUR</small></div></div>
      <span className="harbour-preview">PREVIEW · NO PURCHASES</span>
    </header>
    <div className="harbour-intro">
      <span className="harbour-kicker">THE SHATTERED ISLES</span>
      <h1>Command your<br/><em>legend.</em></h1>
      <p>Your ship is ready. Take the helm and challenge the Crimson Tide.</p>
    </div>
    <div className="harbour-center" aria-hidden="true"><span className="harbour-ribbon">THE ROYAL CROWN</span><span className="harbour-wheel">✺</span></div>
    <section className="harbour-panel" aria-label="Harbour actions">
      <p className="harbour-panel-title">YOUR FIRST VOYAGE <span>01 / FIRST ENCOUNTER</span></p>
      <button className="harbour-battle-button" type="button" onClick={onBattle}><span aria-hidden="true">⚔</span><strong>BATTLE!</strong><small>SET SAIL · LIVE COMBAT</small></button>
      <div className="harbour-future" aria-label="Upcoming features">
        <div className="harbour-future-tile"><span aria-hidden="true">⚒</span><strong>UPGRADES</strong><small>COMING SOON</small></div>
        <div className="harbour-future-tile"><span aria-hidden="true">▣</span><strong>CHESTS</strong><small>COMING SOON</small></div>
        <div className="harbour-future-tile"><span aria-hidden="true">♜</span><strong>SHIPYARD</strong><small>COMING SOON</small></div>
      </div>
      <p className="harbour-disclaimer">Playable browser preview · Store, rankings and rewards are not yet available.</p>
    </section>
  </section>;
}
