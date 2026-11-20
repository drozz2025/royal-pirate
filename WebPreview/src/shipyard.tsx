import React, { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_MODULES, SHIP_CLASSES, SHIP_MODULES, SLOTS, progressionTier, equipAccess, highestUnlockedPreviewModules,
  mayEquip, validateOwnedFleetForPlayer, type ModuleSlot, type ShipClass, type ShipLoadout, type ResolvedShipLoadout
} from './ship-modules';
import { SHIPYARD_VIEWS, type ShipyardView } from './shipyard-camera';

/** Optional Work 4 interface: never infer entitlements from demo preview progress. */
type ShipyardProps={
 onClose:()=>void;
 onPreview:(loadout:ShipLoadout)=>void;
 /** Optional isolated preview camera; no battle camera or persistence involved. */
 onViewChange?:(view:ShipyardView)=>void;
 /** Optional WORK 6 callback to focus the active part in the isolated 3D scene. */
 onFocusSlot?:(slot:ModuleSlot|null)=>void;
 ownedModuleIds?:ReadonlySet<string>;
 /** Independently verified ownership of the ship class/hull, not individual modules. */
 ownedShipClasses?:ReadonlySet<ShipClass>;
 /** Player's real, independently verified level; NEVER the preview slider. */
 verifiedPlayerLevel?:number;
 onEquip?:(loadout:ResolvedShipLoadout)=>void;
};
const SLOT_NAMES:Record<ModuleSlot,string>={
 hull:'HULL',sails:'SAILS',cannons:'CANNONS',armor:'ARMOUR',figurehead:'PROW',
 flag:'FLAG',masts:'MASTS',cabin:'CABIN',ornaments:'TRIM'
};

/** Interactive ship construction sandbox. Nothing here is purchased, owned,
 * persisted, awarded or injected into combat; only original 3D parts are previewed. */
