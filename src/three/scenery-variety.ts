import * as T from 'three';
import type {World} from './world';
import type {Biome} from './terrain';
import {terrainRegions} from './terrain';
import {projectRoute,overlapsReservation} from './stage-layout';
import {circleBox,distance} from './rules';
import {insideRegion} from './terrain';

/** Reused Hoshi Valley (KITEFALL) trees. Tree cover keeps its 'pine' gameplay everywhere; temperate maps
 *  only render a share of it as broadleaf, maple or cedar. Scales keep each canopy close to the pine's
 *  footprint, so trees never hide the tanks beneath them from the high camera. */
export const TREE_SCALE:Record<string,number>={'tree-broadleaf':.45,'tree-maple':.55,'tree-cedar':.42};
const TREE_MIX:Partial<Record<Biome,[string,number][]>>={
 grove:[['pine',.45],['tree-broadleaf',.35],['tree-maple',.2]],
 village:[['pine',.3],['tree-broadleaf',.45],['tree-maple',.25]],
 river:[['pine',.4],['tree-broadleaf',.4],['tree-cedar',.2]],
 ridge:[['pine',.45],['tree-cedar',.4],['tree-broadleaf',.15]],
 industrial:[['pine',.55],['tree-broadleaf',.3],['tree-cedar',.15]],
 wastes:[['pine',.6],['tree-cedar',.25],['tree-broadleaf',.15]],
 city:[['pine',.35],['tree-broadleaf',.45],['tree-maple',.2]],
 quake:[['pine',.5],['tree-cedar',.3],['tree-broadleaf',.2]],
};
/** Stable 0..1 value per position, so a map always grows the same trees. */
const hash=(x:number,z:number,salt=0)=>{const s=Math.sin(x*12.9898+z*78.233+salt*37.719)*43758.5453;return s-Math.floor(s);};
/** The model and scale a 'pine' cover at (x, z) renders with, or null to keep the pine. */
export function treeLook(world:World,biome:Biome,x:number,z:number):{model:string;scale:number}|null{
 const mix=TREE_MIX[biome];if(!mix)return null;
 let roll=hash(x,z);
 for(const [model,share] of mix){if((roll-=share)<0)return model==='pine'||!world.templates.has(model)?null:{model,scale:TREE_SCALE[model]*(.9+hash(x,z,1)*.2)};}
 return null;
}

