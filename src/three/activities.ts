import * as T from 'three';
import {MINE_TRIGGER_RADIUS} from './combat-ranges';
import type {SupplyKind,SupplyPosition} from './stage-layout';
import type { Point } from './rules';
export const BOUNDS={x:72,z:60};
export type ActivityKind=SupplyKind;
export interface Activity extends Point {kind:ActivityKind;mesh:T.Group;spent:boolean;remaining:number;amount:number;airborne?:boolean;}
export function buildActivities(parent:T.Group,layout:SupplyPosition[]){return layout.map(({kind,x,z})=>createActivity(parent,kind,x,z));}
export function createActivity(parent:T.Group,kind:ActivityKind,x:number,z:number,amount=kind==='health'?60:kind==='shield'?6:kind==='laser'?12:kind==='arc'?6:kind==='repair'?160:1):Activity{
  const mesh=new T.Group();mesh.position.set(x,0,z);parent.add(mesh);
  const color=kind==='repair'||kind==='health'?0x75ffbd:kind==='shield'?0x55aaff:kind==='supply'?0x70d9ff:kind==='laser'?0x8bffff:kind==='arc'?0xc392ff:0xff7055;
  const marker=new T.Mesh(new T.RingGeometry(kind==='mine'?MINE_TRIGGER_RADIUS-.12:2.7,kind==='mine'?MINE_TRIGGER_RADIUS:2.85,32),new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));marker.rotation.x=-Math.PI/2;marker.position.y=.12;marker.userData.owned=true;mesh.add(marker);
  const body=new T.Mesh(kind==='mine'?new T.CylinderGeometry(.6,.75,.2,12):kind==='repair'?new T.CylinderGeometry(2.8,2.8,.12,40):kind==='shield'?new T.CylinderGeometry(1,1,.65,6):new T.BoxGeometry(1.5,kind==='health'?.85:.5,1.5),new T.MeshStandardMaterial({color:kind==='mine'?0x635342:kind==='health'?0xeaf4ef:kind==='shield'?0x1949a0:0x344b46,roughness:.8}));body.position.y=kind==='mine'?.21:kind==='repair'?.19:kind==='health'?.56:kind==='shield'?.46:.38;body.userData.owned=true;mesh.add(body);
  if(kind==='repair'){for(const x of [-2.5,2.5]){const post=new T.Mesh(new T.BoxGeometry(.3,1.4,.3),new T.MeshStandardMaterial({color:0x75ffbd,emissive:0x205d40}));post.position.set(x,.7,0);post.userData.owned=true;mesh.add(post);}}
  if(kind!=='mine'){
   const marks=kind==='repair'?[[2,.4,0],[.4,2,0]]:kind==='health'?[[1.1,.3,0],[.3,1.1,0]]:kind==='shield'?[[.85,.14,-.35],[.14,.7,0],[.55,.14,.35]]:kind==='supply'?[[.18,.9,-.1],[.65,.16,.35]]:kind==='laser'?[[.65,.3,0],[.18,.7,-.25]]:kind==='arc'?[[.22,1,0],[.7,.2,.3]]:[[1,.22,0],[.22,1,0]];
   if(kind==='shield'){const shape=new T.Shape();shape.moveTo(-.5,.45);shape.lineTo(.5,.45);shape.lineTo(.38,-.25);shape.lineTo(0,-.55);shape.lineTo(-.38,-.25);shape.closePath();const emblem=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:0xc4e7ff,side:T.DoubleSide}));emblem.rotation.x=-Math.PI/2;emblem.position.y=.805;emblem.userData.owned=true;mesh.add(emblem);}
   for(const [w,d,z] of kind==='shield'?[]:marks){const cross=new T.Mesh(new T.BoxGeometry(w,.04,d),new T.MeshBasicMaterial({color:kind==='health'?0x23915e:color}));cross.position.set(0,kind==='repair'?.27:kind==='health'?1.01:kind==='shield'?.805:.655,z);cross.userData.owned=true;mesh.add(cross);}
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillStyle=kind==='repair'?'#95ffcc':'#8de6ff';const text=kind==='repair'?'REPAIR CENTER':kind==='health'?`HEALTH +${amount}`:kind==='shield'?`SHIELD ${amount}s`:kind==='laser'?'LASER':kind==='arc'?'ARC ROCKET':'SUPPLY';ctx.strokeStyle='#183030';ctx.lineWidth=4;ctx.strokeText(text,128,42);ctx.fillText(text,128,42);
   const texture=new T.CanvasTexture(canvas);const label=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false}));label.position.y=2;label.scale.set(5,1.25,1);label.userData.activityLabel=true;mesh.add(label);
  }
  return {kind,x,z,mesh,spent:false,remaining:kind==='repair'?amount:1,amount};
}