export function Shipyard({onClose,onPreview,onViewChange,onFocusSlot,ownedModuleIds,ownedShipClasses,verifiedPlayerLevel,onEquip}:ShipyardProps){
 const [shipClass,setShipClass]=useState<ShipClass>('fighter');
 const [level,setLevel]=useState(1);
 const [slot,setSlot]=useState<ModuleSlot>('hull');
 const [cameraView,setCameraView]=useState<ShipyardView>('quarter');
 const [focusedSlot,setFocusedSlot]=useState<ModuleSlot|null>(null);
 // Preserve sandbox designs independently per hull. A class change must not
 // silently copy its ornaments, sails and guns to another ship.
 // Preview-only React state: never a saved fleet inventory.
 const [selectedByClass,setSelectedByClass]=useState<Record<ShipClass,Partial<Record<ModuleSlot,string>>>>({
  scout:{},fighter:{},warship:{}
 });
 const selected=selectedByClass[shipClass];
 const setSelected=useCallback((update:React.SetStateAction<Partial<Record<ModuleSlot,string>>>)=>{
  setSelectedByClass(prev=>({...prev,[shipClass]:
   typeof update==='function'?update(prev[shipClass]):update
  }));
 },[shipClass]);
 const [details,setDetails]=useState(true);
 const chooseLevel=useCallback((value:number)=>{
  setLevel(value);
  // A lower sandbox level trims locked options for ALL class drafts,
  // ensuring that a subsequent class switch always resolves to valid geometry.
  setSelectedByClass(prev=>Object.fromEntries(
   (Object.keys(prev) as ShipClass[]).map(cls=>[cls,Object.fromEntries(
    Object.entries(prev[cls]).filter(([key,id])=>
     SHIP_MODULES.some(m=>m.slot===key&&m.id===id&&m.minLevel<=value))
   )])
  ) as Record<ShipClass,Partial<Record<ModuleSlot,string>>>);
 },[]);
 useEffect(()=>{onPreview({shipClass,level,modules:selected});},[shipClass,level,selected,onPreview]);
 const items=SHIP_MODULES.filter(m=>m.slot===slot);
 const active=selected[slot]??DEFAULT_MODULES[slot];
 const draftLoadout:ShipLoadout={shipClass,level,modules:selected};
 // The level slider is a preview-only control. It cannot authorize real upgrades.
 // Any real equip action requires a separately verified player level AND ownership.
 const verifiedLevelMatches=typeof verifiedPlayerLevel==='number'
  &&Number.isInteger(verifiedPlayerLevel)&&verifiedPlayerLevel>=1
  &&verifiedPlayerLevel<=20&&verifiedPlayerLevel===level;
 const equipEnabled=!!onEquip&&!!ownedModuleIds&&!!ownedShipClasses&&ownedShipClasses.has(shipClass)&&verifiedLevelMatches
  &&SLOTS.every(s=>mayEquip(selected[s]??DEFAULT_MODULES[s],verifiedPlayerLevel,ownedModuleIds));
 const equipVerified=()=>{
  if(onEquip&&ownedModuleIds&&ownedShipClasses&&equipEnabled&&verifiedPlayerLevel!==undefined){
   onEquip(validateOwnedFleetForPlayer(draftLoadout,ownedModuleIds,verifiedPlayerLevel,ownedShipClasses));
  }
 };
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
   <small>{SHIP_CLASSES[shipClass].description} · {progressionTier(level).toUpperCase()} TIER · {ownedShipClasses?.has(shipClass)?'VERIFIED FLEET HULL':'HULL PREVIEW ONLY'}</small>
  </div>
  <div className="shipyard-orbit-hint" aria-hidden="true">↔ DRAG TO ROTATE · PINCH TO ZOOM</div>
  {onViewChange&&<div className="shipyard-camera-presets" role="group" aria-label="3D ship viewing angle">
   {SHIPYARD_VIEWS.map(view=><button type="button" key={view.id} aria-pressed={cameraView===view.id}
    className={cameraView===view.id?'active':''} onClick={()=>{setCameraView(view.id);onViewChange(view.id);}}
    aria-label={'Show '+view.label+' view of the preview ship'}>{view.label}</button>)}
  </div>}
  <div className="shipyard-panel">
   <div className="shipyard-level">
    <label htmlFor="shipyard-level">DEMO PREVIEW LEVEL <strong>{level} / 20</strong></label>
    <input id="shipyard-level" type="range" min={1} max={20} step={1} value={level}
      onChange={event=>chooseLevel(Number(event.target.value))}/>
    <span>Levels demonstrate visual unlock gates only — no player progress is saved.</span>
   </div>
   <div className="shipyard-slot-strip" role="group" aria-label="Ship module categories">
    {SLOTS.map(current=><button type="button" key={current} aria-pressed={slot===current}
      className={slot===current?'active':''} onClick={()=>{
       setSlot(current);
       // Retarget only when the user deliberately enabled close-up inspection.
       if(focusedSlot!==null){setFocusedSlot(current);onFocusSlot?.(current);}
      }}>{SLOT_NAMES[current]}</button>)}
   </div>
   <div className="shipyard-parts-header"><strong>{SLOT_NAMES[slot]} MODULES</strong><div className="shipyard-parts-tools">
    {onFocusSlot&&<button type="button" className="shipyard-part-focus" aria-pressed={focusedSlot===slot}
     aria-label={focusedSlot===slot?'Return to full ship view':'Inspect '+SLOT_NAMES[slot]+' in close-up 3D'}
     onClick={()=>{const next=focusedSlot===slot?null:slot;setFocusedSlot(next);onFocusSlot(next);}}>
     {focusedSlot===slot?'FULL SHIP':'FOCUS '+SLOT_NAMES[slot]}
    </button>}
    <button type="button" onClick={()=>setSelected(highestUnlockedPreviewModules(level))}
     aria-label="Preview highest unlocked modules at this demo level, without granting ownership">MAX LEVEL PREVIEW</button>
    <button type="button" onClick={()=>setSelected({})} aria-label="Reset preview modules for this ship class only">RESET CLASS</button>
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
   {onEquip&&<button type="button" className="shipyard-equip" disabled={!equipEnabled} onClick={equipVerified} aria-label="Equip only a verified owned ship class with fully owned and level-unlocked modules">
    {equipEnabled?'EQUIP VERIFIED FLEET':!verifiedLevelMatches?'EQUIP UNAVAILABLE — VERIFIED LEVEL REQUIRED':!ownedShipClasses?.has(shipClass)?'EQUIP UNAVAILABLE — SHIP CLASS NOT OWNED':'EQUIP UNAVAILABLE — MODULE OWNERSHIP REQUIRED'}
   </button>}
   <p className="shipyard-legal">VISUAL SANDBOX ONLY · Each hull keeps its own preview parts until the editor closes. MAX LEVEL PREVIEW is not an inventory grant. Level unlocks are not purchases or ownership. Preview changes are not saved and do not affect battle. {ownedModuleIds?'Ownership data supplied by the connected game service.':'Module ownership verification is not connected.'} {ownedShipClasses?.has(shipClass)?'Ship class ownership verified.':'Ship class ownership not verified.'} {verifiedLevelMatches?'Preview matches the verified player level.':'The preview slider cannot replace a verified player level.'}</p>
  </div>
 </section>;
}
