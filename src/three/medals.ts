import { MISSIONS } from './campaign';
import type { Save } from './campaign';

/** Three optional goals per level. Earning one pays a small one-time bonus and is kept in the save. */
export const MEDAL_REWARD = 25;
export const REAR_HITS_NEEDED = 3;
export const OBJECTIVE_SHARE = .6;

export interface Medal { id: string; name: string; goal: string; }
/** What a finished level reports for its medals. */
export interface MedalRun {
  kind: string;
  time: number; target: number;
  rearHits: number;
  supportCalls: number;
  /** Remaining share (0..1) of the transport or relay; 1 when the mission has neither. */
  objectiveShare: number;
  squadSurvivors: number;
}

const SWIFT: Medal = { id: 'swift', name: 'Swift', goal: 'Finish inside the target time' };
const BULWARK: Medal = { id: 'bulwark', name: 'Bulwark', goal: 'Keep the uplink above 60%' };
const FLANKER: Medal = { id: 'flanker', name: 'Flanker', goal: 'Land 3 rear-armor hits' };
const LONE: Medal = { id: 'lone', name: 'Self-reliant', goal: 'Win without Strike or supply drops' };
const SQUAD: Medal = { id: 'squad', name: 'No one left', goal: 'Bring both rescued tanks home' };
const PASSAGE: Medal = { id: 'passage', name: 'Safe passage', goal: 'Keep the transport above 60%' };

export function medalsFor(kind: string, target: number): [Medal, Medal, Medal] {
  return [kind !== 'defense' && target > 0 ? SWIFT : BULWARK, FLANKER, kind === 'rescue' ? SQUAD : kind === 'escort' ? PASSAGE : LONE];
}

export function medalsEarned(run: MedalRun): boolean[] {
  return medalsFor(run.kind, run.target).map(m =>
    m === SWIFT ? run.time <= run.target
    : m === BULWARK || m === PASSAGE ? run.objectiveShare >= OBJECTIVE_SHARE
    : m === FLANKER ? run.rearHits >= REAR_HITS_NEEDED
    : m === SQUAD ? run.squadSurvivors >= 2
    : run.supportCalls === 0);
}

const slot = (mission: number, level: number) => mission * 3 + level;
/** Medals held for a level, as three flags. */
export function heldMedals(save: Save, mission: number, level: number): boolean[] {
  const bits = save.medals?.[slot(mission, level)] ?? 0;
  return [0, 1, 2].map(i => (bits & (1 << i)) !== 0);
}
export function medalCount(save: Save, mission: number): number {
  return [0, 1, 2].reduce((n, level) => n + heldMedals(save, mission, level).filter(Boolean).length, 0);
}
/** Record this run's medals. Returns which ones are new. */
export function recordMedals(save: Save, mission: number, level: number, earned: boolean[]): boolean[] {
  const medals = save.medals = normalizeMedals(save.medals), i = slot(mission, level), before = medals[i];
  earned.forEach((yes, bit) => { if (yes) medals[i] |= 1 << bit; });
  return earned.map((yes, bit) => yes && (before & (1 << bit)) === 0);
}
export function normalizeMedals(value: unknown): number[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: MISSIONS.length * 3 }, (_, i) => Number.isInteger(source[i]) ? source[i] & 7 : 0);
}
