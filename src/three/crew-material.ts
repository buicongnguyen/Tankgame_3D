import * as T from 'three';
/** Merge untextured crew surfaces without discarding their individual Blender finishes. */
export function crewMaterial(){
 const material=new T.MeshStandardMaterial({vertexColors:true});material.name='CrewSurface';
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec2 crewSurface; varying vec2 vCrewSurface;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCrewSurface = crewSurface;');
  shader.fragmentShader='varying vec2 vCrewSurface;\n'+shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor = vCrewSurface.x;').replace('#include <metalnessmap_fragment>','float metalnessFactor = vCrewSurface.y;');
 };
 material.customProgramCacheKey=()=>'crew-surface-v1';return material;
}
export function packCrewSurfaces(root:T.Group,material:T.MeshStandardMaterial){
 root.traverse(o=>{if(!(o instanceof T.Mesh)||!(o.material instanceof T.MeshStandardMaterial))return;
  const authored=o.material;if(authored.map||authored.normalMap||authored.roughnessMap||authored.metalnessMap)throw new Error('Crew surface requires an untextured Blender material');
  const geometry=o.geometry.clone(),count=geometry.getAttribute('position').count,colors=new Float32Array(count*3),surfaces=new Float32Array(count*2);
  for(let i=0;i<count;i++){authored.color.toArray(colors,i*3);surfaces[i*2]=authored.roughness;surfaces[i*2+1]=authored.metalness;}
  geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setAttribute('crewSurface',new T.BufferAttribute(surfaces,2));o.geometry=geometry;o.material=material;
 });
}
