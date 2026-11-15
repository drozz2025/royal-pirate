import React from 'react';
import { CREW, MISSIONS, UPGRADES, battlesPlayed, canClaimDaily, levelFor, missionProgress, upgradeCost, type CrewId, type LocalProfile, type MissionId, type UpgradeId } from './progression';

export type AppScreenId = 'battle'|'fleet'|'forge'|'cards'|'shop'|'missions'|'profile';
const PAGES:ReadonlyArray<{id:AppScreenId;title:string;symbol:string}>=[
  {id:'battle',title:'Battle',symbol:'⚔'},{id:'fleet',title:'Fleet',symbol:'⚓'},
  {id:'forge',title:'Forge',symbol:'⚒'},{id:'cards',title:'Crew',symbol:'♛'},
  {id:'shop',title:'Shop',symbol:'◆'},{id:'missions',title:'Missions',symbol:'✦'},
  {id:'profile',title:'Profile',symbol:'♜'}
];
const mainNav:AppScreenId[]=['fleet','cards','battle','shop','profile'];
export function AppScreens({screen,profile,onNavigate,onClose,onBattle,onInspect,onBuyCrew,onEquipCrew,onUpgrade,onMission,onDaily}:
  {screen:AppScreenId;profile:LocalProfile;onNavigate:(screen:AppScreenId)=>void;onClose:()=>void;onBattle:()=>void;onInspect:()=>void;
   onBuyCrew:(id:CrewId)=>void;onEquipCrew:(id:CrewId)=>void;onUpgrade:(id:UpgradeId)=>void;onMission:(id:MissionId)=>void;onDaily:()=>void}) {
  const page=PAGES.find(p=>p.id===screen)!;
  const day=canClaimDaily(profile,Date.now());
  return <section className="app-sheet" role="dialog" aria-modal="false" aria-labelledby="app-screen-title">
    <header className="app-sheet-header">
      <button type="button" className="app-back" onClick={onClose} aria-label="Back to harbour">‹</button>
      <div className="app-sheet-brand"><small>ROYAL PIRATE · LOCAL PREVIEW</small><h1 id="app-screen-title"><span aria-hidden="true">{page.symbol}</span> {page.title}</h1></div>
      <div className="app-wallet" aria-label={profile.coins+' locally earned coins'}><span aria-hidden="true">●</span><strong>{profile.coins}</strong><small>COINS</small></div>
    </header>
    <nav className="app-shortcuts" aria-label="Other screens">
      {PAGES.filter(p=>!mainNav.includes(p.id)).map(p=><button type="button" key={p.id} onClick={()=>onNavigate(p.id)} aria-current={screen===p.id?'page':undefined}>{p.symbol} {p.title}</button>)}
    </nav>
    <div className="app-sheet-content" key={screen}>
      {screen==='battle'&&<div className="app-intro">
        <span className="app-crest" aria-hidden="true">⚔</span><div className="app-kicker">ARENA 01 · TRAINING WATERS</div>
        <h2>The First Broadside</h2><p>Your ship against the computer-controlled Crimson Tide. The existing 3D battle uses real trajectory, damage and turns.</p>
        <div className="app-versus"><div><strong>⚓</strong><b>ROYAL CROWN</b><small>YOUR SHIP</small></div><span>VS</span><div><strong>☠</strong><b>CRIMSON TIDE</b><small>COMPUTER</small></div></div>
        <p className="app-fine">Victory earns 35 local coins and 50 XP. Defeat earns 10 XP. No multiplayer or real-money purchases.</p>
        <button className="app-cta" onClick={onBattle}>⚔ START NAVAL BATTLE</button>
      </div>}
      {screen==='fleet'&&<div className="app-stack">
        <div className="app-kicker">FLEET · ONE ACTUAL 3D SHIP</div><h2>Royal Crown</h2>
        <div className="app-ship-card"><span aria-hidden="true">⚓</span><div><strong>THE ROYAL CROWN</strong><small>Original 3D preview ship · Available</small><p>Inspect the ship by dragging to rotate and pinching to zoom.</p></div></div>
        <button className="app-cta" onClick={onInspect}>VIEW IN INTERACTIVE 3D</button>
        <div className="app-row-muted"><span>Future ships & custom hull modules</span><span>IN DEVELOPMENT</span></div>
      </div>}
      {screen==='forge'&&<div className="app-stack"><div className="app-kicker">NAVAL SHIPYARD · LOCAL PROGRESSION</div><h2>Improve the Royal Crown</h2>
        <p className="app-fine">Upgrades are saved on this device. They do not yet alter the 3D model or battle physics.</p>
        {UPGRADES.map(u=>{const lvl=profile.upgrades[u.id],cost=upgradeCost(u.id,lvl),max=lvl>=5;return <article className="app-item" key={u.id}>
          <span className="app-item-symbol" aria-hidden="true">{u.symbol}</span><div className="app-item-text"><strong>{u.name}</strong><small>LEVEL {lvl} / 5</small><p>{u.description}</p></div>
          <button type="button" disabled={max||profile.coins<cost} onClick={()=>onUpgrade(u.id)}>{max?'MAX':cost+' ●'}</button>
        </article>})}</div>}
      {screen==='cards'&&<div className="app-stack"><div className="app-kicker">YOUR CREW · LOCAL COLLECTION</div><h2>Captains & Specialists</h2>
        <p className="app-fine">Equip one crew card. Collection is saved locally; abilities will be integrated into combat later.</p>
        {CREW.map(c=>{const owned=profile.ownedCrew.includes(c.id),selected=profile.equippedCrew===c.id;return <article className={'app-item '+(selected?'app-equipped':'')} key={c.id}>
          <span className="app-item-symbol" aria-hidden="true">{c.symbol}</span><div className="app-item-text"><strong>{c.name}</strong><small>{selected?'EQUIPPED':owned?'OWNED':'LOCKED'}</small><p>{c.role}</p></div>
          <button type="button" disabled={selected||(!owned&&profile.coins<c.cost)} onClick={()=>owned?onEquipCrew(c.id):onBuyCrew(c.id)}>{selected?'ACTIVE':owned?'EQUIP':c.cost+' ●'}</button>
        </article>})}</div>}
      {screen==='shop'&&<div className="app-stack"><div className="app-kicker">PORT MARKET · DEVELOPMENT PREVIEW</div><h2>Shop</h2>
        <div className="app-offer"><span aria-hidden="true">◆</span><div><strong>Royal Gems & Real-Money Bundles</strong><p>Unavailable until secure payments, account recovery and store approvals are implemented. No purchase is charged here.</p></div><strong>NOT LIVE</strong></div>
        <div className="app-offer"><span aria-hidden="true">♛</span><div><strong>Crew available for local coins</strong><p>Earn coins by playing and claim specialists in the Crew section.</p></div><button onClick={()=>onNavigate('cards')}>VIEW CREW</button></div>
        <div className="app-row-muted"><span>Cosmetic skins, chests & advertisements</span><span>PLANNED</span></div>
      </div>}
      {screen==='missions'&&<div className="app-stack"><div className="app-kicker">DAILY PORT REWARD</div><h2>Captain's Orders</h2>
        <article className="app-daily"><span aria-hidden="true">🎁</span><div><strong>Daily Supply Chest</strong><p>UTC day · streak {profile.dailyStreak}/7 · local device only</p><small>Next claim earns {15+Math.min(7,profile.dailyStreak+1)*5} coins. Daily reset is at 00:00 UTC.</small></div>
          <button type="button" disabled={!day} onClick={onDaily}>{day?'CLAIM':'CLAIMED'}</button></article>
        <h3>Missions</h3>{MISSIONS.map(m=>{const progress=missionProgress(profile,m.id),claimed=profile.claimedMissions.includes(m.id);return <article className="app-item app-mission" key={m.id}>
          <div className="app-item-text"><strong>{m.title}</strong><small>{progress} / {m.target} · REWARD {m.reward} ●</small><div className="app-track"><span style={{width:(progress/m.target*100)+'%'}}/></div></div>
          <button disabled={claimed||progress<m.target} onClick={()=>onMission(m.id)}>{claimed?'DONE':'CLAIM'}</button></article>})}
        <p className="app-fine">Missions and daily rewards are one-time local claims. They are not synced to a server.</p>
      </div>}
      {screen==='profile'&&<div className="app-stack"><div className="app-kicker">YOUR LOCAL CAPTAIN PROFILE</div><h2>Royal Crown</h2>
        <div className="app-stat-grid">{[
          ['LEVEL',String(levelFor(profile.xp))],['XP',String(profile.xp)],['VICTORIES',String(profile.wins)],
          ['DEFEATS',String(profile.losses)],['BATTLES',String(battlesPlayed(profile))],
          ['ACCURACY',profile.shots?Math.round(100*profile.hits/profile.shots)+'%':'—']
        ].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
        <div className="app-offer"><span aria-hidden="true">♜</span><div><strong>Worldwide Ranking</strong><p>Not available: no account, multiplayer service or connected leaderboard yet. These statistics exist only on this device.</p></div><strong>OFFLINE</strong></div>
        <div className="app-row-muted"><span>Active crew: {CREW.find(c=>c.id===profile.equippedCrew)?.name}</span><button onClick={()=>onNavigate('cards')}>EDIT CREW</button></div>
      </div>}
    </div>
    <nav className="app-dock" aria-label="Main game screens">{mainNav.map(id=>{const p=PAGES.find(p=>p.id===id)!;return <button type="button" key={id} aria-label={p.title} aria-current={screen===id?'page':undefined} onClick={()=>onNavigate(id)}><span aria-hidden="true">{p.symbol}</span><strong>{p.title}</strong></button>})}</nav>
  </section>;
}