/** Low, walk-through ground cover: one instanced draw per surface, no shadow casting, no collision. */
const DRESSING:Partial<Record<Biome,{grass:number;bush:number;reeds:number;tint?:number}>>={
 grove:{grass:240,bush:60,reeds:0},
 village:{grass:220,bush:50,reeds:0},
 river:{grass:220,bush:50,reeds:70},
 ridge:{grass:160,bush:40,reeds:0,tint:0xd9c89b},
 industrial:{grass:110,bush:18,reeds:0,tint:0xcfc393},
 wastes:{grass:100,bush:14,reeds:0,tint:0xd8bd7f},
 quake:{grass:90,bush:16,reeds:0,tint:0xd1bd8c},
 city:{grass:60,bush:12,reeds:0},
 jungle:{grass:200,bush:90,reeds:0},
 marsh:{grass:160,bush:30,reeds:110},
};
function seeded(seed:number){return ()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
interface Tuft {x:number;z:number;rotation:number;scale:number;shade:number;}

export function buildGroundDressing(world:World,stage:number){
 const biome=world.environment.biome,plan=DRESSING[biome];if(!plan)return 0;
 const random=seeded(stage*7919+17),layout=world.layout,b=world.bounds;
 // Large fields get more cover for their extra ground, capped so the cost stays bounded.
 const amount=Math.min(2.5,b.x*b.z/(72*60));
 const water=(z:number)=>biome==='river'&&Math.abs(z-32)<4.6;
 // Ground that is decorated with decals but not collision: bog holes, the ridge mud pit, city asphalt, reserved pads.
 const bog=terrainRegions(biome),paved=(x:number,z:number)=>biome==='city'&&Math.abs(x)<70&&Math.abs(z)<64&&([-34,34].some(sx=>Math.abs(x-sx)<5.8)||[-34,-10,14,38].some(sz=>Math.abs(z-sz)<4.2)),
  pit=(x:number,z:number)=>biome==='ridge'&&Math.hypot(x-36,z-17)<11;
 const ground=(x:number,z:number)=>!bog.some(r=>insideRegion({x,z},r))&&!paved(x,z)&&!pit(x,z)&&!overlapsReservation(layout,{x,z,w:1,d:1},.4);
 const open=(x:number,z:number,r:number)=>Math.abs(x)<b.x-3&&Math.abs(z)<b.z-3&&!water(z)&&ground(x,z)&&
  !world.covers.some(c=>c.hp>0&&circleBox({x,z},r,c))&&projectRoute(layout.points,{x,z}).distance>5&&!layout.supplies.some(s=>distance(s,{x,z})<3.5);
 const scatter=(count:number,clump:number,spread:number,radius:number,scale:[number,number])=>{
  const out:Tuft[]=[];
  for(let tries=0;out.length<count&&tries<count*6;tries++){
   const cx=(random()*2-1)*(b.x-4),cz=(random()*2-1)*(b.z-4);
   for(let k=0;k<clump&&out.length<count;k++){const x=cx+(random()-.5)*spread,z=cz+(random()-.5)*spread;
    if(open(x,z,radius))out.push({x,z,rotation:random()*Math.PI*2,scale:scale[0]+random()*(scale[1]-scale[0]),shade:.86+random()*.24});}
  }
  return out;
 };
 const grass=scatter(Math.round(plan.grass*amount),5,4.5,.5,[2,2.9]),bush=scatter(Math.round(plan.bush*amount),2,3,.9,[.45,.65]);
 const reeds:Tuft[]=[];
 if(plan.reeds){
  const count=Math.round(plan.reeds*amount),mud=terrainRegions(biome);
  for(let tries=0;reeds.length<count&&tries<count*8;tries++){
   // River banks just outside the water; marsh reeds ring the mud holes.
   let x:number,z:number;
   if(biome==='river'){x=(random()*2-1)*(b.x-4);z=32+(random()<.5?-1:1)*(4.7+random()*1.4);if([-35,0,35].some(bridge=>Math.abs(x-bridge)<6))continue;}
   else{const r=mud[Math.floor(random()*mud.length)]??{x:0,z:0,rx:8,rz:8},a=random()*Math.PI*2,k=.95+random()*.3;x=r.x+Math.cos(a)*r.rx*k;z=r.z+Math.sin(a)*r.rz*k;}
   if(Math.abs(x)<b.x-3&&Math.abs(z)<b.z-3&&!pit(x,z)&&!paved(x,z)&&!overlapsReservation(layout,{x,z,w:1,d:1},.4)&&!world.covers.some(c=>c.hp>0&&circleBox({x,z},.6,c))&&projectRoute(layout.points,{x,z}).distance>4)
    reeds.push({x,z,rotation:random()*Math.PI*2,scale:.8+random()*.35,shade:.9+random()*.2});
  }
 }
 const tint=new T.Color(plan.tint??0xffffff);
 return instance(world,'grass-tuft',grass,tint)+instance(world,'bush',bush,tint)+instance(world,'reeds',reeds,new T.Color(0xffffff));
}

function instance(world:World,model:string,items:Tuft[],tint:T.Color){
 const template=world.templates.get(model);if(!template||!items.length)return 0;
 template.updateMatrixWorld(true);const inverse=template.matrixWorld.clone().invert(),q=new T.Quaternion(),m=new T.Matrix4(),up=new T.Vector3(0,1,0),color=new T.Color();
 template.traverse(o=>{if(!(o instanceof T.Mesh))return;
  const mesh=new T.InstancedMesh(o.geometry,o.material,items.length);mesh.name=`GroundDressing:${model}`;mesh.userData={...o.userData};
  mesh.castShadow=false;mesh.receiveShadow=true;
  const local=inverse.clone().multiply(o.matrixWorld);
  items.forEach((it,i)=>{q.setFromAxisAngle(up,it.rotation);m.compose(new T.Vector3(it.x,0,it.z),q,new T.Vector3(it.scale,it.scale,it.scale)).multiply(local);mesh.setMatrixAt(i,m);mesh.setColorAt(i,color.copy(tint).multiplyScalar(it.shade));});
  mesh.computeBoundingSphere();world.arena.add(mesh);
 });
 return items.length;
}
