import * as T from 'three';
import type {World,Cover} from './world';
import {ACTIVITY_LAYOUT} from './activities';
import {terrainRegions} from './terrain';
import type {Biome} from './terrain';
export const VOLCANO={x:-28,z:-38,width:23,scale:.85,height:11};
export const FRONTIER_BIOMES:Biome[]=['glacier','volcanic','desert','jungle','city'];
export const GROUND_COLORS:Partial<Record<Biome,number>>={glacier:0xc9dce0,volcanic:0x51454a,desert:0xc6a465,jungle:0x566a40,city:0x68777a};
export const SKY_COLORS:Partial<Record<Biome,number>>={glacier:0xb3d1e0,volcanic:0xa98176,desert:0xddc5a0,jungle:0x8baa92,city:0xa6b9c2};
export function buildFrontier(world:World,biome:Biome){
 const reserved=[{x:0,z:0,w:16,d:128},...ACTIVITY_LAYOUT.map(([,x,z])=>({x,z,w:8,d:8}))];
 const add=(kind:Cover['kind'],x:number,z:number,w:number,d:number,hp:number,force=false)=>{
  if(!force&&[...reserved,...world.covers.filter(c=>c.hp>0)].some(c=>Math.abs(c.x-x)<(c.w+w)/2+1.4&&Math.abs(c.z-z)<(c.d+d)/2+1.4))return null;
  const mesh=world.clone(kind);mesh.position.set(x,0,z);world.arena.add(mesh);world.covers.push({kind,x,z,w,d,hp,mesh});return mesh;
 };
 const plane=(geometry:T.BufferGeometry,color:number,x:number,z:number,y=.035,roughness=.9)=>{
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.userData.owned=true;mesh.receiveShadow=true;world.arena.add(mesh);return mesh;
 };
 for(const region of terrainRegions(biome)){
  const ice=region.kind==='ice';const patch=plane(new T.CircleGeometry(1,48),ice?0x78bbd1:0x9c713d,region.x,region.z,.04,ice?.18:1);patch.scale.set(region.rx,region.rz,1);
  if(ice){
   const rim=plane(new T.RingGeometry(.975,1,48),0xbfe4e7,region.x,region.z,.052);rim.scale.set(region.rx,region.rz,1);
   for(let i=0;i<5;i++){
    const crack=plane(new T.PlaneGeometry(region.rx*(i%2?.48:.65),.065),0xc7e9e9,region.x+(i%3-1)*region.rx*.38,region.z+(i-2)*region.rz*.27,.055);crack.rotation.z=i*.73;
   }
  }else for(let i=0;i<3;i++){
   const ring=plane(new T.RingGeometry(.52+i*.14,.54+i*.14,48),0xc5a16a,region.x,region.z,.051+i*.003);ring.scale.set(region.rx,region.rz,1);
  }
 }
 if(biome==='glacier'){
  for(const [x,z] of [[-25,14],[22,34],[-23,-15],[-45,38],[46,33],[-42,-17],[48,-12],[-49,-45],[47,-47],[-19,-45],[23,49]])add('glacier',x,z,6.5,4.2,Infinity);
  for(let i=0;i<18;i++)add('pine',(i%2?1:-1)*(23+i*7%40),-52+i*17%104,2.6,2.6,70);
 }
 if(biome==='volcanic'){
  // The caldera occupies a real, blocked footprint; walkable ground has no fake lava.
  for(const c of [...world.covers])if(Math.abs(c.x-VOLCANO.x)<(c.w+VOLCANO.width)/2&&Math.abs(c.z-VOLCANO.z)<(c.d+VOLCANO.width)/2){c.mesh.removeFromParent();world.covers.splice(world.covers.indexOf(c),1);}
  add('volcano',VOLCANO.x,VOLCANO.z,VOLCANO.width,VOLCANO.width,Infinity,true)!.scale.setScalar(VOLCANO.scale);
  for(let i=0;i<28;i++)add('volcanic-rock',(i%2?1:-1)*(18+i*13%47),-52+i*19%104,2.6,2.2,Infinity);
  for(const [x,z] of [[-23,40],[26,43],[38,-12]])add('house',x,z,6,5,220);
 }
 if(biome==='desert'){
  for(let i=0;i<30;i++)add('palm',(i%2?1:-1)*(17+i*11%45),-51+i*23%102,1.4,1.4,65);
  for(const [x,z] of [[-25,47],[24,44],[-54,-18],[51,41]])add('house',x,z,6,5,200);
  for(const [x,z] of [[-38,31],[37,-18],[-23,-38]])add('stonewall',x,z,6,1.4,160);
 }
 if(biome==='jungle'){
  let planted=0;
  for(let i=0;i<190&&planted<58;i++)if(add('jungle-tree',(i%2?1:-1)*(14+i*11%52),-53+i*23%106,2.8,2.8,95))planted++;
  for(const [x,z] of [[-22,45],[23,-42]])add('house',x,z,6,5,220);
 }
 if(biome==='city'){
  // Replace the generic outer crate lines with full city blocks.
  for(const c of [...world.covers])if(Math.abs(c.x)>40&&['barricade','crate','barrel'].includes(c.kind)){c.mesh.removeFromParent();world.covers.splice(world.covers.indexOf(c),1);}
  for(const x of [-34,34])plane(new T.PlaneGeometry(10,126),0x465358,x,0,.015);
  for(const z of [-34,-10,14,38]){
   plane(new T.PlaneGeometry(144,7),0x465358,0,z,.018);
   for(const x of [-34,0,34])for(let stripe=-2;stripe<=2;stripe++)plane(new T.PlaneGeometry(.45,3.7),0xb4bbaa,x+stripe*.85,z,.021);
  }
  for(const x of [-52,-20,20,52])for(const z of [-47,-23,1,25,48])add('cityblock',x,z,8.4,7.5,400);
  for(const [x,z] of [[-39,47],[38,-46],[-40,-4],[40,32]])add('house',x,z,6,5,220);
 }
 // Native points are cheap decoration and completely disabled by Low detail.
 if(biome==='glacier'||biome==='volcanic'||biome==='jungle'){
  const positions=new Float32Array(80*3);for(let i=0;i<80;i++){positions[i*3]=Math.sin(i*17)*72;positions[i*3+1]=i*7%26+2;positions[i*3+2]=Math.cos(i*13)*60;}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const weather=new T.Points(geometry,new T.PointsMaterial({color:biome==='glacier'?0xffffff:biome==='volcanic'?0xf6b381:0xd6e9a8,size:biome==='jungle'?.12:.22,transparent:true,opacity:.55,depthWrite:false}));world.arena.add(weather);return weather;
 }
 return null;
}
