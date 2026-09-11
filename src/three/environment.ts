import {overlapsReservation} from './stage-layout';
import * as T from 'three';
import type {World,Cover} from './world';
import {MISSIONS} from './campaign';
import {buildFrontier,FRONTIER_BIOMES,SKY_COLORS} from './frontier-environment';
import type {Biome} from './terrain';
export {terrainSpeed} from './terrain';
export type {Biome} from './terrain';
export const BIOMES=MISSIONS.map(m=>m.biome);
export class Environment{
 biome:Biome='grove';water:T.Mesh|null=null;weather:T.Points|null=null;time=0;
 build(world:World,index:number){
  this.biome=BIOMES[index]??'grove';this.water=null;this.weather=null;this.time=0;
  const snow=this.biome==='snow',river=this.biome==='river';
  const sky=SKY_COLORS[this.biome]??(snow?0x9cadb9:river?0x9bbfbb:this.biome==='ridge'?0xb5a18a:0xb1ad90);
  world.scene.background=new T.Color(sky);world.scene.fog=new T.Fog(sky,85,160);
  world.sun.color.setHex(this.biome==='glacier'?0xe6f3ff:this.biome==='volcanic'?0xffb279:0xffe4b4);
  if(FRONTIER_BIOMES.includes(this.biome)){this.weather=buildFrontier(world,this.biome);return;}
  const add=(name:Cover['kind'],x:number,z:number,w:number,d:number,hp:number)=>{
   if(overlapsReservation(world.layout,{x,z,w,d}))return null;
   if(snow&&name==='pine')name='white-pine';const mesh=world.clone(name);mesh.position.set(x,0,z);world.arena.add(mesh);world.covers.push({kind:name,x,z,w,d,hp,mesh});return mesh;
  };
  // The central road, original spawn footprints, relay and service pads remain reachable.
  for(const [x,z] of [[-14,41],[15,43],[-36,-37],[39,-24]])add('house',x,z,6,5,220);
  for(const [x,z] of [[-27,23],[29,23],[-38,-45],[37,-43]])add('stonewall',x,z,6,1.4,180);
  for(const [x,z] of [[-22,-32],[22,-34]])add('steelwall',x,z,6,1.1,Infinity);
  for(const [x,z] of [[-61,33],[61,-35],[-61,-38],[60,36]])add('hill',x,z,14,10,Infinity);
  for(const [x,z] of [[-11,17],[10,23],[-12,-28],[12,-37]])add('pine',x,z,2.6,2.6,65);
  const forest=this.biome==='industrial'?10:26;
  for(let i=0;i<forest;i++){
   const x=(i%2?1:-1)*(31+(i*7%30)),z=-52+(i*17%104);
   if(world.covers.some(c=>Math.abs(x-c.x)<c.w/2+3&&Math.abs(z-c.z)<c.d/2+3)||Math.abs(z-32)<7||Math.abs(z-20)<4&&x<0||Math.abs(z+30)<4)continue;
   add('pine',x,z,2.6,2.6,65);
  }
  const plane=(w:number,d:number,color:number,x:number,z:number)=>{const m=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({color,roughness:.8}));m.rotation.x=-Math.PI/2;m.position.set(x,.025,z);m.userData.owned=true;world.arena.add(m);return m;};
  if(river){
   this.water=plane(144,8,0x398d9f,0,32);this.water.position.y=.04;(this.water.material as T.MeshStandardMaterial).roughness=.25;
   for(const x of [-35,0,35]){const bridge=world.clone('bridge');bridge.position.set(x,.08,32);world.arena.add(bridge);}
   for(let i=0;i<24;i++){const ripple=plane(2,.07,0x91d8d7,-69+i*6,30+(i%3)*2);ripple.position.y=.06;}
  }
  if(snow){for(const x of [-40,40])plane(63,120,0xc6d5d5,x,0);}
  if(this.biome==='ridge'){const mud=new T.Mesh(new T.CircleGeometry(10,24),new T.MeshStandardMaterial({color:0x65503d}));mud.rotation.x=-Math.PI/2;mud.position.set(36,.04,17);mud.userData.owned=true;world.arena.add(mud);}
  if(snow||river){
   const coords=new Float32Array(96*3);for(let i=0;i<96;i++){coords[i*3]=Math.sin(i*17)*72;coords[i*3+1]=(i*7%25)+3;coords[i*3+2]=Math.cos(i*13)*60;}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(coords,3));this.weather=new T.Points(geo,new T.PointsMaterial({color:snow?0xffffff:0xa0dfe3,size:snow?.23:.12,transparent:true,opacity:.65,depthWrite:false}));world.arena.add(this.weather);
  }
 }
 update(dt:number,low:boolean){this.time+=dt;if(this.water)(this.water.material as T.MeshStandardMaterial).color.setHSL(.52,.42,.37+Math.sin(this.time*1.5)*.025);if(this.weather){this.weather.visible=!low;const p=this.weather.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)-dt*(['snow','glacier','volcanic','jungle'].includes(this.biome)?2:12);if(y<0)y=26;p.setY(i,y);}p.needsUpdate=true;}}
 clear(){if(this.weather){this.weather.geometry.dispose();(this.weather.material as T.Material).dispose();}this.weather=null;this.water=null;}
}
