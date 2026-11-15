import React from 'react';
import { CrewPortrait } from './crew-portrait';
import { CREW, type CrewId, type LocalProfile } from './progression';

/** Original local-only crew collection. Selection is a UI preview, never a combat power. */
export function CrewDeck({profile,onlyOwned,onBuyCrew,onEquipCrew,onBattle,announce}:
  {profile:LocalProfile;onlyOwned:boolean;onBuyCrew:(id:CrewId)=>void;onEquipCrew:(id:CrewId)=>void;
   onBattle:()=>void;announce:(message:string,callback:()=>void)=>void}) {
  const [previewId,setPreviewId]=React.useState<CrewId>(profile.equippedCrew);
  // An externally restored save may equip a different crew member.
  React.useEffect(()=>setPreviewId(profile.equippedCrew),[profile.equippedCrew]);
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
        <CrewPortrait id={preview.id}/>
        <span className="app-deck-emblem">{preview.symbol}</span>
      </div>
      <div className="app-deck-info"><small>{equipped?'★ ACTIVE CAPTAIN':owned?'✓ COLLECTED':'◇ UNDISCOVERED'}</small>
        <h4 id="app-crew-preview-name" aria-live="polite">{preview.name}</h4><p>{preview.role}</p>
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
          key={c.id} aria-controls="app-crew-preview-name" aria-pressed={preview.id===c.id} onClick={()=>setPreviewId(c.id)}
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
