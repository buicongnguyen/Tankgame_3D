import * as T from 'three';
import {instancedMaterial} from './instancing';

interface Source {mesh:T.Mesh;layers:number;shown:boolean;}
interface Batch {mesh:T.InstancedMesh;sources:Source[];}
/** Instance repeated opaque Blender scenery in 24 m cells. Original roots still own
 * collision and visibility. Both camera and shadow passes keep normal Three.js culling. */
export class SceneryBatches {
 private batches:Batch[]=[];
 private scene:T.Scene;
 constructor(scene:T.Scene){this.scene=scene;}
 rebuild(arena:T.Group){
  this.clear();arena.updateMatrixWorld(true);
  const groups=new Map<string,T.Mesh[]>();
  arena.traverse(object=>{
   if(!(object instanceof T.Mesh)||object instanceof T.InstancedMesh||!object.userData.modelAsset||Array.isArray(object.material))return;
   // Transparent pieces need their original sorting; mirrored instances need different winding.
   if(object.material.transparent||object.layers.mask!==1||object.matrixWorld.determinant()<=0)return;
   const e=object.matrixWorld.elements;
   const key=[object.geometry.uuid,object.material.uuid,object.castShadow,object.receiveShadow,object.renderOrder,Math.floor(e[12]/24+.5),Math.floor(e[14]/24+.5)].join(':');
   const group=groups.get(key);if(group)group.push(object);else groups.set(key,[object]);
  });
  for(const sources of groups.values()){
   if(sources.length<2)continue;
   const first=sources[0],mesh=new T.InstancedMesh(first.geometry,instancedMaterial(first.material as T.Material,false),sources.length);
   mesh.name='ScenerySurfaceBatch';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;
   mesh.userData={...first.userData,sceneryBatch:true};mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   const batch={mesh,sources:sources.map(source=>{const layers=source.layers.mask;source.layers.disableAll();return {mesh:source,layers,shown:false};})};
   this.scene.add(mesh);this.batches.push(batch);this.pack(batch);
  }
 }
 private visible(mesh:T.Mesh){for(let p:T.Object3D|null=mesh;p&&p!==this.scene;p=p.parent){if(!p.visible||!p.parent)return false;}return true;}
 private pack(batch:Batch){
  let count=0;for(const source of batch.sources){source.shown=this.visible(source.mesh);if(source.shown)batch.mesh.setMatrixAt(count++,source.mesh.matrixWorld);}
  batch.mesh.count=count;batch.mesh.visible=count>0;batch.mesh.instanceMatrix.needsUpdate=true;batch.mesh.computeBoundingSphere();
 }
 update(){
  // Scenery doesn't move: upload transforms only when destruction/hiding changes a batch.
  for(const batch of this.batches)if(batch.sources.some(source=>source.shown!==this.visible(source.mesh)))this.pack(batch);
 }
 clear(){for(const batch of this.batches){for(const source of batch.sources)source.mesh.layers.mask=source.layers;batch.mesh.removeFromParent();batch.mesh.dispose();}this.batches=[];}
}
