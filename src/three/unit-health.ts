import {clamp} from './rules';

export const ENEMY_HEALTH = {
  rifleman:70,
  rocketeer:110,
  jeep:150,
  raider:220,
  sentry:300,
  heavy:480,
} as const;
export type GroundEnemyRole = keyof typeof ENEMY_HEALTH;

/** All non-boss enemies scale with campaign progress; difficulty controls numbers. */
export function enemyHealth(role:GroundEnemyRole,stage:number,level:number){
  const base=ENEMY_HEALTH[role];
  // Two percent per campaign level, capped at +100% for future stage additions.
  // Independent of the player's purchases, so upgrades always improve damage.
  const progress=clamp(Math.max(0,stage)*3+clamp(level,0,2),0,50);
  return Math.round(base*(1+progress*.02));
}
