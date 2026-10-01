import * as T from 'three';

const copies=new WeakMap<T.Material,{plain?:T.Material;colour?:T.Material}>();
/** The material an InstancedMesh should draw with in place of `material`.
 *  Three.js keeps one shader program per material, so a material drawn both by plain meshes and by an
 *  InstancedMesh (or by instanced meshes with and without per-instance colour) switches program on every
 *  draw, and each switch re-derives the program parameters on the CPU: about 6% of a phone frame on the city
 *  map. Each variant gets its own copy instead. A copy compiles to the same cached program and shares the
 *  textures, and stays alive with its source (template materials are never disposed by world teardown). */
export function instancedMaterial<M extends T.Material>(material:M,colour:boolean):M{
 let entry=copies.get(material);if(!entry){entry={};copies.set(material,entry);}
 const variant=colour?'colour':'plain';let copy=entry[variant] as M|undefined;
 if(!copy){
  copy=material.clone() as M;copy.userData.instancedFrom=material.uuid;
  // clone() drops shader hooks; carry them so the copy draws exactly like its source.
  copy.onBeforeCompile=material.onBeforeCompile;copy.customProgramCacheKey=material.customProgramCacheKey;
  entry[variant]=copy;
 }
 return copy;
}
