import {routePattern,landformCandidates} from './route-patterns';
import type {RouteShape} from './route-patterns';
import {clamp,distance,segmentBox} from './rules';
import {mode} from './difficulty';
import type {Box,Point} from './rules';

export type SupplyKind='repair'|'supply'|'mine'|'laser'|'arc'|'health'|'shield';
export interface SupplyPosition extends Point {kind:SupplyKind;guardGroup?:number;}
export interface Landform extends Box {kind:'hill'|'volcanic-rock';}
export interface RoadCorridor {a:Point;b:Point;width:number;}
export interface StageLayout {shape:RouteShape;closed:boolean;rotation:number;corridors:RoadCorridor[];landforms:Landform[];points:Point[];length:number;spawn:Point;heading:number;barriers:Box[];supplies:SupplyPosition[];reserved:Box[];encounters:Point[];southbound:boolean;direction:string;}
// Legacy routes retain their established bends; named patterns can rotate the whole route.
const ROUTES:number[][][]=[
 [[0,48],[0,34],[-16,34],[-16,10],[16,10],[16,-18],[-12,-18],[-12,-42],[0,-42],[0,-50]],
 [[0,-50],[18,-50],[18,-32],[-16,-32],[-16,-13],[0,-13]],
 [[0,48],[0,24],[-16,24],[-16,4],[16,4],[16,-24],[0,-24],[0,-50]],
 [[-4,-3],[-22,-3],[-22,18],[22,18],[22,-13],[0,-13]],
 [[-56,0],[-40,0],[-40,22],[-12,22],[-12,-20],[18,-20],[18,16],[44,16],[44,0],[56,0]],
 [[-52,44],[-30,44],[-30,18],[-6,18],[-6,-8],[24,-8],[24,-32],[50,-32],[50,-48]],
 [[0,-50],[18,-50],[18,-24],[-18,-24],[-18,6],[0,6],[0,50]],
 [[0,-50],[0,-36],[-16,-36],[-16,-10],[16,-10],[16,20],[0,20],[0,50]],
 [[-4,-3],[-24,-3],[-24,20],[24,20],[24,-13],[0,-13]],
 [[0,-50],[-18,-50],[-18,-34],[18,-34],[18,-13],[0,-13]],
 [[-52,46],[-52,18],[-24,18],[-24,0],[10,0],[10,-26],[46,-26],[46,-48]],
 [[-52,44],[-30,44],[-30,20],[-4,20],[-4,-4],[22,-4],[22,-28],[50,-28],[50,-48]],
 [[-4,-3],[-22,-3],[-22,18],[22,18],[22,-13],[0,-13]],
 [[-56,30],[-36,30],[-36,-12],[-8,-12],[-8,24],[20,24],[20,-26],[46,-26],[46,0],[56,0]],
 [[0,48],[-16,48],[-16,24],[16,24],[16,-2],[-16,-2],[-16,-32],[0,-32],[0,-50]],
 [[0,-50],[0,-44],[16,-44],[16,-20],[-16,-20],[-16,8],[16,8],[16,38],[0,38],[0,50]],
];
export function routeLength(points:Point[]){return points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0);}
export function routeSample(points:Point[],meters:number){
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=distance(a,b);if(meters<=d||i===points.length-1){const t=clamp(meters/d,0,1);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/d,dz:(b.z-a.z)/d};}meters-=d;}
 throw new Error('A route needs two points');
}
export function alongRoute(points:Point[],meters:number):Point{const {x,z}=routeSample(points,meters);return {x,z};}
export function projectRoute(points:Point[],p:Point){let best=Infinity,progress=0,walked=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(d*d),0,1),away=distance(p,{x:a.x+dx*t,z:a.z+dz*t});if(away<best-1e-6){best=away;progress=walked+d*t;}walked+=d;}return {distance:best,progress};
}
export function roadDistance(points:Point[],p:Point){return projectRoute(points,p).distance;}
function random(seed:number){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
function connector(a:Point,b:Point,padding=9):Box{return {x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:Math.abs(a.x-b.x)+padding,d:Math.abs(a.z-b.z)+padding};}
const overlaps=(a:Box,b:Box,margin=.5)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+margin&&Math.abs(a.z-b.z)<(a.d+b.d)/2+margin;
export const isWeaponSupply=(kind:SupplyKind)=>kind==='laser'||kind==='arc'||kind==='supply';
export const ENCOUNTER_FRACTIONS=[.17,.4,.65,.9];
// Separating-axis test against an oriented road with square end caps.
// Diagonal roads reserve a narrow corridor, not their entire bounding rectangle.
function overlapsCorridor({a,b,width}:RoadCorridor,box:Box,margin:number){
 const length=distance(a,b);if(length<1e-8)return overlaps({...a,w:width,d:width},box,margin);
 const tx=(b.x-a.x)/length,tz=(b.z-a.z)/length,x=box.x-(a.x+b.x)/2,z=box.z-(a.z+b.z)/2;
 const halfLength=(length+width)/2,halfWidth=width/2,bx=box.w/2+margin,bz=box.d/2+margin;
 return Math.abs(x)<bx+Math.abs(tx)*halfLength+Math.abs(tz)*halfWidth&&Math.abs(z)<bz+Math.abs(tz)*halfLength+Math.abs(tx)*halfWidth&&Math.abs(x*tx+z*tz)<halfLength+bx*Math.abs(tx)+bz*Math.abs(tz)&&Math.abs(-x*tz+z*tx)<halfWidth+bx*Math.abs(tz)+bz*Math.abs(tx);
}
export function overlapsReservation(layout:Pick<StageLayout,'reserved'|'corridors'>,box:Box,margin=.5){return layout.reserved.some(c=>overlaps(c,box,margin))||layout.corridors.some(c=>overlapsCorridor(c,box,margin));}
export function stageLayout(stage:number,level=0,kind='assault',difficulty='normal'):StageLayout{
 const mirror=level===1&&![10,13].includes(stage)?-1:1;
 const pattern=routePattern(stage,level),shape=pattern?.shape??'winding';
 const points=pattern?.points??ROUTES[stage].map(([x,z])=>({x:x*mirror,z})),length=routeLength(points),rng=random(9127+stage*7919+level*104729);
 const corridors=points.slice(1).map((p,i)=>({a:points[i],b:p,width:10})),heading=Math.atan2(points[1].x-points[0].x,points[1].z-points[0].z);
 const spawn=kind==='defense'?{x:-4,z:-3}:{x:points[0].x-Math.cos(heading)*4,z:points[0].z+Math.sin(heading)*4};
 const count=mode(difficulty).supplies,pool:SupplyKind[]=count===2?['repair',(['laser','arc','shield','health'] as SupplyKind[])[stage%4]]:['repair'];
 // Keep recovery early; shuffle the other kinds within deterministic route slots.
 for(let i=pool.length-1;i>1;i--){const j=1+Math.floor(rng()*i);[pool[i],pool[j]]=[pool[j],pool[i]];}
 const supplies:SupplyPosition[]=[],access:Box[]=[],weaponCount=pool.filter(isWeaponSupply).length;let weaponSlot=0;
 for(let slot=0;slot<count;slot++){
  const weapon=isWeaponSupply(pool[slot]),guardGroup=weapon?Math.round(weaponSlot++*3/Math.max(1,weaponCount-1)):undefined;
  let chosen:Point|undefined,anchor:Point|undefined;
  for(let attempt=0;attempt<600;attempt++){
   const fraction=attempt<120?(slot+1)/(count+1)+(rng()-.5)*.06:rng()*.88+.06;
   const meters=weapon?length*ENCOUNTER_FRACTIONS[guardGroup!]+(attempt<120?2+rng()*8:(rng()-.5)*20):length*clamp(fraction,.05,.95);
   const p=routeSample(points,clamp(meters,9,length-7)),side=(slot+attempt)%2?1:-1,offset=weapon?rng()*1.1:7.3+rng()*2;
   const candidate={x:p.x+p.dz*offset*side,z:p.z-p.dx*offset*side};
   if(Math.abs(candidate.x)>=65||Math.abs(candidate.z)>=53||!weapon&&roadDistance(points,candidate)<7.2||distance(candidate,spawn)<9||distance(candidate,{x:0,z:-13})<10||supplies.some(s=>distance(s,candidate)<8)||stage===10&&distance(candidate,{x:-28,z:-38})<23)continue;
   chosen=candidate;anchor=p;break;
  }
  if(!chosen||!anchor)throw new Error(`No supply space in stage ${stage}/${level}/${difficulty}`);
  supplies.push({kind:pool[slot],...chosen,...(weapon?{guardGroup}:{})});access.push(connector(anchor,chosen,9));
 }
 const encounters=ENCOUNTER_FRACTIONS.map(f=>alongRoute(points,length*f));
 const reserved=[...access,{x:spawn.x,z:spawn.z,w:10,d:10},{x:0,z:-13,w:17,d:17},...encounters.map(p=>({x:p.x,z:p.z,w:23,d:23})),...supplies.map(s=>({x:s.x,z:s.z,w:9,d:9}))];
 if(kind==='defense')reserved.push({x:0,z:0,w:16,d:128});
 const reservation={reserved,corridors};
 const landforms:Landform[]=[];
 // City routes use buildings as their enclosing terrain, preserving dense urban blocks.
 for(const p of stage===13?[]:landformCandidates(shape)){
  const box={x:p.x+(shape==='O'&&stage===10?20:0),z:p.z,w:shape==='O'?12:14,d:shape==='O'?9:10};
  if(overlapsReservation(reservation,box)||stage===10&&distance(box,{x:-28,z:-38})<28)continue;
  landforms.push({...box,kind:[4,5,10,14].includes(stage)?'volcanic-rock':'hill'});
 }
 // Landforms reserve scenery space but may meet one another to form a solid ridge.
 reserved.push(...landforms);
 const barriers:Box[]=[];
 if(kind!=='defense')for(let i=1;i<points.length&&barriers.length<8;i++){
  const a=points[i-1],b=points[i],vertical=a.x===b.x,offset=vertical?a.x:a.z;
  // Axis-aligned concrete panels stay on orthogonal routes; diagonal lanes use natural cover.
  if(Math.abs(a.x-b.x)>1e-6&&Math.abs(a.z-b.z)>1e-6)continue;
  if(Math.abs(offset)<10||distance(a,b)<16)continue;
  const cross=vertical?(a.z+b.z)/2:(a.x+b.x)/2,extent=vertical?64:52;
  for(const [lo,hi] of [[-extent,offset-7],[offset+7,extent]]){
   if(hi-lo<5)continue;
   // Trim the long barrier into panels so reservations leave local access gaps.
   const n=Math.ceil((hi-lo)/6.4),width=(hi-lo)/n;
   let runStart:number|null=null;
   for(let panel=0;panel<=n;panel++){
    const at=lo+width*(panel+.5),box:Box=vertical?{x:at,z:cross,w:width,d:1.8}:{x:cross,z:at,w:1.8,d:width};
    const clear=panel<n&&!overlapsReservation(reservation,box)&&!(stage===10&&distance(box,{x:-28,z:-38})<22);
    if(clear&&runStart===null)runStart=panel;
    if(!clear&&runStart!==null){const span=(panel-runStart)*width,center=lo+(runStart+panel)*width/2;barriers.push(vertical?{x:center,z:cross,w:span,d:1.8}:{x:cross,z:center,w:1.8,d:span});runStart=null;}
   }
  }
 }
 for(let i=0;i<6;i++)for(let attempt=0;attempt<500;attempt++){
  const p={x:(rng()-.5)*124,z:(rng()-.5)*100};
  if(roadDistance(points,p)>10&&distance(p,spawn)>15&&supplies.every(s=>distance(s,p)>10)&&!overlapsReservation(reservation,{...p,w:4,d:4})&&!barriers.some(b=>segmentBox(p,p,b,4)!==null)&&!(stage===10&&distance(p,{x:-28,z:-38})<22)){supplies.push({kind:'mine',...p});reserved.push({x:p.x,z:p.z,w:5,d:5});break;}
 }
 const start=points[0],end=points.at(-1)!,dx=end.x-start.x,dz=end.z-start.z;
 const direction=shape==='O'?'around the loop':Math.abs(dx)>Math.abs(dz)*2?(dx>0?'east':'west'):Math.abs(dz)>Math.abs(dx)*2?(dz>0?'south':'north'):(dz>0?'south':'north')+(dx>0?'east':'west');
 return {shape,closed:shape==='O',rotation:pattern?.rotation??0,corridors,landforms,points,length,spawn,heading,barriers,supplies,reserved,encounters,southbound:start.z<end.z,direction};
}
