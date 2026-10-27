import * as T from 'three';
import type {World,Cover} from './world';
import {overlapsReservation,routeSample} from './stage-layout';
import {distance} from './rules';
import {treeLook} from './scenery-variety';
import {instancedMaterial} from './instancing';

/** Populate old road clearings with destructible, instanced Blender props. */
export function buildRouteScenery(world:World){
 const layout=world.layout,biome=world.environment.biome;
 const tree:Cover['kind']=['snow','glacier'].includes(biome)?'white-pine':biome==='desert'?'palm':['jungle','marsh'].includes(biome)?'jungle-tree':'pine';
 const limit=['jungle','marsh'].includes(biome)?64:48,placed:{cover:Cover;rotation:number;scale?:number}[]=[],buckets=new Map<string,typeof placed>();
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
  const look=kind==='pine'?treeLook(world,biome,x,z):null;if(look)cover.model=look.model;
  world.covers.push(cover);const entry={cover,rotation:building||fuel||kind==='crate'?0:seed*2.399,scale:look?.scale};placed.push(entry);
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
 instanceScenery(world,[...buckets.values()].flat(),'RouteScenery');
 return placed.length;
}

/** One InstancedMesh per template surface per prop model; each cover keeps its instance for damage and removal. */
export function instanceScenery(world:World,placed:{cover:Cover;rotation:number;scale?:number}[],label:string){
 const biome=world.environment.biome,buckets=new Map<string,typeof placed>();
 for(const entry of placed){const key=entry.cover.model??entry.cover.kind,bucket=buckets.get(key)??[];bucket.push(entry);buckets.set(key,bucket);}
 const q=new T.Quaternion(),matrix=new T.Matrix4(),up=new T.Vector3(0,1,0),trees=new Set<Cover['kind']>(['pine','white-pine','palm','jungle-tree']);
 for(const [kind,entries] of buckets){
  const template=world.templates.get(kind)!;template.updateMatrixWorld(true);const inverse=template.matrixWorld.clone().invert(),parts:T.InstancedMesh[]=[];
  template.traverse(o=>{if(!(o instanceof T.Mesh))return;
   const instances=new T.InstancedMesh(o.geometry,instancedMaterial(o.material as T.Material,true),entries.length);instances.name=`${label}:${kind}`;instances.userData={...o.userData};instances.castShadow=true;instances.receiveShadow=true;
   entries.forEach(({cover,rotation,scale=1},i)=>{q.setFromAxisAngle(up,rotation);matrix.compose(new T.Vector3(cover.x,0,cover.z),q,new T.Vector3(scale,scale,scale)).multiply(inverse.clone().multiply(o.matrixWorld));instances.setMatrixAt(i,matrix);instances.setColorAt(i,new T.Color(trees.has(entries[0].cover.kind)&&biome==='volcanic'?0x777363:0xffffff));});
   instances.computeBoundingSphere();world.arena.add(instances);parts.push(instances);
  });
  entries.forEach(({cover},index)=>cover.scenery={parts,index,maxHP:cover.hp});
 }
}

/** Covers placed as whole model clones (houses, city blocks, fuel crates, walls, trees beside the road) draw as
 *  one InstancedMesh per model surface instead of one mesh per surface each: on the city map about 140 draws,
 *  shadow pass included, become a few dozen. A standard map is one batch per surface: the shadow box spans most
 *  of it, so splitting into tiles added shadow draws (measured: village 93 meshes, 63 draws tiled). A Large
 *  map, four times the area, splits into quadrants so far halves are still culled. Each cover keeps its group, now empty, for its transform,
 *  and gets the same `scenery` slot as route props, so damage tint, destruction, town flags and hit effects all
 *  work as before. Runs once a stage is fully placed; covers added later stay plain clones. */
export function instanceCoverClones(world:World){
 world.arena.updateMatrixWorld(true);
 const toArena=world.arena.matrixWorld.clone().invert(),groups=new Map<string,{parts:T.Mesh[][];covers:Cover[]}>(),large=world.bounds.x>100?world.bounds:null;
 for(const cover of world.covers){
  const root=cover.mesh;if(cover.scenery||cover.section||cover.boundary||!(cover.hp>0)||root.parent!==world.arena||!root.visible)continue;
  // Only untouched model clones: every mesh a shared template surface, nothing else attached.
  const parts:T.Mesh[]=[];let plain=true;
  root.traverse(o=>{if(o===root)return;
   if(o instanceof T.Mesh){if(o instanceof T.InstancedMesh||Array.isArray(o.material)||!o.userData.modelAsset)plain=false;else if(shown(o,root))parts.push(o);}
   else if(o.type!=='Group'&&o.type!=='Object3D')plain=false;});
  if(!plain||!parts.length)continue;
  const tile=large?`${Math.floor(cover.x/large.x)},${Math.floor(cover.z/large.z)}`:'';
  const key=tile+'|'+parts.map(p=>`${p.geometry.uuid}:${(p.material as T.Material).uuid}:${p.castShadow}:${p.receiveShadow}`).join('|');
  let group=groups.get(key);if(!group){group={parts:[],covers:[]};groups.set(key,group);}group.parts.push(parts);group.covers.push(cover);
 }
 const matrix=new T.Matrix4(),white=new T.Color(0xffffff);
 for(const {parts,covers} of groups.values()){
  const meshes=parts[0].map((first,j)=>{
   const mesh=new T.InstancedMesh(first.geometry,instancedMaterial(first.material as T.Material,true),covers.length);
   mesh.name=`CoverBatch:${covers[0].model??covers[0].kind}`;mesh.userData={...first.userData};mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;
   parts.forEach((list,i)=>{mesh.setMatrixAt(i,matrix.multiplyMatrices(toArena,list[j].matrixWorld));mesh.setColorAt(i,white);});
   mesh.computeBoundingSphere();world.arena.add(mesh);return mesh;});
  covers.forEach((cover,index)=>{cover.mesh.clear();cover.scenery={parts:meshes,index,maxHP:cover.hp};});
 }
}
const shown=(o:T.Object3D,root:T.Object3D)=>{for(let p:T.Object3D|null=o;p&&p!==root;p=p.parent)if(!p.visible)return false;return true;};
