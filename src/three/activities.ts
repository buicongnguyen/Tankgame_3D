import * as T from 'three';
import type { Point } from './rules';
export const BOUNDS={x:72,z:60};
export type ActivityKind='repair'|'supply'|'mine'|'laser'|'arc';
export interface Activity extends Point {kind:ActivityKind;mesh:T.Group;spent:boolean;remaining:number;}
export function buildActivities(parent:T.Group):Activity[]{
 const entries:[ActivityKind,number,number][]=[['laser',-10,35],['arc',10,35],['repair',-43,20],['repair',42,-30],['supply',45,24],['supply',-45,-30],['mine',-34,4],['mine',33,-6],['mine',-41,-11],['mine',44,8],['mine',25,-38],['mine',-24,40]];
 return entries.map(([kind,x,z])=>createActivity(parent,kind,x,z));
}
export function createActivity(parent:T.Group,kind:ActivityKind,x:number,z:number):Activity{
  const mesh=new T.Group();mesh.position.set(x,0,z);parent.add(mesh);
  const color=kind==='repair'?0x75ffbd:kind==='supply'?0x70d9ff:kind==='laser'?0x8bffff:kind==='arc'?0xc392ff:0xff7055;
  const marker=new T.Mesh(new T.RingGeometry(kind==='mine'?.6:2.7,kind==='mine'?.85:2.85,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.7}));marker.rotation.x=-Math.PI/2;marker.position.y=.07;marker.userData.owned=true;mesh.add(marker);
  const body=new T.Mesh(kind==='mine'?new T.CylinderGeometry(.6,.75,.2,12):new T.BoxGeometry(1.5,.5,1.5),new T.MeshStandardMaterial({color:kind==='mine'?0x635342:0x344b46,roughness:.8}));body.position.y=kind==='mine'?.15:.3;body.userData.owned=true;mesh.add(body);
  if(kind!=='mine'){
   const marks=kind==='laser'?[[.65,.3,0],[.18,.7,-.25]]:kind==='arc'?[[.22,1,0],[.7,.2,.3]]:[[1,.22,0],[.22,1,0]];
   for(const [w,d,z] of marks){const cross=new T.Mesh(new T.BoxGeometry(w,.04,d),new T.MeshBasicMaterial({color}));cross.position.set(0,.58,z);cross.userData.owned=true;mesh.add(cross);}
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillStyle=kind==='repair'?'#95ffcc':'#8de6ff';ctx.fillText(kind==='repair'?'REPAIR':kind==='laser'?'LASER':kind==='arc'?'ARC ROCKET':'SUPPLY',128,42);
   const texture=new T.CanvasTexture(canvas);const label=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false}));label.position.y=2;label.scale.set(5,1.25,1);label.userData.activityLabel=true;mesh.add(label);
  }
  return {kind,x,z,mesh,spent:false,remaining:kind==='repair'?160:1};
}
