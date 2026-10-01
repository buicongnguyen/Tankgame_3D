import * as T from 'three';
import type {Game,Unit} from './game';
import type {Cover} from './world';
import {distance} from './rules';
import {projectRoute,routeSample} from './stage-layout';
import {mulberry32} from './town-life';
import {escortStartClear} from './escort';

/** Rooftop lookouts: riflemen posted on houses and city blocks beside the route. A lookout holds its roof and
 *  fires from it (riflemen from the stage's own roster are posted there); its own building never blocks its sight or its shots. Direct fire at it strikes the building
 *  first (shots travel on the ground plane), so the player brings a lookout down with splash damage or by
 *  knocking the building down, which drops it. None on Easy, in training or in skirmish. */
export interface Perch {cover:Cover;y:number;}
const COUNT:Record<string,number>={easy:0,normal:2,hard:3,crazy:4};
/** Where a soldier stands on each roof, in the model's own space, found once per model by a downward ray: on a
 *  city block's flat roof through its middle, on a house roof 1.9 m along the ridge from the middle, clear of the
 *  rooftop flag (middle of the ridge) and the chimney (the other side). */
const roofs=new WeakMap<T.Object3D,T.Vector3|null>();
function stand(g:Game,cover:Cover){
 const template=g.world.templates.get(cover.kind);if(!template)return null;
 if(!roofs.has(template)){template.updateMatrixWorld(true);const box=new T.Box3().setFromObject(template);let spot:T.Vector3|null=null;
  if(!box.isEmpty()){const c=box.getCenter(new T.Vector3());if(cover.kind==='house')c.x-=1.9;
   const hit=new T.Raycaster(new T.Vector3(c.x,box.max.y+5,c.z),new T.Vector3(0,-1,0)).intersectObject(template,true)[0];if(hit)spot=hit.point.clone();}
  roofs.set(template,spot);}
 return roofs.get(template)!;
}
export function placeLookouts(g:Game){
 const want=COUNT[g.save.difficulty]??0;if(!want)return [];
 const layout=g.world.layout,start=g.player.visual.root.position,rng=mulberry32(0x1c0+g.mission*131+g.level*17);
 // Close enough to the road to be met on the way (or, on capture and defence maps, overlooking the objective),
 // never over the deployment area or the convoy's starting ground.
 const hold=g.world.missionKind==='capture'||g.world.missionKind==='defense',objective={x:0,z:-13};
 const hosts=g.world.covers.filter(c=>(c.kind==='house'||c.kind==='cityblock')&&c.hp>0&&distance(c,start)>30&&(!g.convoy||escortStartClear(layout,c))&&(projectRoute(layout.points,c).distance<28||hold&&distance(c,objective)<45));
 const placed:Unit[]=[];
 while(hosts.length&&placed.length<want){
  const cover=hosts.splice(Math.floor(rng()*hosts.length),1)[0],local=stand(g,cover);if(!local)continue;
  cover.mesh.updateMatrixWorld(true);const at=cover.mesh.localToWorld(local.clone());
  // Promote the stage's own nearest rifleman (the roster and its counts stay exactly as designed); it keeps its
  // encounter group, so it wakes when its group does, but gives up its patrol.
  const u=g.enemies.filter(e=>e.role==='rifleman'&&!e.dead&&!e.pending&&!e.perch&&distance(e.visual.root.position,cover)<40).sort((a,b)=>distance(a.visual.root.position,cover)-distance(b.visual.root.position,cover))[0];if(!u)continue;
  u.visual.root.position.set(at.x,at.y,at.z);u.perch={cover,y:at.y};u.patrol=undefined;
  // Watch the road.
  const road=routeSample(layout.points,projectRoute(layout.points,cover).progress);u.aim=u.heading=Math.atan2(road.x-at.x,road.z-at.z);g.syncVisual(u);
  placed.push(u);
 }
 return placed;
}
/** A destroyed building drops whoever stood on it. */
export function dropLookouts(g:Game,cover:Cover){
 for(const u of g.enemies)if(!u.dead&&u.perch?.cover===cover){u.visual.root.position.y=0;u.perch=undefined;g.damageUnit(u,1e6,{x:cover.x,z:cover.z});}
}
