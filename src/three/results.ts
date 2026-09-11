import {rewardClear,MISSIONS} from './campaign';
import type {Save} from './campaign';
export function awardStage(save:Save,mission:number,seconds:number,hp:number,maxHp:number){
 const time=Math.max(0,Number.isFinite(seconds)?seconds:0),health=Math.max(0,Math.min(1,maxHp>0?hp/maxHp:0));
 const base=rewardClear(save,mission),target=MISSIONS[mission].parTime;
 const timeBonus=target?Math.round(base*.25*Math.max(0,1-time/target)):0;
 const healthBonus=Math.round(base*.25*health),total=base+timeBonus+healthBonus;
 save.credits+=timeBonus+healthBonus;
 return {time,healthPercent:Math.round(health*100),base,timeBonus,healthBonus,total,target,replay:base===0};
}
export type StageResult=ReturnType<typeof awardStage>&{tanks:number;infantry:number};
