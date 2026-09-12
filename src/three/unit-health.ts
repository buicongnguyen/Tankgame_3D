import {clamp} from './rules';

export const ENEMY_HEALTH = {
  rifleman:35,
  rocketeer:55,
  jeep:75,
  raider:110,
  sentry:150,
  heavy:240,
} as const;
export type GroundEnemyRole = keyof typeof ENEMY_HEALTH;

/** Only armored tanks gain campaign durability; difficulty still controls numbers. */
export function enemyHealth(role:GroundEnemyRole,stage:number,level:number){
  const base=ENEMY_HEALTH[role];
  if(role==='rifleman'||role==='rocketeer'||role==='jeep')return base;
  // One percent per campaign level, capped at +50% for future stage additions.
  // Independent of the player's purchases, so upgrades always improve damage.
  const progress=clamp(Math.max(0,stage)*3+clamp(level,0,2),0,50);
  return Math.round(base*(1+progress*.01)/5)*5;
}
