import {clamp} from './rules';

export const ENEMY_HEALTH = {
  rifleman:70,
  rocketeer:110,
  jeep:150,
  raider:220,
  sentry:300,
  heavy:480,
  airlift:260,
} as const;
export type GroundEnemyRole = keyof typeof ENEMY_HEALTH;

/** Normal-mode base HP scales with campaign progress; spawning applies the difficulty HP multiplier. */
export function enemyHealth(role:GroundEnemyRole,stage:number,level:number){
  const base=ENEMY_HEALTH[role];
  // Transports keep one flat value, so every battlefield offers the same window to down them on the ground.
  if(role==='airlift')return base;
  // Two percent per campaign level, capped at +100% for future stage additions.
  // Independent of the player's purchases, so upgrades always improve damage.
  const progress=clamp(Math.max(0,stage)*3+clamp(level,0,2),0,50);
  return Math.round(base*(1+progress*.02));
}
