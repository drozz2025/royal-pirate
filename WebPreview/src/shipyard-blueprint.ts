import { SLOTS, type ModuleSlot, type ShipClass } from './ship-modules';
import type { PreviewDraft } from './shipyard-history';
import { capturePreviewReference } from './shipyard-reference';

/** A portable VISUAL-ONLY recipe for the temporary 3D editor.
 * It carries no ownership, economy, account, inventory or player progression.
 * A design code may be previewed at any catalogue-eligible level; it NEVER
 * authorizes a purchase, an equip action or a saved player level.
 */
export const BLUEPRINT_PREFIX = 'RPV1.';
export const BLUEPRINT_MAX_CHARS = 4096;
const CLASSES: readonly ShipClass[] = ['scout','fighter','warship'];

function record(value: unknown): value is Record<string, unknown> {
 return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
 const found = Object.keys(value);
 return found.length === keys.length && found.every(key => keys.includes(key));
}

/** Export only the four explicitly approved visual fields, never extra data. */
export function encodePreviewBlueprint(draft: PreviewDraft): string {
 const checked = capturePreviewReference(draft);
 const text = JSON.stringify({
  version: 1, shipClass: checked.shipClass, level: checked.level,
  selectedByClass: checked.selectedByClass
 });
 const code = BLUEPRINT_PREFIX + btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(code.length > BLUEPRINT_MAX_CHARS) throw new Error('Visual blueprint too long');
 return code;
}

/** Strict decode at the trust boundary: reject extra keys and invalid modules
 * rather than silently accepting ownership fields or levels beyond 1–20.
 * It returns a fresh memory-only draft, NOT a verified game loadout.
 */
export function decodePreviewBlueprint(input: string): PreviewDraft {
 const code = input.trim();
 if(code.length > BLUEPRINT_MAX_CHARS || code.length < BLUEPRINT_PREFIX.length+4
  || !code.startsWith(BLUEPRINT_PREFIX)) throw new Error('Invalid visual blueprint code');
 const encoded = code.slice(BLUEPRINT_PREFIX.length);
 if(!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Invalid visual blueprint code');
 let value: unknown;
 try {
  const base64=encoded.replace(/-/g,'+').replace(/_/g,'/');
  value=JSON.parse(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')));
 } catch { throw new Error('Invalid visual blueprint encoding'); }
 if(!record(value) || !exactKeys(value,['version','shipClass','level','selectedByClass'])
  || value.version!==1) throw new Error('Unexpected visual blueprint format');
 if(typeof value.shipClass!=='string' || !CLASSES.includes(value.shipClass as ShipClass))
  throw new Error('Unknown preview class');
 if(typeof value.level!=='number' || !Number.isInteger(value.level)
  || value.level<1 || value.level>20) throw new Error('Preview level must be 1–20');
 if(!record(value.selectedByClass) || !exactKeys(value.selectedByClass,CLASSES))
  throw new Error('Visual blueprint requires all three ship classes');
 const selections={} as PreviewDraft['selectedByClass'];
 for(const cls of CLASSES){
  const modules=value.selectedByClass[cls];
  if(!record(modules)) throw new Error('Invalid visual module selection');
  const picked:Partial<Record<ModuleSlot,string>>={};
  for(const [slot,id] of Object.entries(modules)){
   if(!SLOTS.includes(slot as ModuleSlot) || typeof id!=='string')
    throw new Error('Unknown visual module slot');
   picked[slot as ModuleSlot]=id;
  }
  selections[cls]=picked;
 }
 // Validates every slot ID and its catalogue level gate in every class.
 return capturePreviewReference({
  shipClass:value.shipClass as ShipClass,level:value.level,
  selectedByClass:selections
 });
}
