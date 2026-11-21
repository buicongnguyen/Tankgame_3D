import type { Game, Unit } from './game';
import { angleGap } from './rules';
import { holdDistance } from './surprise';

/**
 * Campaign squad tactics for hostile tanks that have the player in sight.
 *
 *  - The first tank of a group is the anvil: it holds the firing line at range (the original behaviour).
 *  - Every other tank is a flanker: it swings wide, left and right in turn, until it is outside the
 *    front arc of the player's gun, then holds there. Turn the turret on it and it moves again.
 *  - A badly damaged light tank falls back to long range and keeps firing.
 *
 * Easy keeps the original head-on behaviour apart from the fall-back, so first battles stay readable.
 * Returns null when the unit should use the default movement.
 */
export const FLANK_ARC = 1.75;          // radians from the player's gun: past this the flanker has its angle
export const FALL_BACK_HEALTH = .35;
export const FALL_BACK_RANGE = 27;

const fightingTank = (e: Unit) => !e.dead && !e.pending && e.encounter?.active !== false && (e.role === 'raider' || e.role === 'heavy');

export function squadTactic(g: Game, e: Unit, index: number, dist: number): { advance: number; side: number } | null {
  if (e.role !== 'raider' && e.role !== 'heavy') return null;
  if (e.role === 'raider' && e.hp < e.max * FALL_BACK_HEALTH) {
    if (!g.tacticCalls.fallBack) { g.tacticCalls.fallBack = true; g.radioMessage('MARA / That one is hurt and pulling back. Finish it before it recovers its nerve.', 4); }
    return { advance: dist < FALL_BACK_RANGE ? -.8 : 0, side: (index % 2 ? 1 : -1) * .35 };
  }
  if (g.save.difficulty === 'easy') return null;
  const p = e.visual.root.position;
  let rank = 0;
  for (let i = 0; i < index; i++) {
    const o = g.enemies[i];
    if (fightingTank(o) && o.visual.root.position.distanceToSquared(p) < 45 * 45) rank++;
  }
  if (rank === 0) return null;
  const player = g.player.visual.root.position;
  const bearing = Math.atan2(p.x - player.x, p.z - player.z);
  const flanked = angleGap(bearing, g.player.aim) > FLANK_ARC;
  if (!g.tacticCalls.flank) { g.tacticCalls.flank = true; g.radioMessage('IVO / They are splitting up. One is circling for your rear armor.', 4); }
  return { advance: dist > holdDistance(g, e, 15) ? .75 : dist < 10 ? -.55 : 0, side: flanked ? 0 : (rank % 2 ? 1 : -1) * .95 };
}
