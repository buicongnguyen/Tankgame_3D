import type {Game,Unit} from './game';
import type {Point} from './rules';
import {distance,clamp} from './rules';
import type {StageLayout} from './stage-layout';
import {routeSample,projectRoute} from './stage-layout';

export const ESCORT={health:1040,startRadius:36};
/** Keep every branch's deployment clear, including the returning leg of an O loop. */
export function escortStartClear(layout:Pick<StageLayout,'points'|'spawn'>,p:Point){
 return distance(p,layout.points[0])>=ESCORT.startRadius&&distance(p,layout.spawn)>=ESCORT.startRadius;
}
export function escortEncounterMeters(layout:StageLayout){
 const candidates:number[]=[];
 for(let meters=12;meters<=layout.length-8;meters+=2){if(escortStartClear(layout,routeSample(layout.points,meters)))candidates.push(meters);}
 if(!candidates.length)throw new Error('Escort route needs space beyond its deployment zone');
 return [0,1/3,2/3,1,.95].map(f=>candidates[Math.round(clamp(f,0,1)*(candidates.length-1))]);
}

/** Waiting ambushes are local to the traveled branch, even when a folded route is in sight. */
export function escortReady(g:Game,u:Unit){
 if(!g.convoy||!u.encounter)return true;
 const player=g.player.visual.root.position;
 if(distance(player,u.visual.root.position)<12||distance(g.convoy.position,u.visual.root.position)<12)return true;
 const layout=g.world.layout,forward=projectRoute(layout.points,player);
 const reverse=layout.closed&&(g.convoyReverse??forward.progress>layout.length/2);
 const path=reverse?[...layout.points].reverse():layout.points,projection=reverse?projectRoute(path,player):forward;
 const traveled=Math.max(g.convoyDistance,projection.distance<18?projection.progress:0),sector=reverse?layout.length-u.encounter.meters:u.encounter.meters;
 return traveled>=Math.max(8,sector-24);
}
