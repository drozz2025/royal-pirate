import React from 'react';
import { CREW, type CrewId, type LocalProfile } from './progression';

/** Original local-only crew collection. Selection is a UI preview, never a combat power. */
export function CrewDeck({profile,onlyOwned,onBuyCrew,onEquipCrew,onBattle,announce}:
  {profile:LocalProfile;onlyOwned:boolean;onBuyCrew:(id:CrewId)=>void;onEquipCrew:(id:CrewId)=>void;
   onBattle:()=>void;announce:(message:string,callback:()=>void)=>void}) {
  const [previewId,setPreviewId]=React.useState<CrewId>(profile.equippedCrew);
  const available=CREW.filter(c=>!onlyOwned||profile.ownedCrew.includes(c.id));
  const preview=available.find(c=>c.id===previewId)??available[0];
  const owned=profile.ownedCrew.includes(preview.id);
  const equipped=profile.equippedCrew===preview.id;
  const affordable=profile.coins>=preview.cost;
  const remaining=Math.max(0,preview.cost-profile.coins);
  const purchaseOrEquip=()=>{
    if(equipped)return;
    if(owned)announce(preview.name+' equipped locally. Crew abilities do not affect combat yet.',()=>onEquipCrew(preview.id));
    else if(affordable)announce(preview.name+' recruited for '+preview.cost+' local coins. Crew abilities do not affect combat yet.',()=>onBuyCrew(preview.id));
  };
  return <section className="app-deck" aria-labelledby="app-deck-title">
    <div className="app-deck-top"><div><div className="app-kicker">THE CAPTAIN'S DECK · DEVICE ONLY</div>
      <h3 id="app-deck-title">Crew collection</h3></div>
      <span className="app-deck-count">{profile.ownedCrew.length} / {CREW.length} OWNED</span></div>
    <div className="app-deck-feature">
      <div className="app-deck-illustration" aria-hidden="true">
        <svg viewBox="0 0 180 180" focusable="false">
          <defs><linearGradient id="deck-gold" x1="0" x2="1"><stop stopColor="#f5deab"/><stop offset="1" stopColor="#bd8445"/></linearGradient></defs>
          <circle cx="90" cy="90" r="79" fill="#0b2947" stroke="#d5ae65" strokeWidth="2"/>
          <circle cx="90" cy="90" r="68" fill="none" stroke="#5e93a2" strokeWidth="1" strokeDasharray="3 6"/>
          <path d="M45 147Q48 113 70 104L90 115 110 104Q132 113 135 147Z" fill="#284c68" stroke="#cfad73" strokeWidth="3"/>
          <path d="M68 74Q68 51 90 51T112 74V85Q109 109 90 109T68 85Z" fill="#c99360" stroke="#ffe0a0" strokeWidth="2"/>
          <path d="M54 64Q90 6 126 64L117 70 90 57 63 70Z" fill="#122e4c" stroke="url(#deck-gold)" strokeWidth="3"/>
          <path d="M62 49H118M81 43L90 32 99 43" fill="none" stroke="#f1d58f" strokeWidth="4" strokeLinecap="round"/>
          <path d="M77 83h7m12 0h7M81 96q9 8 18 0" fill="none" stroke="#5b3c34" strokeWidth="3" strokeLinecap="round"/>
          <path d="M91 115v29m-11-15 11 7 10-7" fill="none" stroke="#eac581" strokeWidth="3"/>
        </svg>
        <span className="app-deck-emblem">{preview.symbol}</span>
      </div>
      <div className="app-deck-info"><small>{equipped?'★ ACTIVE CAPTAIN':owned?'✓ COLLECTED':'◇ UNDISCOVERED'}</small>
        <h4>{preview.name}</h4><p>{preview.role}</p>
        <strong>{equipped?'EQUIPPED':owned?'READY TO EQUIP':preview.cost+' LOCAL COINS'}</strong>
        {!owned&&<span className="app-deck-afford">{affordable?'Recruit with earned coins':'Earn '+remaining+' more coins to recruit'}</span>}
        <button type="button" disabled={equipped||(!owned&&!affordable)}
          onClick={purchaseOrEquip} aria-label={equipped?preview.name+' is already active':owned?'Equip '+preview.name:affordable?'Recruit '+preview.name+' for '+preview.cost+' local coins':'Need '+remaining+' more coins to recruit '+preview.name}>
          {equipped?'ACTIVE CAPTAIN':owned?'EQUIP CAPTAIN':affordable?'RECRUIT CREW':'NOT ENOUGH COINS'}
        </button>
      </div>
    </div>
    <div className="app-deck-roster" role="group" aria-label="Browse crew cards">
      {available.map(c=>{
        const isOwned=profile.ownedCrew.includes(c.id),isActive=profile.equippedCrew===c.id;
        return <button type="button" className={'app-deck-slot '+(preview.id===c.id?'is-preview':'')}
          key={c.id} aria-pressed={preview.id===c.id} onClick={()=>setPreviewId(c.id)}
          aria-label={'View '+c.name+(isActive?', active captain':isOwned?', owned':', locked')}>
          <span className="app-deck-slot-icon" aria-hidden="true">{c.symbol}</span>
          <strong>{c.name}</strong>
          <small>{isActive?'ACTIVE':isOwned?'OWNED':'UNDISCOVERED · '+c.cost+' ●'}</small>
        </button>;
      })}
    </div>
    <div className="app-deck-footer"><span>One active captain · collection saved locally · no combat bonuses yet</span>
      <button type="button" onClick={onBattle}>GO TO BATTLE</button></div>
  </section>;
}
