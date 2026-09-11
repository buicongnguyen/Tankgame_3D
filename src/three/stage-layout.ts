import {clamp,distance,segmentBox} from './rules';
import type {Box,Point} from './rules';

export type SupplyKind='repair'|'supply'|'mine'|'laser'|'arc'|'health'|'shield';
export interface SupplyPosition extends Point {kind:SupplyKind;}
export interface StageLayout {points:Point[];length:number;spawn:Point;heading:number;barriers:Box[];supplies:SupplyPosition[];reserved:Box[];southbound:boolean;}
// Orthogonal routes match the swept convoy footprint, road markings and concrete gaps.
const ROUTES:number[][][]=[
 [[0,48],[0,34],[-16,34],[-16,10],[16,10],[16,-18],[-12,-18],[-12,-42],[0,-42],[0,-50]],
 [[0,-50],[18,-50],[18,-32],[-16,-32],[-16,-13],[0,-13]],
 [[0,48],[0,24],[-16,24],[-16,4],[16,4],[16,-24],[0,-24],[0,-50]],
 [[-4,-3],[-22,-3],[-22,18],[22,18],[22,-13],[0,-13]],
 [[0,-50],[-18,-50],[-18,-26],[18,-26],[18,0],[-18,0],[-18,28],[0,28],[0,50]],
 [[0,48],[-18,48],[-18,20],[18,20],[18,-10],[-14,-10],[-14,-38],[0,-38],[0,-50]],
 [[0,-50],[18,-50],[18,-24],[-18,-24],[-18,6],[0,6],[0,50]],
 [[0,-50],[0,-36],[-16,-36],[-16,-10],[16,-10],[16,20],[0,20],[0,50]],
 [[-4,-3],[-24,-3],[-24,20],[24,20],[24,-13],[0,-13]],
 [[0,-50],[-18,-50],[-18,-34],[18,-34],[18,-13],[0,-13]],
 [[0,48],[18,48],[18,24],[-12,24],[-12,0],[18,0],[18,-30],[0,-30],[0,-50]],
 [[0,48],[0,36],[16,36],[16,20],[-16,20],[-16,-20],[16,-20],[16,-44],[0,-44],[0,-50]],
 [[-4,-3],[-22,-3],[-22,18],[22,18],[22,-13],[0,-13]],
 [[0,-50],[0,-34],[-34,-34],[-34,-10],[34,-10],[34,14],[0,14],[0,50]],
 [[0,48],[-16,48],[-16,24],[16,24],[16,-2],[-16,-2],[-16,-32],[0,-32],[0,-50]],
 [[0,-50],[0,-44],[16,-44],[16,-20],[-16,-20],[-16,8],[16,8],[16,38],[0,38],[0,50]],
];
export function routeLength(points:Point[]){return points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0);}
export function alongRoute(points:Point[],meters:number):Point{
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=distance(a,b);if(meters<=d){const t=clamp(meters/d,0,1);return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}meters-=d;}
 return {...points[points.length-1]};
}
export function roadDistance(points:Point[],p:Point){let best=Infinity;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz),0,1);best=Math.min(best,distance(p,{x:a.x+dx*t,z:a.z+dz*t}));}return best;
}
function random(seed:number){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
export function stageLayout(stage:number,level=0,kind='assault'):StageLayout{
 const mirror=level===1&&![10,13].includes(stage)?-1:1;
 const points=ROUTES[stage].map(([x,z])=>({x:x*mirror,z})),length=routeLength(points),rng=random(9127+stage*7919+level*104729);
 const roadBoxes=points.slice(1).map((p,i)=>({x:(p.x+points[i].x)/2,z:(p.z+points[i].z)/2,w:Math.abs(p.x-points[i].x)+10,d:Math.abs(p.z-points[i].z)+10}));
 const heading=Math.atan2(points[1].x-points[0].x,points[1].z-points[0].z);
 const spawn=kind==='defense'?{x:-4,z:-3}:{x:points[0].x-Math.cos(heading)*4,z:points[0].z+Math.sin(heading)*4};
 const pool:SupplyKind[]=['health','shield','arc','supply','health','shield'];
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const supplies:SupplyPosition[]=[];
 for(let slot=0;slot<10;slot++){
  const kind:SupplyKind=slot===0?'laser':slot===3||slot===8?'repair':slot===9?(rng()<.5?'arc':'laser'):pool.shift()!;
  let chosen:Point|undefined;
  // Stratified jitter preserves coverage; retries use the same stage/level seed.
  for(let attempt=0;attempt<100;attempt++){
   const p=alongRoute(points,length*((slot+1)/12+(rng()-.5)*.035));p.x+=(rng()-.5)*3.5;p.z+=(rng()-.5)*3.5;
   if(distance(p,spawn)>7&&distance(p,{x:0,z:-13})>7&&supplies.every(s=>distance(s,p)>6.5)){chosen=p;break;}
  }
  if(!chosen){ // Search the whole reserved road if a short approach has a crowded turn.
   for(let n=0;n<length*2;n++){const p=alongRoute(points,(length*(slot+1)/12+n*.5)%length);if(distance(p,spawn)>7&&distance(p,{x:0,z:-13})>7&&supplies.every(s=>distance(s,p)>6.5)){chosen=p;break;}}
  }
  if(!chosen)throw new Error(`No supply space in stage ${stage}/${level}`);
  supplies.push({kind,...chosen});
 }
 const barriers:Box[]=[];
 if(kind!=='defense')for(let i=1;i<points.length&&barriers.length<6;i++){
  const a=points[i-1],b=points[i];if(a.x!==b.x||Math.abs(a.x)<10||Math.abs(a.z-b.z)<16)continue;
  const z=(a.z+b.z)/2;
  for(const [left,right] of [[-40,a.x-7],[a.x+7,40]])if(right-left>=5){const box={x:(left+right)/2,z,w:right-left,d:1.8};if(!roadBoxes.some(c=>Math.abs(c.x-box.x)<(c.w+box.w)/2&&Math.abs(c.z-box.z)<(c.d+box.d)/2))barriers.push(box);}
 }
 // No mine is hidden in the traversable route or underneath a useful pickup.
 for(let i=0;i<6;i++)for(let attempt=0;attempt<200;attempt++){
  const p={x:(rng()-.5)*124,z:(rng()-.5)*100};
  if(roadDistance(points,p)>10&&distance(p,spawn)>15&&supplies.every(s=>distance(s,p)>10)&&!barriers.some(b=>segmentBox(p,p,b,4)!==null)&&!(stage===10&&distance(p,{x:-28,z:-38})<22)) {supplies.push({kind:'mine',...p});break;}
 }
 const reserved=[...roadBoxes,{x:spawn.x,z:spawn.z,w:10,d:10},{x:0,z:-13,w:17,d:17},...supplies.map(s=>({x:s.x,z:s.z,w:s.kind==='mine'?5:9,d:s.kind==='mine'?5:9}))];
 if(kind==='defense')reserved.push({x:0,z:0,w:16,d:128});
 return {points,length,spawn,heading,barriers,supplies,reserved,southbound:points[0].z<points[points.length-1].z};
}
export function overlapsReservation(layout:StageLayout,box:Box){return layout.reserved.some(c=>Math.abs(c.x-box.x)<(c.w+box.w)/2+.5&&Math.abs(c.z-box.z)<(c.d+box.d)/2+.5);}
