import * as T from 'three';
import DATA from './skin-markings.json';
import {flagPaint,normalizeFlag} from './tank-flags';
import type {TankFlag} from './tank-flags';
/** Blender paint + optional rigid flag share one mesh/material, without a texture or animation. */
export class SkinMarkings {
 private geometries=new Map<string,T.BufferGeometry>();
 private material=new T.MeshStandardMaterial({vertexColors:true,roughness:.55,side:T.DoubleSide});
 apply(root:T.Object3D,id:string,flag:TankFlag='none'){
  root.getObjectByName('SkinMarkings')?.removeFromParent();flag=normalizeFlag(flag);
  const paint=(DATA as Record<string,{stars:number;stripes:number;positions:number[];colors:number[]}>)[id];
  if(!paint&&flag==='none')return;
  const key=id+':'+flag;let geometry=this.geometries.get(key);
  if(!geometry){
   const positions=[...(paint?.positions??[])],colors=[...(paint?.colors??[])];
   if(flag!=='none'){
    const polygon=(points:number[][],hex:string)=>{const c=new T.Color(hex);for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]]){positions.push(...p);colors.push(c.r,c.g,c.b);}};
    // Short mast on the rear fender; no cloth simulation or shadow-casting surface.
    const x=.98,z=-1.35;
    for(const [dx,dz] of [[.025,0],[0,.025]])polygon([[x-dx,1.05,z-dz],[x+dx,1.05,z+dz],[x+dx,2.88,z+dz],[x-dx,2.88,z-dz]],'#c9d5df');
    polygon([[x,2.12,z],[x+1.02,2.12,z],[x+1.02,2.83,z],[x,2.83,z]],'#17283c');
    // Tiny depth separation prevents overlapping colors flickering. Back face is mirrored like a flag.
    for(const side of [-1,1])flagPaint(flag).forEach((p,i)=>polygon(p.points.map(([u,v])=>[x+.025+u*.96,2.80-v*.64,z+side*(.006+i*.0001)]),p.color));
   }
   geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setAttribute('color',new T.Float32BufferAttribute(colors,3));
   geometry.computeVertexNormals();this.geometries.set(key,geometry);
  }
  const mesh=new T.Mesh(geometry,this.material);mesh.name='SkinMarkings';mesh.userData.stars=paint?.stars??0;mesh.userData.stripes=paint?.stripes??0;mesh.userData.flag=flag;mesh.receiveShadow=true;
  root.getObjectByName('Hull')!.add(mesh);
 }
}
