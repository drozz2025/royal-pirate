import React, { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_MODULES, SHIP_CLASSES, SHIP_MODULES, SLOTS, progressionTier, equipAccess,
  mayEquip, validateOwnedLoadout, type ModuleSlot, type ShipClass, type ShipLoadout
} from './ship-modules';

/** Optional Work 4 interface: never infer entitlements from demo preview progress. */
type ShipyardProps={
 onClose:()=>void;
 onPreview:(loadout:ShipLoadout)=>void;
 ownedModuleIds?:ReadonlySet<string>;
 onEquip?:(loadout:Required<ShipLoadout>)=>void;
};
const SLOT_NAMES:Record<ModuleSlot,string>={
 hull:'HULL',sails:'SAILS',cannons:'CANNONS',armor:'ARMOUR',figurehead:'PROW',
 flag:'FLAG',masts:'MASTS',cabin:'CABIN',ornaments:'TRIM'
};

/** Interactive ship construction sandbox. Nothing here is purchased, owned,
 * persisted, awarded or injected into combat; only original 3D parts are previewed. */
export function Shipyard({onClose,onPreview,ownedModuleIds,onEquip}:ShipyardProps){
 const [shipClass,setShipClass]=useState<ShipClass>('fighter');
 const [level,setLevel]=useState(1);
 const [slot,setSlot]=useState<ModuleSlot>('hull');
 const [selected,setSelected]=useState<Partial<Record<ModuleSlot,string>>>({});
 const [details,setDetails]=useState(true);
 const chooseLevel=useCallback((value:number)=>{
  setLevel(value);
  setSelected(prev=>Object.fromEntries(
   Object.entries(prev).filter(([key,id])=>SHIP_MODULES.some(m=>m.slot===key&&m.id===id&&m.minLevel<=value))
  ) as Partial<Record<ModuleSlot,string>>);
 },[]);
 useEffect(()=>{onPreview({shipClass,level,modules:selected});},[shipClass,level,selected,onPreview]);
 const items=SHIP_MODULES.filter(m=>m.slot===slot);
 const active=selected[slot]??DEFAULT_MODULES[slot];
 const draftLoadout:ShipLoadout={shipClass,level,modules:selected};
 const equipEnabled=!!onEquip&&!!ownedModuleIds&&SLOTS.every(s=>mayEquip(selected[s]??DEFAULT_MODULES[s],level,ownedModuleIds));
 const equipVerified=()=>{if(onEquip&&ownedModuleIds&&equipEnabled)onEquip(validateOwnedLoadout(draftLoadout,ownedModuleIds));};
 return <section className="shipyard-screen" aria-label="Ship customisation 3D sandbox">
  <header className="shipyard-header">
   <button type="button" className="shipyard-back" onClick={onClose} aria-label="Return to harbour">‹ PORT</button>
   <div className="shipyard-title"><span>ROYAL PIRATE</span><strong>THE SHIPYARD</strong></div>
   <span className="shipyard-badge">3D PREVIEW</span>
  </header>
  <div className="shipyard-class-panel">
   <p className="shipyard-kicker">CHOOSE A SHIP HULL</p>
   <div className="shipyard-class-options" role="group" aria-label="Ship class">
    {(Object.keys(SHIP_CLASSES) as ShipClass[]).map(type=>
     <button type="button" key={type} className={type===shipClass?'active':''}
      aria-pressed={type===shipClass} onClick={()=>setShipClass(type)}>{SHIP_CLASSES[type].name}</button>
    )}
   </div>
   <small>{SHIP_CLASSES[shipClass].description} · {progressionTier(level).toUpperCase()} TIER</small>
  </div>
  <div className="shipyard-orbit-hint" aria-hidden="true">↔ DRAG TO ROTATE · PINCH TO ZOOM</div>
  <div className="shipyard-panel">
   <div className="shipyard-level">
    <label htmlFor="shipyard-level">DEMO PREVIEW LEVEL <strong>{level} / 20</strong></label>
    <input id="shipyard-level" type="range" min={1} max={20} step={1} value={level}
      onChange={event=>chooseLevel(Number(event.target.value))}/>
    <span>Levels demonstrate visual unlock gates only — no player progress is saved.</span>
   </div>
   <div className="shipyard-slot-strip" role="group" aria-label="Ship module categories">
    {SLOTS.map(current=><button type="button" key={current} aria-pressed={slot===current}
      className={slot===current?'active':''} onClick={()=>setSlot(current)}>{SLOT_NAMES[current]}</button>)}
   </div>
   <div className="shipyard-parts-header"><strong>{SLOT_NAMES[slot]} MODULES</strong><div className="shipyard-parts-tools">
    <button type="button" onClick={()=>setSelected({})} aria-label="Reset all preview modules to their default designs">RESET PREVIEW</button>
    <button type="button" onClick={()=>setDetails(!details)} aria-expanded={details}>{details?'HIDE INFO':'SHOW INFO'}</button>
   </div></div>
   <div className="shipyard-parts" role="group" aria-label={'Preview '+SLOT_NAMES[slot].toLowerCase()}>
    {items.map(module=>{
     const locked=module.minLevel>level;
     const selectedPart=active===module.id;
     const gate=equipAccess(module.id,level,ownedModuleIds);
     return <button type="button" key={module.id} disabled={locked}
      className={'shipyard-part'+(selectedPart?' selected':'')}
      aria-pressed={selectedPart} onClick={()=>setSelected(prev=>({...prev,[slot]:module.id}))}>
      <span className="shipyard-part-crest">{locked?'◇':'✦'}</span>
      <strong>{module.name}</strong>
      {details&&<small>{module.description}</small>}
      <em>{locked?'LEVEL '+module.minLevel+' REQUIRED':gate==='equippable'?'OWNED · '+(selectedPart?'SELECTED':'PREVIEW'):gate==='not-owned'?'NOT OWNED · PREVIEW':selectedPart?'ON PREVIEW':'PREVIEW ONLY'}</em>
     </button>;
    })}
   </div>
   {onEquip&&<button type="button" className="shipyard-equip" disabled={!equipEnabled} onClick={equipVerified} aria-label="Equip only fully owned and level-unlocked modules">
    {equipEnabled?'EQUIP VERIFIED FLEET':'EQUIP UNAVAILABLE — OWNERSHIP REQUIRED'}
   </button>}
   <p className="shipyard-legal">VISUAL SANDBOX ONLY · Level unlocks are not purchases or ownership. Preview changes are not saved and do not affect battle. {ownedModuleIds?'Ownership supplied by connected game service.':'Ownership verification is not connected.'}</p>
  </div>
 </section>;
}
