import * as T from 'three';
import type {World} from './world';
import {BOUNDS} from './activities';

/** Four continuous collision walls; shared rectangular rock strata cost one draw call. */
export function buildRockBoundary(world:World,biome:string){
 const thickness=6,height=3.2;
 const walls=[
  {x:-BOUNDS.x-thickness/2,z:0,w:thickness,d:BOUNDS.z*2+thickness*2},
  {x: BOUNDS.x+thickness/2,z:0,w:thickness,d:BOUNDS.z*2+thickness*2},
  {x:0,z:-BOUNDS.z-thickness/2,w:BOUNDS.x*2,d:thickness},
  {x:0,z: BOUNDS.z+thickness/2,w:BOUNDS.x*2,d:thickness},
 ];
 const blocks=walls.map(b=>({...b,y:height/2,h:height}));
 for(const b of walls){const longX=b.w>b.d,length=longX?b.w:b.d,n=Math.ceil(length/9);
  for(let i=0;i<n;i++){const along=-length/2+(i+.5)*length/n;
   blocks.push({x:b.x+(longX?along:0),z:b.z+(longX?0:along),w:longX?length/n:thickness-1,d:longX?thickness-1:length/n,y:height+.35+(i%3)*.12,h:.7+(i%3)*.24});
  }
 }
 const color=['snow','glacier'].includes(biome)?0xb8cbd0:biome==='desert'?0xb69a70:['volcanic','quake'].includes(biome)?0x555354:0x717969;
 const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color,roughness:1}),blocks.length);
 mesh.name='SolidRockBoundary';mesh.userData.owned=true;mesh.castShadow=true;mesh.receiveShadow=true;
 const matrix=new T.Matrix4(),q=new T.Quaternion();blocks.forEach((b,i)=>{
  matrix.compose(new T.Vector3(b.x,b.y,b.z),q,new T.Vector3(b.w,b.h,b.d));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new T.Color().setScalar(.82+(i%4)*.06));
 });mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();world.arena.add(mesh);
 for(const b of walls){const root=new T.Group();root.position.set(b.x,0,b.z);root.name='BoundaryCollider';world.arena.add(root);world.covers.push({...b,kind:'hill',hp:Infinity,mesh:root,boundary:true});}
}
