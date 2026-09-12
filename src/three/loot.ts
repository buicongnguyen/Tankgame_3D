import {WEAPONS} from './armory';
import {ammoCapacity} from './skins';
import {normalizeDifficulty} from './difficulty';
export type LootKind='health'|'shield'|'laser'|'arc';
export const DROP_CHANCE=1/3;
const AMMO_WEAPONS=WEAPONS.filter(w=>w.ammoSlot!==undefined).sort((a,b)=>a.ammoSlot!-b.ammoSlot!);
export const AMMO_CAPS=AMMO_WEAPONS.map(w=>w.capacity!);
export const ammoCaps=(skin:string)=>AMMO_WEAPONS.map(w=>ammoCapacity(skin,w.capacity!,w.flame));
export function salvageReward(roll:number,difficulty:string,level:number):{kind:LootKind;amount:number}{
 const kind:LootKind=roll<.35?'health':roll<.55?'shield':roll<.80?'laser':'arc';
 const tier=normalizeDifficulty(difficulty)??'normal';
 const base={easy:{health:60,shield:6,laser:8,arc:4},normal:{health:45,shield:4,laser:6,arc:3},hard:{health:32,shield:3,laser:4,arc:2},crazy:{health:26,shield:2.5,laser:3,arc:2}}[tier];
 const amount=kind==='health'?Math.round(base.health*(level===2?.67:level===1?.85:1)):kind==='shield'?Math.max(2,base.shield-level*.5):kind==='laser'?Math.max(2,base.laser-level):Math.max(1,base.arc-Math.floor(level/2));
 return {kind,amount};
}
