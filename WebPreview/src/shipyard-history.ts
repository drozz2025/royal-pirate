import type { ModuleSlot, ShipClass } from './ship-modules';

/**
 * Local, short-lived visual editing history. It stores no accounts, purchases,
 * ownership, balances or battle state; closing the shipyard discards everything.
 */
export type PreviewDraft = {
 shipClass: ShipClass;
 level: number;
 selectedByClass: Record<ShipClass, Partial<Record<ModuleSlot, string>>>;
};
export type PreviewHistory = { snapshots: PreviewDraft[]; index: number };
export const PREVIEW_HISTORY_LIMIT = 30;

const CLASSES: readonly ShipClass[] = ['scout', 'fighter', 'warship'];

function snapshot(draft: PreviewDraft): PreviewDraft {
 return {
  shipClass: draft.shipClass,
  level: draft.level,
  selectedByClass: {
   scout: { ...draft.selectedByClass.scout },
   fighter: { ...draft.selectedByClass.fighter },
   warship: { ...draft.selectedByClass.warship }
  }
 };
}

export function createPreviewHistory(): PreviewHistory {
 return { snapshots: [snapshot({
  shipClass: 'fighter', level: 1,
  selectedByClass: { scout: {}, fighter: {}, warship: {} }
 })], index: 0 };
}
export function currentPreview(history: PreviewHistory): PreviewDraft {
 return history.snapshots[history.index];
}
function equalDraft(a: PreviewDraft, b: PreviewDraft): boolean {
 return a.shipClass === b.shipClass && a.level === b.level &&
  CLASSES.every(shipClass => {
   const left = a.selectedByClass[shipClass], right = b.selectedByClass[shipClass];
   const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
   return [...keys].every(key => left[key as ModuleSlot] === right[key as ModuleSlot]);
  });
}
/** A new edit clears only the redo path. Repeated selection is not an edit.
 * History has a strict upper bound to keep phone memory and UI work limited. */
export function recordPreview(history: PreviewHistory, next: PreviewDraft): PreviewHistory {
 if (!Number.isInteger(next.level) || next.level < 1 || next.level > 20)
  throw new RangeError('Preview level must be an integer 1–20');
 if (!CLASSES.includes(next.shipClass))
  throw new Error('Unknown preview ship class');
 if (equalDraft(currentPreview(history), next)) return history;
 const snapshots = [...history.snapshots.slice(0, history.index + 1), snapshot(next)];
 if (snapshots.length > PREVIEW_HISTORY_LIMIT)
  snapshots.splice(0, snapshots.length - PREVIEW_HISTORY_LIMIT);
 return { snapshots, index: snapshots.length - 1 };
}
export function undoPreview(history: PreviewHistory): PreviewHistory {
 return history.index > 0 ? { ...history, index: history.index - 1 } : history;
}
export function redoPreview(history: PreviewHistory): PreviewHistory {
 return history.index < history.snapshots.length - 1 ?
  { ...history, index: history.index + 1 } : history;
}
export function canUndoPreview(history: PreviewHistory): boolean { return history.index > 0; }
export function canRedoPreview(history: PreviewHistory): boolean {
 return history.index < history.snapshots.length - 1;
}
