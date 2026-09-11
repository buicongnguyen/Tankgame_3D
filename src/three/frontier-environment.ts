import {groundTexture,sandRipples} from './frontier-surfaces';
import * as T from 'three';
import type {World,Cover} from './world';

import {terrainRegions} from './terrain';
import type {Biome} from './terrain';
export const VOLCANO={x:-28,z:-38,width:23,scale:.85,height:11};
export const FRONTIER_BIOMES:Biome[]=['glacier','volcanic','desert','jungle','city','quake','marsh'];
export const GROUND_COLORS:Partial<Record<Biome,number>>={glacier:0xc9dce0,volcanic:0x51454a,desert:0xc6a465,jungle:0x566a40,city:0x68777a,quake:0x877663,marsh:0x535f3d};
export const SKY_COLORS:Partial<Record<Biome,number>>={glacier:0xb3d1e0,volcanic:0xa98176,desert:0xddc5a0,jungle:0x8baa92,city:0xa6b9c2,quake:0xb7a58e,marsh:0x92a58a};
export function buildFrontier(world:World,biome:Biome){
 const reserved=world.layout.reserved;
 const add=(kind:Cover['kind'],x:number,z:number,w:number,d:number,hp:number,force=false)=>{
  if(kind==='fuelcrate'&&world.layout.supplies.some(p=>Math.hypot(x-p.x,z-p.z)<9))return null;
  if(!force&&[...reserved,...world.covers.filter(c=>c.hp>0)].some(c=>Math.abs(c.x-x)<(c.w+w)/2+1.4&&Math.abs(c.z-z)<(c.d+d)/2+1.4))return null;
  const mesh=world.clone(kind);mesh.position.set(x,0,z);if(['white-pine','jungle-tree','palm'].includes(kind)){mesh.rotation.y=x*12.31+z*4.21;mesh.scale.y=.82+(Math.sin(x*7+z*11)+1)*.17;}world.arena.add(mesh);world.covers.push({kind,x,z,w,d,hp,mesh});return mesh;
 };
 const plane=(geometry:T.BufferGeometry,color:number,x:number,z:number,y=.035,roughness=.9)=>{
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.userData.owned=true;mesh.receiveShadow=true;world.arena.add(mesh);return mesh;
 };
 for(const [regionIndex,region] of terrainRegions(biome).entries()){
  const surfaceY=.04+regionIndex*.003; // Stable overlap: every pool has a distinct shallow surface.
  const ice=region.kind==='ice',mud=region.kind==='mud';const patch=plane(new T.CircleGeometry(1,48),ice?0x78bbd1:mud?0x4b5943:0x9c713d,region.x,region.z,surfaceY,ice?.18:mud?.25:1);patch.scale.set(region.rx,region.rz,1);if(!ice&&!mud)(patch.material as T.MeshStandardMaterial).map=groundTexture('desert');
  if(ice){
   const rim=plane(new T.RingGeometry(.975,1,48),0xbfe4e7,region.x,region.z,surfaceY+.001);rim.scale.set(region.rx,region.rz,1);
   for(let i=0;i<5;i++){
    const crack=plane(new T.PlaneGeometry(region.rx*(i%2?.48:.65),.065),0xc7e9e9,region.x+(i%3-1)*region.rx*.38,region.z+(i-2)*region.rz*.27,surfaceY+.002);crack.rotation.z=i*.73;
   }
  }else {
   const rim=plane(new T.RingGeometry(.983,1,48),mud?0x806346:0xd8b57a,region.x,region.z,surfaceY+.001);rim.scale.set(region.rx,region.rz,1);
   const ripples=plane(sandRipples(),mud?0x73806a:0xc5a16a,region.x,region.z,surfaceY+.002);ripples.scale.set(region.rx,region.rz,1);
  }
 }
 if(biome==='glacier'){
  for(const [x,z] of [[-25,14],[22,34],[-23,-15],[-45,38],[46,33],[-42,-17],[48,-12],[-49,-45],[47,-47],[-19,-45],[23,49]])add('glacier',x,z,6.5,4.2,Infinity);
  for(let i=0;i<48;i++)add('white-pine',(i%2?1:-1)*(23+i*7%40),-52+i*17%104,2.6,2.6,70);
 }
 if(biome==='volcanic'){
  // The caldera occupies a real, blocked footprint; walkable ground has no fake lava.
  for(const c of [...world.covers])if(Math.abs(c.x-VOLCANO.x)<(c.w+VOLCANO.width)/2&&Math.abs(c.z-VOLCANO.z)<(c.d+VOLCANO.width)/2){c.hp=0;world.updateConcrete(c);c.mesh.removeFromParent();world.covers.splice(world.covers.indexOf(c),1);}
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
  for(let x=-65;x<=65;x+=7.2)for(let z=-52;z<=52;z+=7.6)if(Math.abs(x)>12&&Math.abs(Math.abs(x)-34)>2.5&&planted<110&&add('jungle-tree',x,z,2.8,2.8,95))planted++;
  for(const [x,z] of [[-22,45],[23,-42]])add('house',x,z,6,5,220);
 }
 if(biome==='city'){
  // Replace the generic outer crate lines with full city blocks.
  for(const c of [...world.covers])if(Math.abs(c.x)>40&&!c.section&&['barricade','crate','barrel'].includes(c.kind)){c.hp=0;world.updateConcrete(c);c.mesh.removeFromParent();world.covers.splice(world.covers.indexOf(c),1);}
  for(const x of [-34,34])plane(new T.PlaneGeometry(10,126),0x465358,x,0,.015);
  for(const z of [-34,-10,14,38]){
   plane(new T.PlaneGeometry(144,7),0x465358,0,z,.018);
   for(const x of [-34,0,34])for(let stripe=-2;stripe<=2;stripe++)plane(new T.PlaneGeometry(.45,3.7),0xb4bbaa,x+stripe*.85,z,.021);
  }
  for(const x of [-62,-48,-20,20,48,62])for(const z of [-47,-23,1,25,48])if(add('cityblock',x,z,8.4,7.5,400)){
   plane(new T.PlaneGeometry(10,9),0x929b95,x,z,.045);
   for(const dx of [-4.6,4.6])plane(new T.PlaneGeometry(.14,8.5),0xb9bcb0,x+dx,z,.059);
  }
  for(const [x,z] of [[-39,47],[38,-46],[-40,-4],[40,32]])add('house',x,z,6,5,220);
  // Fill free blocks around the new east-west streets without covering route access.
  for(let x=-62;x<=64;x+=14)for(let z=-50;z<=46;z+=12)if(world.covers.filter(c=>c.kind==='cityblock'||c.kind==='house').length<26&&add('cityblock',x,z,8.4,7.5,400))plane(new T.PlaneGeometry(10,9),0x929b95,x,z,.045);
 }
 if(biome==='quake'){
  for(let i=0;i<34;i++)add('volcanic-rock',(i%2?1:-1)*(18+i*11%46),-51+i*19%102,2.6,2.2,Infinity);
  for(let i=0;i<22;i++){const x=(i%2?1:-1)*(17+i*13%48),z=-52+i*17%104;const crack=plane(new T.PlaneGeometry(5+i%4,.16),0x393329,x,z,.07);crack.rotation.z=Math.sin(i)*.8;}
  for(const [x,z] of [[-24,46],[25,-45],[-47,-20]])add('house',x,z,6,5,220);
 }
 if(biome==='marsh'){
  for(let i=0;i<84;i++)add('jungle-tree',(i%2?1:-1)*(17+i*13%48),-52+i*19%104,2.8,2.8,85);
  for(const [x,z] of [[-26,46],[24,-47],[-45,-15],[48,35]])add('house',x,z,6,5,200);
 }
 // More explosive opportunities without burying service pads or the central route.
 for(let i=0;i<180&&world.covers.filter(c=>c.kind==='fuelcrate').length<14;i++)add('fuelcrate',(i%2?1:-1)*(20+i*13%43),-48+i*19%96,2.2,1.55,35);
 // Native points are cheap decoration and completely disabled by Low detail.
 if(biome==='glacier'||biome==='volcanic'||biome==='jungle'){
  const positions=new Float32Array(80*3);for(let i=0;i<80;i++){positions[i*3]=Math.sin(i*17)*72;positions[i*3+1]=i*7%26+2;positions[i*3+2]=Math.cos(i*13)*60;}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const weather=new T.Points(geometry,new T.PointsMaterial({color:biome==='glacier'?0xffffff:biome==='volcanic'?0xf6b381:0xd6e9a8,size:biome==='jungle'?.12:.22,transparent:true,opacity:.55,depthWrite:false}));world.arena.add(weather);return weather;
 }
 return null;
}
