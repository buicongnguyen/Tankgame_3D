import type {Game,Unit} from './game';
import type {World,Cover} from './world';
import type {Point} from './rules';
import {distance} from './rules';
import {projectRoute,routeSample,overlapsReservation} from './stage-layout';

const TREES=new Set(['pine','white-pine','palm','jungle-tree']);
const BUILDINGS=new Set(['house','cityblock']);
const FUEL=new Set(['barrel','fuelcrate']);
/** Use existing landmarks within the unit's route sector, without moving a later patrol forward. */
export function guardPost(g:Game,anchor:Point,fallback:Point,role:Unit['role'],index:number,group:number):Point {
 const infantry=role==='rifleman'||role==='rocketeer',layout=g.world.layout;
 const meters=projectRoute(layout.points,anchor).progress;
 const candidates:{point:Point;score:number}[]=[];
 for(const cover of g.world.covers){
  if(cover.hp<=0||distance(cover,anchor)>29||!(infantry?TREES.has(cover.kind):BUILDINGS.has(cover.kind)||FUEL.has(cover.kind)))continue;
  const pad=infantry?2:2.7,preferred=infantry||(index%2===0?FUEL:BUILDINGS).has(cover.kind);
  for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
   const point={x:cover.x+dx*(cover.w/2+pad),z:cover.z+dz*(cover.d/2+pad)};
   const sector=projectRoute(layout.points,point).progress;
   if(distance(point,anchor)>23||Math.abs(sector-meters)>Math.max(20,layout.length*.12)||layout.supplies.some(s=>s.guardGroup===group&&distance(point,s)>19))continue;
   candidates.push({point,score:distance(point,anchor)*.45+distance(point,fallback)*.35+(preferred?0:5)});
  }
 }
 candidates.sort((a,b)=>a.score-b.score);
 return candidates.find(c=>g.canSpawnUnit(c.point.x,c.point.z,role))?.point??fallback;
}

/** Small gaps in scenery get a guard landmark; use existing batched Blender models. */
export function buildGuardLandmarks(world:World,kind:string){
 if(kind==='defense')return;
 const biome=world.environment.biome,tree:Cover['kind']=biome==='snow'||biome==='glacier'?'white-pine':biome==='desert'?'palm':biome==='jungle'||biome==='marsh'?'jungle-tree':'pine';
 for(const anchor of world.layout.encounters)for(const category of ['tree','tank']){
  if(world.covers.some(c=>c.hp>0&&distance(c,anchor)<19&&(category==='tree'?TREES.has(c.kind):BUILDINGS.has(c.kind)||FUEL.has(c.kind))))continue;
  const sample=routeSample(world.layout.points,projectRoute(world.layout.points,anchor).progress);
  const kinds:Cover['kind'][]=category==='tree'?[tree]:biome==='city'?['barrel']:['house','barrel'];
  placement:for(const name of kinds)for(const offset of [14,18,22])for(const along of [0,-8,8,-14,14])for(const side of [-1,1]){
   const box={x:anchor.x+sample.dz*offset*side+sample.dx*along,z:anchor.z-sample.dx*offset*side+sample.dz*along,w:name==='house'?6:name==='barrel'?1:2.6,d:name==='house'?5:name==='barrel'?1:2.6};
   if(Math.abs(box.x)+box.w/2>68||Math.abs(box.z)+box.d/2>56||overlapsReservation(world.layout,box,.6)||world.covers.some(c=>c.hp>0&&Math.abs(c.x-box.x)<(c.w+box.w)/2+2&&Math.abs(c.z-box.z)<(c.d+box.d)/2+2)||name==='barrel'&&world.layout.supplies.some(s=>distance(box,s)<9))continue;
   const mesh=world.clone(name);mesh.position.set(box.x,0,box.z);world.arena.add(mesh);world.covers.push({...box,kind:name,hp:name==='house'?220:name==='barrel'?25:70,mesh});break placement;
  }
 }
}
