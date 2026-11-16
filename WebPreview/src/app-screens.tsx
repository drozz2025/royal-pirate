import React from 'react';
import { PirateIcon } from './app-icons';
import { PortoBottomNav } from './porto-bottom-nav';
import { PortSidePanel } from './app-port-side';
import { MissionsPanel, RankingPanel, RankingTabs, type RankingTab } from './work8-panels';
import { FleetPanel, ForgePanel } from './work4-fleet-forge';
import { CardsCollection, ShopMarket } from './work7-cards-shop';
import { CREW, battlesPlayed, levelFor, type CrewId, type LocalProfile, type MissionId, type UpgradeId } from './progression';

export type AppScreenId = 'battle'|'fleet'|'forge'|'cards'|'shop'|'missions'|'profile'|'ranking'|'chests'|'events'|'rewards'|'offers';
const PAGES:ReadonlyArray<{id:AppScreenId;title:string}>=[
  {id:'battle',title:'Batalha'},{id:'fleet',title:'Frota'},
  {id:'forge',title:'Forja'},{id:'cards',title:'Cartas'},
  {id:'shop',title:'Loja'},{id:'missions',title:'Missões'},
  {id:'profile',title:'O meu perfil'},{id:'ranking',title:'Ranking'},
  {id:'chests',title:'Baús'},{id:'events',title:'Eventos'},
  {id:'rewards',title:'Recompensas'},{id:'offers',title:'Ofertas'}
];
const headerShortcuts:AppScreenId[]=['battle','forge','missions','profile'];
export function AppScreens({screen,profile,onNavigate,onClose,onBattle,onBuyCrew,onEquipCrew,onUpgrade,onMission,onDaily,onExportBackup,onImportBackup,onSetPlayerName,backupMessage}:
  {screen:AppScreenId;profile:LocalProfile;onNavigate:(screen:AppScreenId)=>void;onClose:()=>void;onBattle:()=>void;
   onBuyCrew:(id:CrewId)=>void;onEquipCrew:(id:CrewId)=>void;onUpgrade:(id:UpgradeId)=>void;onMission:(id:MissionId)=>void;onDaily:()=>void;
   onExportBackup:()=>void;onImportBackup:()=>void;onSetPlayerName:(name:string)=>void;backupMessage:string}) {
  const page=PAGES.find(p=>p.id===screen)!;
  const [announcement,setAnnouncement]=React.useState('');
  const [playerNameDraft,setPlayerNameDraft]=React.useState(profile.playerName);
  React.useEffect(()=>setPlayerNameDraft(profile.playerName),[profile.playerName]);
  const [rankingTab,setRankingTab]=React.useState<RankingTab>('ranking');
  const titleRef=React.useRef<HTMLHeadingElement>(null);
  React.useEffect(()=>{setAnnouncement('');titleRef.current?.focus();},[screen]);
  const action=(message:string,callback:()=>void)=>{callback();setAnnouncement(message);};
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
    <header className="app-sheet-header app-approved-hud">
      <button type="button" className="app-back app-captain-return" onClick={onClose} aria-label="Back to harbour — Voltar ao Porto" title={profile.playerName+" · progress saved locally on this device"}>
        <PirateIcon name="profile" size={31}/>
        <span className="app-captain-badge" aria-hidden="true">{levelFor(profile.xp)}</span>
      </button>
      <div className="app-sheet-brand" title="ROYAL PIRATE">
        <span className="app-royal-wordmark" aria-hidden="true">Royal Pirate</span>
        <h1 ref={titleRef} tabIndex={-1} id="app-screen-title" className="app-screen-title-accessible"><PirateIcon name={page.id} size={18}/>{page.title}</h1>
      </div>
      <div className="app-resource-counters" role="group" aria-label="Recursos do capitão">
        <div className="app-wallet app-wallet-gold" aria-label={profile.coins+' moedas de ouro ganhas localmente'}><span aria-hidden="true">●</span><strong>{new Intl.NumberFormat('pt-PT').format(profile.coins)}</strong><small className="app-wallet-sr">OURO</small></div>
        <div className="app-wallet app-wallet-gems" aria-label="Diamantes indisponíveis nesta versão; economia de gemas não implementada" title="Diamantes indisponíveis nesta versão">
          <svg viewBox="0 0 28 28" width="19" height="19" focusable="false" aria-hidden="true"><path d="M7 6h14l5 6-12 13L2 12z" fill="#77bce0" stroke="#d4eeff" strokeWidth="1.4"/><path d="M2 12h24M7 6l7 19L21 6M14 6l-4 6h8z" fill="none" stroke="#e5f5ff" strokeWidth="1.2"/></svg>
          <strong>—</strong><small className="app-wallet-sr">GEMAS</small>
        </div>
      </div>
    </header>
    <nav className="app-shortcuts" aria-label="Other screens">
      {PAGES.filter(p=>headerShortcuts.includes(p.id)&&p.id!==screen).map(p=><button type="button" key={p.id} onClick={()=>onNavigate(p.id)} aria-current={screen===p.id?'page':undefined}><PirateIcon name={p.id} size={18}/><span>{p.title}</span></button>)}
    </nav>
    <div className="app-sheet-announcement" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    <div className="app-sheet-content" key={screen}>
      {screen==='ranking'&&<RankingPanel profile={profile} tab={rankingTab} onTab={setRankingTab} onNavigate={onNavigate}/>}
      {(screen==='chests'||screen==='events'||screen==='rewards'||screen==='offers')&&
        <PortSidePanel screen={screen} profile={profile} onNavigate={onNavigate}/>}
      {screen==='battle'&&<div className="app-intro">
        <span className="app-crest" aria-hidden="true">⚔</span><div className="app-kicker">ARENA 01 · TRAINING WATERS</div>
        <h2>The First Broadside</h2><p>Your ship against the computer-controlled Crimson Tide. The existing 3D battle uses real trajectory, damage and turns.</p>
        <div className="app-versus"><div><strong>⚓</strong><b>ROYAL CROWN</b><small>YOUR SHIP</small></div><span>VS</span><div><strong>☠</strong><b>CRIMSON TIDE</b><small>COMPUTER</small></div></div>
        <p className="app-fine">Victory earns 35 local coins and 50 XP. Defeat earns 10 XP. No multiplayer or real-money purchases.</p>
        <button className="app-cta" onClick={onBattle}>⚔ START NAVAL BATTLE</button>
      </div>}
      {screen==='fleet'&&<FleetPanel profile={profile} onForge={()=>onNavigate('forge')}
        onCrew={()=>onNavigate('cards')} onPorto={onClose}/>}
      {screen==='forge'&&<ForgePanel profile={profile} onUpgrade={onUpgrade} onFleet={()=>onNavigate('fleet')}/>}
      {screen==='cards'&&<CardsCollection profile={profile} onBuyCrew={onBuyCrew} onEquipCrew={onEquipCrew}
        onBattle={()=>onNavigate('battle')} announce={action}/>}
      {screen==='shop'&&<ShopMarket profile={profile} onBuyCrew={onBuyCrew}
        onCards={()=>onNavigate('cards')} onBattle={()=>onNavigate('battle')} announce={action}/>}
      {screen==='missions'&&<MissionsPanel profile={profile} onDaily={onDaily} onMission={onMission} onNavigate={onNavigate}/>}
      {screen==='profile'&&<div className="app-stack">
        <RankingTabs active="profile" onNavigate={target=>{if(target==='ranking')setRankingTab('ranking');onNavigate(target);}}
          onLeagues={()=>{setRankingTab('leagues');onNavigate('ranking');}}/>
        <form className="app-player-name-edit" onSubmit={event=>{event.preventDefault();const name=playerNameDraft.trim().slice(0,20);if(!name){setAnnouncement('Escreve um nome para o jogador.');return;}onSetPlayerName(name);setAnnouncement('Nome do jogador guardado neste dispositivo.');}}>
          <label htmlFor="app-player-name">NOME DO JOGADOR</label>
          <div><input id="app-player-name" type="text" autoComplete="nickname" maxLength={20} value={playerNameDraft} onChange={event=>setPlayerNameDraft(event.target.value)} aria-describedby="app-player-name-help"/>
            <button type="submit" disabled={!playerNameDraft.trim()||playerNameDraft.trim()===profile.playerName}>GUARDAR</button></div>
          <small id="app-player-name-help">Até 20 caracteres. Guardado apenas neste dispositivo, sem conta online.</small>
        </form>
        <div className="app-kicker">YOUR LOCAL CAPTAIN PROFILE</div><h2>Royal Crown</h2>
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
    <PortoBottomNav screen={screen} profile={profile} onNavigate={onNavigate} onPorto={onClose}/>
  </section>;
}
