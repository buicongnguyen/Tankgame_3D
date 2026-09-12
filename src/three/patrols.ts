import {ESCORT,escortStartClear} from './escort';
import type {Game,Unit} from './game';
import type {Point} from './rules';
import {circleBox,distance,segmentBox,segmentCircle,turnToward} from './rules';
import {projectRoute,routeSample} from './stage-layout';
export interface PatrolOrder {home:Point;radius:number;points:Point[];index:number;wait:number;repath:number;waypoint?:Point;revision:number;stuck:number;returning?:boolean;}
export function assignPatrol(g:Game,u:Unit,index:number){
 if(u.role==='boss'||u.role==='rocketeer'||u.encounter?.wakeAt!==undefined)return;
 const infantry=g.isInfantry(u),home={x:u.visual.root.position.x,z:u.visual.root.position.z},layout=g.world.layout,projection=projectRoute(layout.points,home);
 if(infantry?index%3!==0:u.role!=='jeep'&&projection.distance<=8&&index%2===0)return;
 const radius=infantry?6:projection.distance>8?Math.min(26,projection.distance+8):10,road=routeSample(layout.points,projection.progress),span=infantry?2.4:Math.min(9,radius/2),reach=Math.min(1,radius*.85/Math.max(1,projection.distance)),approach={x:home.x+(road.x-home.x)*reach,z:home.z+(road.z-home.z)*reach};
 const candidates=[{x:approach.x+road.dx*span,z:approach.z+road.dz*span},{x:approach.x-road.dx*span,z:approach.z-road.dz*span},{x:home.x+road.dx*radius*.7,z:home.z+road.dz*radius*.7},{x:home.x-road.dx*radius*.7,z:home.z-road.dz*radius*.7}];
 const points=[home];
 for(const p of candidates){
  if(g.convoy&&(!escortStartClear(layout,p)||segmentCircle(home,p,layout.points[0],ESCORT.startRadius)!==null||segmentCircle(home,p,layout.spawn,ESCORT.startRadius)!==null))continue;
  if(Math.abs(p.x)>69||Math.abs(p.z)>57||distance(home,p)>radius||distance(home,p)<2||Math.abs(projectRoute(layout.points,p).progress-(u.encounter?.meters??projection.progress))>Math.max(32,layout.length*.14)||g.world.covers.some(c=>c.hp>0&&circleBox(p,g.unitRadius(u)+.15,c))||g.navigation.next(g.world,home,p)===null)continue;
  points.push(p);if(points.length===4)break;
 }
 if(points.length>1)u.patrol={home,radius,points,index:1,wait:.8+index%4*.3,repath:0,revision:-1,stuck:0};
}
export function updatePatrol(g:Game,u:Unit,dt:number){
 const patrol=u.patrol;u.visual.root.userData.walking=false;u.visual.beam.visible=false;
 if(!patrol||dt<=0)return;
 if(patrol.wait>0){patrol.wait-=dt;u.aim=turnToward(u.aim,u.heading+Math.sin(g.elapsed)*.6,dt*.7);g.moveUnit(u,0,0,dt);g.syncVisual(u);return;}
 const p=u.visual.root.position,target=patrol.points[patrol.index];
 const next=()=>{patrol.index=(patrol.index+1)%patrol.points.length;patrol.wait=1.4;patrol.stuck=0;patrol.waypoint=undefined;};
 if(distance(p,target)<.8){patrol.returning=false;next();return;}
 const blocked=g.world.covers.some(c=>c.hp>0&&segmentBox(p,target,c,g.unitRadius(u)+.15)!==null);
 patrol.repath-=dt;let toward=target;
 if(blocked){
  if(!patrol.waypoint||patrol.repath<=0||distance(p,patrol.waypoint)<.6||patrol.revision!==g.world.navigationRevision){patrol.waypoint=g.navigation.next(g.world,p,target)??undefined;patrol.repath=.65;patrol.revision=g.world.navigationRevision;}
  if(!patrol.waypoint){next();return;}toward=patrol.waypoint;
 }
 const heading=Math.atan2(toward.x-p.x,toward.z-p.z),speed=g.isInfantry(u)?1.4:u.role==='jeep'?3.2:1.9,step=Math.min(distance(p,toward),speed*dt),dx=Math.sin(heading)*step,dz=Math.cos(heading)*step,before={x:p.x,z:p.z};
 if(g.convoy&&!patrol.returning&&!escortStartClear(g.world.layout,{x:p.x+dx,z:p.z+dz})){next();return;}
 const homeDistance=distance(p,patrol.home),nextHomeDistance=distance({x:p.x+dx,z:p.z+dz},patrol.home);
 if(patrol.returning||nextHomeDistance<=patrol.radius+2||nextHomeDistance<homeDistance)g.moveUnit(u,dx,dz,dt);
 patrol.stuck=distance(p,before)<.001?patrol.stuck+dt:0;
 if(patrol.stuck>2.5){if(patrol.returning){patrol.stuck=0;patrol.waypoint=undefined;patrol.wait=.8;}else next();return;}
 u.heading=turnToward(u.heading,heading,dt*2);u.aim=turnToward(u.aim,heading,dt*2);g.syncVisual(u);
}
