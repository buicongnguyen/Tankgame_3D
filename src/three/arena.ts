import * as T from 'three';
import type {World,Cover} from './world';
import type {StageLayout} from './stage-layout';
import type {Box} from './rules';
import {instanceScenery} from './route-scenery';

/** Large skirmish battlefields keep the campaign map as their core and add a seeded outer ring. */
export const MAP_SCALES=[1,2] as const;
const CORE={x:70,z:58};
type Kind='tree'|'building'|'crate'|'barrel';
export interface RingProp {x:number;z:number;kind:Kind;rotation:number;}
const SIZE:Record<Kind,[number,number]>={tree:[2.6,2.6],building:[6,5],crate:[1.3,1.3],barrel:[1.2,1.2]};

function seeded(seed:number){return ()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/** Plans the outer ring before the world is built: concrete rows, landmarks, repair pads and mines
 *  go straight into the layout (so the normal builders, reservations and pathfinding see them);
 *  props are returned for instanced placement once the biome is known. */
export function planOuterRing(layout:StageLayout,bounds:{x:number;z:number},stage:number,river=false):RingProp[]{
 const random=seeded(9173+stage*131),props:RingProp[]=[],taken:Box[]=[];
 // The river band slows tanks across the whole map; keep props and mines out of the water.
 if(river)taken.push({x:0,z:32,w:bounds.x*2,d:12});
 const inRing=(b:Box)=>Math.abs(b.x)+b.w/2<bounds.x-9&&Math.abs(b.z)+b.d/2<bounds.z-9&&(Math.abs(b.x)-b.w/2>CORE.x||Math.abs(b.z)-b.d/2>CORE.z);
 const clear=(b:Box,gap:number)=>!taken.some(t=>Math.abs(t.x-b.x)<(t.w+b.w)/2+gap&&Math.abs(t.z-b.z)<(t.d+b.d)/2+gap);
 const claim=(b:Box)=>{taken.push(b);layout.reserved.push(b);};
 const prop=(x:number,z:number,kind:Kind,gap=1.5)=>{const [w,d]=SIZE[kind],b={x,z,w,d};if(!inRing(b)||!clear(b,gap))return false;claim(b);props.push({x,z,kind,rotation:random()*Math.PI*2});return true;};
 // Two repair pads on opposite corners of the ring, then mines on open ground.
 const pads=[{x:(CORE.x+bounds.x)/2,z:(CORE.z+bounds.z)/2},{x:-(CORE.x+bounds.x)/2,z:-(CORE.z+bounds.z)/2}];
 for(const p of pads){layout.supplies.push({kind:'repair',...p});claim({...p,w:10,d:10});}
 for(let placed=0,tries=0;placed<6&&tries<400;tries++){const b={x:(random()*2-1)*(bounds.x-12),z:(random()*2-1)*(bounds.z-12),w:7,d:7};if(inRing(b)&&clear(b,6)){layout.supplies.push({kind:'mine',x:b.x,z:b.z});claim(b);placed++;}}
 let landmarks=0;
 const step=18;
 for(let gz=-bounds.z+14;gz<=bounds.z-14;gz+=step)for(let gx=-bounds.x+14;gx<=bounds.x-14;gx+=step){
  const x=gx+(random()-.5)*8,z=gz+(random()-.5)*8,roll=random();
  if(!inRing({x,z,w:10,d:10}))continue;
  if(roll<.36){const n=2+Math.floor(random()*4);for(let k=0;k<n;k++)prop(x+(random()-.5)*9,z+(random()-.5)*9,'tree',1.2);}
  else if(roll<.46){if(prop(x,z,'building',3)&&random()<.6)prop(x+(random()<.5?-5:5),z+4.5,random()<.5?'crate':'barrel');}
  else if(roll<.56){const vertical=random()<.5,length=6.4*(2+Math.floor(random()*2)),b={x,z,w:vertical?1.8:length,d:vertical?length:1.8};if(inRing(b)&&clear(b,3)){layout.barriers.push(b);claim(b);}}
  else if(roll<.61&&landmarks<4){const b={x,z,w:14,d:10};if(inRing(b)&&clear(b,4)){layout.landforms.push({...b,kind:'concrete-block'});claim(b);landmarks++;}}
  else if(roll<.7){prop(x,z,'crate');prop(x+2.2,z+.6,'barrel');prop(x-1.8,z+1.9,'crate');}
 }
 return props;
}

/** Instanced, destructible ring props in the stage's biome (one draw per surface per prop kind). */
export function buildOuterRing(world:World,props:RingProp[]){
 const biome=world.environment.biome;
 const tree:Cover['kind']=['snow','glacier'].includes(biome)?'white-pine':biome==='desert'?'palm':['jungle','marsh'].includes(biome)?'jungle-tree':'pine';
 const entries=props.map(p=>{
  const kind:Cover['kind']=p.kind==='tree'?tree:p.kind==='building'?(biome==='city'?'cityblock':'house'):p.kind;
  const [w,d]=kind==='cityblock'?[8,7]:SIZE[p.kind],building=p.kind==='building';
  const cover:Cover={x:p.x,z:p.z,w,d,kind,hp:building?220:p.kind==='barrel'?25:p.kind==='crate'?55:70,mesh:new T.Group()};cover.mesh.name='OuterRingCover';cover.mesh.position.set(p.x,0,p.z);world.arena.add(cover.mesh);
  world.covers.push(cover);return {cover,rotation:p.kind==='tree'?p.rotation:0};
 });
 instanceScenery(world,entries,'OuterRing');
 return entries.length;
}
