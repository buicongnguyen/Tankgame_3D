import {escortReady} from './escort';
import {ENEMY_SIGHT} from './combat-ranges';
import type {Game,Unit} from './game';
import type {Point} from './rules';
import {distance,segmentBox} from './rules';
import {projectRoute} from './stage-layout';

export interface EncounterOrder {group:number;anchor:Point;meters:number;active:boolean;wakeAt?:number;}
/** Trunk/obstacle footprints block sight; destroyed cover immediately opens a firing lane. */
export function clearSight(g:Game,from:Point,to:Point){
 return !g.world.covers.some(c=>c.hp>0&&segmentBox(from,to,c,.08)!==null);
}
export function seesTarget(g:Game,unit:Unit,target:Point){
 return distance(unit.visual.root.position,target)<(g.isInfantry(unit)?ENEMY_SIGHT.infantry:unit.role==='boss'?ENEMY_SIGHT.boss:ENEMY_SIGHT.vehicle)&&clearSight(g,unit.visual.root.position,target);
}
export class RouteEncounters {
 progress=0;scanAt=0;view?:Point;convoyView?:Point;revision=-1;
 reset(){this.progress=0;this.scanAt=0;this.view=undefined;this.convoyView=undefined;this.revision=-1;}
 alert(g:Game,unit:Unit,source:Point=g.player.visual.root.position){
  const order=unit.encounter;
  for(const other of order?g.enemies.filter(e=>e.encounter?.group===order.group&&distance(e.visual.root.position,unit.visual.root.position)<48):[unit]){
   if(other.dead)continue;
   if(other.encounter)other.encounter.active=true;
   other.lastSeen={x:source.x,z:source.z};other.searchUntil=g.elapsed+6;
  }
 }
 update(g:Game){
  const layout=g.world.layout,player=g.player.visual.root.position,projection=projectRoute(layout.points,player);
  if(projection.distance<13)this.progress=Math.max(this.progress,projection.progress);
  const scan=this.revision!==g.world.navigationRevision||g.elapsed>=this.scanAt||!this.view||distance(player,this.view)>1.5||!!g.convoy&&(!this.convoyView||distance(g.convoy.position,this.convoyView)>1.5);
  if(scan){this.revision=g.world.navigationRevision;this.scanAt=g.elapsed+.18;this.view={x:player.x,z:player.z};this.convoyView=g.convoy?{x:g.convoy.position.x,z:g.convoy.position.z}:undefined;}
  for(const u of g.enemies){const order=u.encounter;if(u.dead||!order||order.active)continue;
   // Timed defense waves still march from the perimeter, even before spotting Kestrel.
   if(order.wakeAt!==undefined){if(g.elapsed>=order.wakeAt)order.active=true;continue;}
   if(!scan||!escortReady(g,u))continue;
   if(seesTarget(g,u,player))this.alert(g,u,player);
   else if(g.convoy&&seesTarget(g,u,g.convoy.position))this.alert(g,u,g.convoy.position);
  }
 }
}
