import type { Game, Unit } from './game';

/** Rules that give distance and surprise value on Easy and Normal. Hard and Crazy keep the old behaviour, and
 *  the tutorial and skirmish matches are never touched, so scripted runs there stay identical. */
const SOFT = (g: Game) => !g.skirmish && !g.training && (g.save.difficulty === 'easy' || g.save.difficulty === 'normal');
const isTank = (u: Unit) => u.role === 'raider' || u.role === 'heavy';

/** Metres at which a hostile tank stops advancing, and the range inside which it fires. The gap lets a player
 *  who keeps about 34-40 m shoot without being shot (hit and run). */
export const KITE = { easy: { hold: 24, fire: 32 }, normal: { hold: 26, fire: 35 } } as const;
export function holdDistance(g: Game, e: Unit, base: number) {
  return SOFT(g) && isTank(e) ? KITE[g.save.difficulty as 'easy' | 'normal'].hold : base;
}
export function fireRange(g: Game, e: Unit, base: number) {
  return SOFT(g) && isTank(e) ? KITE[g.save.difficulty as 'easy' | 'normal'].fire : base;
}

/** The group nearest the start notices the tank a little later, so the first contact is a choice. */
export const OPENING_SIGHT = { easy: .85, normal: .92 } as const;
export function sightRange(g: Game, e: Unit, base: number) {
  if (!SOFT(g) || e.encounter?.group !== 0 || e.role === 'boss') return base;
  return base * OPENING_SIGHT[g.save.difficulty as 'easy' | 'normal'];
}

/** The first hit on an enemy that has not noticed the tank does 50% more damage. */
export const AMBUSH_MULTIPLIER = 1.5;
export function isAmbush(g: Game, unit: Unit) {
  return SOFT(g) && !unit.pending && unit.role !== 'boss' && unit.team !== 'ally' && unit.encounter?.active === false;
}
