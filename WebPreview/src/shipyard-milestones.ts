import { SHIP_MODULES, progressionTier, type ShipModule } from './ship-modules';

/**
 * Visual-only progression navigator. Levels are demo preview gates, NOT a
 * player-level source. Module unlocks are NOT acquisition or ownership.
 *
 * All milestones are derived from the existing canonical 27-module catalogue;
 * adding a new module creates its milestone without another hardcoded list.
 */
export type VisualUnlockMilestone = {
  level: number;
  modules: readonly ShipModule[];
};

export const VISUAL_UNLOCK_LEVELS: readonly number[] = Object.freeze(
  [...new Set(SHIP_MODULES.map(module => module.minLevel))]
    .sort((a, b) => a - b)
);

export function visualUnlocksAtLevel(level: number): readonly ShipModule[] {
  progressionTier(level);
  return SHIP_MODULES.filter(module => module.minLevel === level);
}

function milestoneAt(level: number): VisualUnlockMilestone {
  return { level, modules: visualUnlocksAtLevel(level) };
}

/** Next actual visual unlock after this preview level, or null at level 20. */
export function nextVisualUnlock(level: number): VisualUnlockMilestone | null {
  progressionTier(level);
  const next = VISUAL_UNLOCK_LEVELS.find(milestone => milestone > level);
  return next === undefined ? null : milestoneAt(next);
}

/** Previous visual unlock below this level, or null at level 1. */
export function previousVisualUnlock(level: number): VisualUnlockMilestone | null {
  progressionTier(level);
  for (let i = VISUAL_UNLOCK_LEVELS.length - 1; i >= 0; i--) {
    if (VISUAL_UNLOCK_LEVELS[i] < level) return milestoneAt(VISUAL_UNLOCK_LEVELS[i]);
  }
  return null;
}
