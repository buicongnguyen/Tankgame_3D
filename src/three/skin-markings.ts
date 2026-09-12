import * as T from 'three';
import DATA from './skin-markings.json';
/** Blender-authored paint triangles; one extra mesh on the player, no lights or textures. */
export class SkinMarkings {
 private geometries=new Map<string,T.BufferGeometry>();
 private material=new T.MeshStandardMaterial({vertexColors:true,roughness:.55,side:T.DoubleSide});
 apply(root:T.Object3D,id:string){
  root.getObjectByName('SkinMarkings')?.removeFromParent();
  const paint=(DATA as Record<string,{stars:number;stripes:number;positions:number[];colors:number[]}>)[id];if(!paint)return;
  let geometry=this.geometries.get(id);
  if(!geometry){geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(paint.positions,3)).setAttribute('color',new T.Float32BufferAttribute(paint.colors,3));geometry.computeVertexNormals();this.geometries.set(id,geometry);}
  const mesh=new T.Mesh(geometry,this.material);mesh.name='SkinMarkings';mesh.userData.stars=paint.stars;mesh.userData.stripes=paint.stripes;mesh.receiveShadow=true;
  root.getObjectByName('Hull')!.add(mesh);
 }
}
