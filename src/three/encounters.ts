import type {Game,Unit} from './game';
import type {Point} from './rules';
import {distance} from './rules';
import {projectRoute} from './stage-layout';

export interface EncounterOrder {group:number;anchor:Point;meters:number;active:boolean;wakeAt?:number;}
/** Preplaced units retain their objective counts while waiting for the player's approach. */
export class RouteEncounters {
 progress=0;
 reset(){this.progress=0;}
 alert(g:Game,unit:Unit){const order=unit.encounter;if(!order||order.active)return;for(const other of g.enemies)if(other.encounter?.group===order.group)other.encounter.active=true;}
 update(g:Game){
  const layout=g.world.layout,player=g.player.visual.root.position,projection=projectRoute(layout.points,player);
  if(projection.distance<13)this.progress=Math.max(this.progress,projection.progress);
  const progress=Math.max(this.progress,g.convoyDistance);
  for(const u of g.enemies){const order=u.encounter;if(u.dead||!order||order.active)continue;
   const wakeDistance=layout.closed?22:28,near=distance(player,order.anchor)<wakeDistance||!!g.convoy&&distance(g.convoy.position,order.anchor)<wakeDistance;
   if(order.wakeAt!==undefined?g.elapsed>=order.wakeAt:layout.closed?near:near&&progress>=order.meters-24||progress>order.meters+18)this.alert(g,u);
  }
 }
}
