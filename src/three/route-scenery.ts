import * as T from 'three';
import type {World,Cover} from './world';
import {overlapsReservation,routeSample} from './stage-layout';
import {distance} from './rules';

/** Populate old road clearings with destructible, instanced Blender props. */
export function buildRouteScenery(world:World){
 const layout=world.layout,biome=world.environment.biome;
 const tree:Cover['kind']=['snow','glacier'].includes(biome)?'white-pine':biome==='desert'?'palm':['jungle','marsh'].includes(biome)?'jungle-tree':'pine';
 const limit=['jungle','marsh'].includes(biome)?64:48,placed:{cover:Cover;rotation:number}[]=[],buckets=new Map<string,typeof placed>();
 const add=(x:number,z:number,kind:Cover['kind'],seed:number)=>{
  if(placed.length>=limit)return;
  const building=kind==='house'||kind==='cityblock',fuel=kind==='barrel'||kind==='fuelcrate';
  const w=kind==='cityblock'?8:building?6:kind==='crate'?1.3:kind==='barrel'?1.2:2.6,d=kind==='cityblock'?7:building?5:kind==='crate'?1.3:kind==='barrel'?1.2:2.6;
  const box={x,z,w,d};
  if(Math.abs(x)+w/2>68||Math.abs(z)+d/2>56||distance(box,layout.spawn)<12||overlapsReservation(layout,box,.35)||
   world.covers.some(c=>c.hp>0&&Math.abs(c.x-x)<(c.w+w)/2+1.5&&Math.abs(c.z-z)<(c.d+d)/2+1.5)||
   fuel&&layout.supplies.some(s=>distance(s,box)<10))return;
  const mesh=new T.Group();mesh.name='RouteSceneryCover';mesh.position.set(x,0,z);world.arena.add(mesh);
  const cover:Cover={...box,kind,hp:building?220:fuel?25:kind==='crate'?55:70,mesh};
  world.covers.push(cover);const entry={cover,rotation:building||fuel||kind==='crate'?0:seed*2.399};placed.push(entry);
  const bucket=buckets.get(kind)??[];bucket.push(entry);buckets.set(kind,bucket);
 };
 const choose=(i:number):Cover['kind']=>i%13===0?(biome==='city'?'cityblock':'house'):i%9===0?'barrel':i%7===0?'crate':tree;
 // Close-spaced clusters replace the old wide empty strip; the actual passage remains traversable.
 let index=0;
 for(let meters=10;meters<layout.length-7;meters+=9){const p=routeSample(layout.points,meters);
  for(const side of [-1,1]){const i=index++,kind=choose(i),offset=(kind==='cityblock'?8.4:kind==='house'?6.8:4.2)+(world.missionKind==='escort'?1.2:0)+(i%3)*.45;
   add(p.x+p.dz*offset*side,p.z-p.dx*offset*side,kind,i);
  }
 }
 // Central groves, ruins and supplies also fill gaps between route branches.
 for(let z=-36;z<=36;z+=12)for(let x=-20;x<=20;x+=10){const i=index++;add(x+Math.sin(i*4.7)*1.3,z+Math.cos(i*3.2)*1.3,choose(i),i);}
 const q=new T.Quaternion(),matrix=new T.Matrix4(),up=new T.Vector3(0,1,0);
 for(const [kind,entries] of buckets){
  const template=world.templates.get(kind)!;template.updateMatrixWorld(true);const inverse=template.matrixWorld.clone().invert(),parts:T.InstancedMesh[]=[];
  template.traverse(o=>{if(!(o instanceof T.Mesh))return;
   const instances=new T.InstancedMesh(o.geometry,o.material,entries.length);instances.name='RouteScenery:'+kind;instances.userData={...o.userData};instances.castShadow=true;instances.receiveShadow=true;
   entries.forEach(({cover,rotation},i)=>{q.setFromAxisAngle(up,rotation);matrix.compose(new T.Vector3(cover.x,0,cover.z),q,new T.Vector3(1,1,1)).multiply(inverse.clone().multiply(o.matrixWorld));instances.setMatrixAt(i,matrix);instances.setColorAt(i,new T.Color(kind===tree&&biome==='volcanic'?0x777363:0xffffff));});
   instances.computeBoundingSphere();world.arena.add(instances);parts.push(instances);
  });
  entries.forEach(({cover},index)=>cover.scenery={parts,index,maxHP:cover.hp});
 }
 return placed.length;
}
