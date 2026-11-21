import { resolveLoadout, SLOTS, type ModuleSlot, type ShipClass } from './ship-modules';
import type { PreviewDraft } from './shipyard-history';

/** A temporary, visual-only A/B baseline. It is not a saved fleet, entitlement,
 * purchase, unlocked item, authenticated level or combat loadout. */
const CLASSES: readonly ShipClass[] = ['scout', 'fighter', 'warship'];

export function capturePreviewReference(draft: PreviewDraft): PreviewDraft {
 if (!CLASSES.includes(draft.shipClass)) throw new Error('Unknown preview class');
 const selectedByClass = {} as PreviewDraft['selectedByClass'];
 for (const shipClass of CLASSES) {
  const selections = draft.selectedByClass[shipClass];
  if (!selections) throw new Error('Missing preview class selection');
  // Validate all three class drafts before accepting a pinned snapshot.
  // In particular, a level-locked or unknown module cannot be smuggled into A.
  resolveLoadout({ shipClass, level: draft.level, modules: selections });
  selectedByClass[shipClass] = { ...selections };
 }
 return { shipClass: draft.shipClass, level: draft.level, selectedByClass };
}

export type PreviewComparison = {
 classChanged: boolean;
 levelChanged: boolean;
 changedSlots: readonly ModuleSlot[];
};

/** Compare the two visible ships, using default modules for omitted slots.
 * Equal silhouettes do not imply either ship is owned or equippable. */
export function comparePreviewReference(
 pinned: PreviewDraft, working: PreviewDraft
): PreviewComparison {
 const a = resolveLoadout({
  shipClass: pinned.shipClass, level: pinned.level,
  modules: pinned.selectedByClass[pinned.shipClass]
 });
 const b = resolveLoadout({
  shipClass: working.shipClass, level: working.level,
  modules: working.selectedByClass[working.shipClass]
 });
 return {
  classChanged: a.shipClass !== b.shipClass,
  levelChanged: a.level !== b.level,
  changedSlots: SLOTS.filter(slot => a.modules[slot] !== b.modules[slot])
 };
}
