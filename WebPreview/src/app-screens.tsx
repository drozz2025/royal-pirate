import React from 'react';
import { PirateIcon } from './app-icons';
import { FleetShowcase } from './fleet-showcase';
import { CrewDeck } from './crew-deck';
import { CREW, MISSIONS, UPGRADES, battlesPlayed, canClaimDaily, nextDailyStreak, levelFor, missionProgress, upgradeCost, type CrewId, type LocalProfile, type MissionId, type UpgradeId } from './progression';

export type AppScreenId = 'battle'|'fleet'|'forge'|'cards'|'shop'|'missions'|'profile'|'ranking'|'chests'|'events'|'rewards'|'offers';
const PAGES:ReadonlyArray<{id:AppScreenId;title:string}>=[
  {id:'battle',title:'Battle'},{id:'fleet',title:'Fleet'},
  {id:'forge',title:'Forge'},{id:'cards',title:'Crew'},
  {id:'shop',title:'Shop'},{id:'missions',title:'Missions'},
  {id:'profile',title:'Profile'},{id:'ranking',title:'Ranking'},
  {id:'chests',title:'Daily chests'},{id:'events',title:'Events'},
  {id:'rewards',title:'Rewards'},{id:'offers',title:'Offers'}
];
const headerShortcuts:AppScreenId[]=['battle','forge','missions','profile'];
export function AppScreens({screen,profile,onNavigate,onClose,onBattle,onBuyCrew,onEquipCrew,onUpgrade,onMission,onDaily,onExportBackup,onImportBackup,backupMessage}:
  {screen:AppScreenId;profile:LocalProfile;onNavigate:(screen:AppScreenId)=>void;onClose:()=>void;onBattle:()=>void;
   onBuyCrew:(id:CrewId)=>void;onEquipCrew:(id:CrewId)=>void;onUpgrade:(id:UpgradeId)=>void;onMission:(id:MissionId)=>void;onDaily:()=>void;
   onExportBackup:()=>void;onImportBackup:()=>void;backupMessage:string}) {
  const page=PAGES.find(p=>p.id===screen)!;
  const [announcement,setAnnouncement]=React.useState('');
  const [onlyOwned,setOnlyOwned]=React.useState(false);
  const titleRef=React.useRef<HTMLHeadingElement>(null);
  React.useEffect(()=>{setAnnouncement('');setOnlyOwned(false);titleRef.current?.focus();},[screen]);
  const action=(message:string,callback:()=>void)=>{callback();setAnnouncement(message);};
  const now=Date.now(),day=canClaimDaily(profile,now);
  const nextDailyDay=nextDailyStreak(profile,now);
  // When the previous claim is older than yesterday, the old streak is no longer active.
  const visibleStreak=day&&nextDailyDay===1?0:profile.dailyStreak;
  const onDialogKeyDown=(event:React.KeyboardEvent<HTMLElement>)=>{
    if(event.key!=='Tab')return;
    const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)'))
      .filter(el=>el.getClientRects().length>0);
    if(!items.length)return;
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  return <section className="app-sheet" role="dialog" aria-modal="true" onKeyDown={onDialogKeyDown} aria-labelledby="app-screen-title">
    <header className="app-sheet-header">
      <button type="button" className="app-back" onClick={onClose} aria-label="Back to harbour">‹</button>
      <div className="app-sheet-brand"><small>ROYAL PIRATE · LOCAL PREVIEW</small><h1 ref={titleRef} tabIndex={-1} id="app-screen-title"><span className="app-page-glyph" aria-hidden="true"><PirateIcon name={page.id} size={28}/></span> {page.title}</h1></div>
      <div className="app-wallet" aria-label={profile.coins+' locally earned coins'}><span aria-hidden="true">●</span><strong>{profile.coins}</strong><small>COINS</small></div>
    </header>
    <nav className="app-shortcuts" aria-label="Other screens">
      {PAGES.filter(p=>headerShortcuts.includes(p.id)&&p.id!==screen).map(p=><button type="button" key={p.id} onClick={()=>onNavigate(p.id)} aria-current={screen===p.id?'page':undefined}><PirateIcon name={p.id} size={18}/><span>{p.title}</span></button>)}
    </nav>
    <div className="app-sheet-announcement" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    <div className="app-sheet-content" key={screen}>
      {screen==='ranking'&&<div className="app-stack">
        <div className="app-kicker">RANKING · LOCAL RESULTS ONLY</div><h2>Captain's record</h2>
        <p className="app-fine">There is no global leaderboard yet. Your device stores only your own battles; no other players or fictional positions are displayed.</p>
        <div className="app-summary-strip"><span><strong>{profile.wins}</strong><small>WINS</small></span><span><strong>{profile.losses}</strong><small>DEFEATS</small></span><span><strong>{levelFor(profile.xp)}</strong><small>CAPTAIN LEVEL</small></span></div>
        <button type="button" className="app-cta" onClick={()=>onNavigate('profile')}>OPEN LOCAL PROFILE</button>
      </div>}
      {screen==='chests'&&<div className="app-stack">
        <div className="app-kicker">BAÚS · 7-DAY LOCAL SUPPLY ROUTE</div><h2>Daily reward chest</h2>
        <p className="app-fine">{day?`Your next daily claim is ready: ${15+nextDailyDay*5} local coins.`:'Today’s daily reward was already claimed.'} The complete seven-day calendar and the claim button are in Missions.</p>
        <button type="button" className="app-cta" onClick={()=>onNavigate('missions')}>OPEN DAILY REWARDS</button>
      </div>}
      {screen==='events'&&<div className="app-stack">
        <div className="app-kicker">EVENTOS · CURRENT STATUS</div><h2>Events at sea</h2>
        <p className="app-fine">Timed online events are not active in this offline demo. You can still complete the real local mission objectives and collect their rewards.</p>
        <button type="button" className="app-cta" onClick={()=>onNavigate('missions')}>VIEW LOCAL MISSIONS</button>
      </div>}
      {screen==='rewards'&&<div className="app-stack">
        <div className="app-kicker">RECOMPENSAS · VERIFIED LOCAL PROGRESS</div><h2>Your collected rewards</h2>
        <div className="app-summary-strip"><span><strong>{profile.coins}</strong><small>AVAILABLE COINS</small></span><span><strong>{profile.claimedMissions.length}</strong><small>MISSIONS CLAIMED</small></span></div>
        <p className="app-fine">{day?'Today’s daily supply is available.':'Today’s daily supply has been claimed.'} Rewards and balances are saved on this device only.</p>
        <button type="button" className="app-cta" onClick={()=>onNavigate('missions')}>OPEN CLAIMS & CALENDAR</button>
      </div>}
      {screen==='offers'&&<div className="app-stack">
        <div className="app-kicker">OFERTAS · SHOP STATUS</div><h2>Special offers</h2>
        <p className="app-fine">No real-money offers or in-app purchases are available in this demo. The local store is available without payment services.</p>
        <button type="button" className="app-cta" onClick={()=>onNavigate('shop')}>VIEW LOCAL STORE</button>
      </div>}
      {screen==='battle'&&<div className="app-intro">
        <span className="app-crest" aria-hidden="true">⚔</span><div className="app-kicker">ARENA 01 · TRAINING WATERS</div>
        <h2>The First Broadside</h2><p>Your ship against the computer-controlled Crimson Tide. The existing 3D battle uses real trajectory, damage and turns.</p>
        <div className="app-versus"><div><strong>⚓</strong><b>ROYAL CROWN</b><small>YOUR SHIP</small></div><span>VS</span><div><strong>☠</strong><b>CRIMSON TIDE</b><small>COMPUTER</small></div></div>
        <p className="app-fine">Victory earns 35 local coins and 50 XP. Defeat earns 10 XP. No multiplayer or real-money purchases.</p>
        <button className="app-cta" onClick={onBattle}>⚔ START NAVAL BATTLE</button>
      </div>}
      {screen==='fleet'&&<div className="app-stack">
        <div className="app-kicker">FLEET · ONE ACTUAL 3D SHIP</div><h2>Royal Crown</h2>
        <div className="app-ship-card"><span aria-hidden="true">⚓</span><div><strong>THE ROYAL CROWN</strong><small>Original 3D preview ship · Available</small><p>In the Porto, touch the ship directly and drag or pinch to explore.</p></div></div>
        <p className="app-hint">Return to the Porto and touch the ship directly to rotate or pinch-zoom it.</p>
        <FleetShowcase profile={profile} onForge={()=>onNavigate('forge')} onCrew={()=>onNavigate('cards')}/>
        <div className="app-row-muted"><span>Future ships & custom hull modules</span><span>IN DEVELOPMENT</span></div>
      </div>}
      {screen==='forge'&&<div className="app-stack"><div className="app-kicker">NAVAL SHIPYARD · LOCAL PROGRESSION</div><h2>Improve the Royal Crown</h2>
        <p className="app-fine">Upgrades are saved on this device. They do not yet alter the 3D model or battle physics.</p>
        <div className="app-summary-strip"><span><strong>{UPGRADES.reduce((total,u)=>total+profile.upgrades[u.id],0)} / 15</strong><small>SHIPYARD LEVELS</small></span><span><strong>{profile.coins}</strong><small>AVAILABLE COINS</small></span></div>
        <section className="app-forge-board" aria-label="Royal Crown shipyard overview">
          <div className="app-forge-seal" aria-hidden="true"><PirateIcon name="forge" size={56}/><span>ROYAL CROWN</span></div>
          <div className="app-forge-status"><div className="app-kicker">THREE SHIP SYSTEMS · REAL LOCAL LEVELS</div>
            <h3>Shipyard blueprint</h3>
            <div className="app-forge-mini-grid">{UPGRADES.map(u=><div key={u.id}>
              <span aria-hidden="true">{u.symbol}</span><strong>{u.name}</strong><small>{profile.upgrades[u.id]} / 5</small>
            </div>)}</div>
            <p>Visual progression only. Hull, cannon and sail upgrades do not yet change damage, health or ship speed in battle.</p>
          </div>
        </section>
        {UPGRADES.map(u=>{const lvl=profile.upgrades[u.id],cost=upgradeCost(u.id,lvl),max=lvl>=5;return <article className="app-item app-upgrade-item" key={u.id}>
          <span className="app-item-symbol" aria-hidden="true">{u.symbol}</span><div className="app-item-text"><strong>{u.name}</strong><small>LEVEL {lvl} / 5</small><p>{u.description}</p>
          <div className="app-upgrade-steps" role="progressbar" aria-label={u.name+' upgrade level'} aria-valuemin={0} aria-valuemax={5} aria-valuenow={lvl}>{[1,2,3,4,5].map(step=><span key={step} className={step<=lvl?'is-complete':''}/>)}</div>
          <small className="app-cost-note">{max?'Fully upgraded':profile.coins<cost?`Earn ${cost-profile.coins} more local coins to upgrade`:`Next level costs ${cost} local coins`}</small></div>
          <button type="button" disabled={max||profile.coins<cost} onClick={()=>action(u.name+' upgraded to level '+(lvl+1)+' locally. No battle stat changes yet.',()=>onUpgrade(u.id))}>{max?'MAX':cost+' ●'}</button>
        </article>})}</div>}
      {screen==='cards'&&<div className="app-stack"><div className="app-kicker">YOUR CREW · LOCAL COLLECTION</div><h2>Captains & Specialists</h2>
        <p className="app-fine">Equip one crew card. Collection is saved locally; abilities will be integrated into combat later.</p>
        <div className="app-crew-tools"><div><strong>{profile.ownedCrew.length} / {CREW.length}</strong><small>CREW COLLECTED</small></div>
          <div className="app-crew-filters" role="group" aria-label="Filter crew collection">
            <button type="button" aria-pressed={!onlyOwned} onClick={()=>setOnlyOwned(false)}>ALL</button>
            <button type="button" aria-pressed={onlyOwned} onClick={()=>setOnlyOwned(true)}>OWNED</button>
          </div>
        </div>
        <CrewDeck profile={profile} onlyOwned={onlyOwned} onBuyCrew={onBuyCrew} onEquipCrew={onEquipCrew}
          onBattle={()=>onNavigate('battle')} announce={action}/></div>}
      {screen==='shop'&&<div className="app-stack">
        <div className="app-market-hero">
          <div className="app-market-icon" aria-hidden="true"><PirateIcon name="shop" size={45}/></div>
          <div className="app-market-copy"><div className="app-kicker">THE PORT MARKET · LOCAL PREVIEW</div><h2>Port Market</h2>
            <p>Recruit original crew with coins earned in naval battles. No cash purchases, gems or simulated stock.</p></div>
          <div className="app-market-purse" aria-label={profile.coins+' local coins available'}><strong>{profile.coins}</strong><small>● COINS</small></div>
        </div>
        <section className="app-market-roster" aria-labelledby="app-market-title">
          <div className="app-market-heading"><div><div className="app-kicker">AVAILABLE IN THIS PREVIEW</div><h3 id="app-market-title">Recruit your crew</h3></div>
            <small>{profile.ownedCrew.length} / {CREW.length} COLLECTED</small></div>
          <div className="app-market-list">{CREW.map(c=>{
            const owned=profile.ownedCrew.includes(c.id),affordable=profile.coins>=c.cost;
            return <article className={'app-market-card '+(owned?'is-owned':'')} key={c.id}>
              <span className="app-market-portrait" aria-hidden="true">{c.symbol}</span>
              <div className="app-market-card-info"><strong>{c.name}</strong><small>{owned?'IN YOUR CREW':'LOCAL RECRUIT'}</small>
                <p>{c.role}</p>
                <span className="app-market-price">{owned?'COLLECTED':c.cost+' ● LOCAL COINS'}</span>
              </div>
              <button type="button" disabled={owned||!affordable} aria-label={owned?c.name+' already collected':affordable?'Recruit '+c.name+' for '+c.cost+' local coins':'Need '+(c.cost-profile.coins)+' more local coins to recruit '+c.name}
                onClick={()=>action(c.name+' recruited for '+c.cost+' local coins. Manage this card in Crew.',()=>onBuyCrew(c.id))}>
                {owned?'OWNED':affordable?'RECRUIT':'LOCKED'}
              </button>
            </article>;
          })}</div>
          <p className="app-fine">Crew collection and coin spending are saved on this device. Crew abilities do not affect combat yet.</p>
          <div className="app-market-actions"><button type="button" onClick={()=>onNavigate('battle')}>EARN COINS IN BATTLE</button><button type="button" onClick={()=>onNavigate('cards')}>MANAGE CREW</button></div>
        </section>
        <div className="app-offer app-market-pending"><span aria-hidden="true">◆</span><div><strong>Gems & real-money bundles</strong>
          <p>Not live until secure payments, account recovery and store approvals exist. No real-money checkout is available.</p></div><strong>NOT LIVE</strong></div>
        <div className="app-row-muted"><span>Cosmetic skins, treasure chests & advertisements</span><span>PLANNED</span></div>
      </div>}
      {screen==='missions'&&<div className="app-stack"><div className="app-kicker">DAILY PORT REWARD</div><h2>Captain's Orders</h2>
        <article className="app-daily"><span aria-hidden="true">🎁</span><div><strong>Daily Supply Chest</strong><p>UTC day · streak {profile.dailyStreak}/7 · local device only</p><small>Next claim earns {15+nextDailyDay*5} coins. Daily reset is at 00:00 UTC.</small></div>
          <button type="button" disabled={!day} onClick={()=>action('Daily supply chest claimed locally. Return tomorrow after 00:00 UTC.',onDaily)}>{day?'CLAIM':'CLAIMED'}</button></article>
        <section className="app-week-rewards" aria-labelledby="app-week-title">
          <div className="app-week-heading"><h3 id="app-week-title">7-day supply route</h3><small>Consecutive UTC claims · local save</small></div>
          <ol className="app-week-grid" aria-label="Seven consecutive daily rewards">
            {Array.from({length:7},(_,n)=>n+1).map(n=>{
              const claimed=n<=visibleStreak;
              const next=day&&n===nextDailyDay;
              return <li key={n} className={['app-week-day',claimed?'is-claimed':next?'is-next':''].filter(Boolean).join(' ')}>
                <span className="app-week-day-label">DAY {n}</span>
                <span className="app-week-day-icon" aria-hidden="true">{claimed?'✓':n===7?'♛':'◆'}</span>
                <strong>{15+n*5} <span aria-hidden="true">●</span></strong>
                <small>{claimed?'Streak earned':next?'Claim available':'Upcoming'}</small>
              </li>;
            })}
          </ol>
          <p className="app-fine">Missing a UTC day resets the streak to day 1. After day 7, the reward remains 50 local coins per consecutive day; this preview does not create real treasure chests.</p>
        </section>
        <h3>Missions</h3>{MISSIONS.map(m=>{const progress=missionProgress(profile,m.id),claimed=profile.claimedMissions.includes(m.id);return <article className="app-item app-mission" key={m.id}>
          <div className="app-item-text"><strong>{m.title}</strong><small>{progress} / {m.target} · REWARD {m.reward} ●</small><div className="app-track" role="progressbar" aria-label={m.title+' progress'} aria-valuemin={0} aria-valuemax={m.target} aria-valuenow={progress}><span style={{width:(progress/m.target*100)+'%'}}/></div></div>
          <button disabled={claimed||progress<m.target} onClick={()=>action(m.title+': '+m.reward+' local coins claimed.',()=>onMission(m.id))}>{claimed?'DONE':'CLAIM'}</button></article>})}
        <p className="app-fine">Missions and daily rewards are one-time local claims. They are not synced to a server.</p>
      </div>}
      {screen==='profile'&&<div className="app-stack"><div className="app-kicker">YOUR LOCAL CAPTAIN PROFILE</div><h2>Royal Crown</h2>
        <div className="app-stat-grid">{[
          ['LEVEL',String(levelFor(profile.xp))],['XP',String(profile.xp)],['VICTORIES',String(profile.wins)],
          ['DEFEATS',String(profile.losses)],['BATTLES',String(battlesPlayed(profile))],
          ['ACCURACY',profile.shots?Math.round(100*profile.hits/profile.shots)+'%':'—']
        ].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
        <section className="app-captain-route" aria-labelledby="app-captain-route-title">
          <div className="app-captain-route-top"><div><div className="app-kicker">PERSONAL VOYAGE · LOCAL ONLY</div><h3 id="app-captain-route-title">Captain's milestones</h3></div>
            <strong>{profile.wins} <small>VICTORIES</small></strong></div>
          <div className="app-captain-route-track" role="progressbar" aria-label="Personal victory milestones" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.min(profile.wins,10)}>
            <span style={{width:Math.min(100,profile.wins*10)+'%'}}/></div>
          <ol className="app-captain-route-steps">{[1,3,5,10].map(target=><li key={target} className={profile.wins>=target?'is-earned':''}>
            <span aria-hidden="true">{profile.wins>=target?'✓':'◆'}</span><strong>{target} {target===1?'WIN':'WINS'}</strong>
          </li>)}</ol>
          <p className="app-fine">Personal milestones use completed battles on this device. These are not online ranks, leagues or prize claims.</p>
        </section>
        <section className="app-battle-log" aria-labelledby="app-battle-log-title">
          <div className="app-battle-log-heading"><div><div className="app-kicker">CAPTAIN'S LOG · LOCAL ONLY</div><h3 id="app-battle-log-title">Recent battles</h3></div><small>{profile.battleLog.length} / 12 saved</small></div>
          {profile.battleLog.length===0?<p className="app-battle-empty">No completed battles recorded yet. Finish a naval battle to write your first entry.</p>:
          <ol className="app-battle-entries">{profile.battleLog.map((entry,i)=><li key={entry.completedAt+'-'+i} className={'app-battle-entry '+(entry.outcome==='victory'?'is-win':'is-loss')}>
            <span className="app-battle-medallion" aria-hidden="true">{entry.outcome==='victory'?'★':'◆'}</span>
            <div className="app-battle-details"><strong>{entry.outcome==='victory'?'VICTORY':'DEFEAT'}</strong><time dateTime={entry.completedAt}>{entry.completedAt.slice(0,16).replace('T',' ')} UTC</time><small>{entry.hits} / {entry.shots} cannon hits</small></div>
            <div className="app-battle-loot"><strong>+{entry.earnedXp} XP</strong><small>{entry.earnedCoins?'+'+entry.earnedCoins+' COINS':'NO COINS'}</small></div>
          </li>)}</ol>}
          <p className="app-fine">The latest 12 completed battles are saved only in this browser and included in local backups. Older battles remain in the lifetime totals above.</p>
        </section>
        <div className="app-offer"><span aria-hidden="true">♜</span><div><strong>Worldwide Ranking</strong><p>Not available: no account, multiplayer service or connected leaderboard yet. These statistics exist only on this device.</p></div><strong>OFFLINE</strong></div>
        <div className="app-row-muted"><span>Active crew: {CREW.find(c=>c.id===profile.equippedCrew)?.name}</span><button onClick={()=>onNavigate('cards')}>EDIT CREW</button></div>
        <section className="app-save-backup" aria-labelledby="app-backup-title">
          <div className="app-kicker">SAVE MANAGEMENT · OFFLINE ONLY</div>
          <h3 id="app-backup-title">Protect your progress</h3>
          <p>Progress is stored in this browser. Export a JSON save to keep a copy, or restore one to this device. There is no account, online backup or server validation.</p>
          <div className="app-backup-actions"><button type="button" onClick={onExportBackup}>↓ SAVE BACKUP</button><button type="button" onClick={onImportBackup}>↑ RESTORE BACKUP</button></div>
          {backupMessage&&<p className="app-backup-status" role="status" aria-live="polite">{backupMessage}</p>}
          <small>Restore replaces local progress after confirmation. Offline saves are editable and cannot count for future online rankings.</small>
        </section>
      </div>}
    </div>
    <nav className="app-dock" aria-label="Main game screens">{mainNav.map(id=>{const p=PAGES.find(p=>p.id===id)!;return <button type="button" key={id} aria-label={p.title} aria-current={screen===id?'page':undefined} onClick={()=>onNavigate(id)}><span className="app-tab-glyph" aria-hidden="true"><PirateIcon name={p.id} size={27}/></span><strong>{p.title}</strong></button>})}</nav>
  </section>;
}
