import * as T from 'three';
import {writeMatrix,writeColor,uploadRange} from './buffer-updates';
import {instancedMaterial} from './instancing';

interface Source {root:T.Group;parts:T.Mesh[];}
interface Batch {mesh:T.InstancedMesh;capacity:number;}
/** Draw repeated enemy surfaces together while retaining each unit's original animated rig. */
export class EnemyBatches {
 private sources:Source[]=[];
 private barGeometry=new T.PlaneGeometry(2.8,.16);
 private barMaterial=new T.MeshBasicMaterial({color:0xffffff,depthTest:false});
 private batches=new Map<string,Batch>();
 private frustum=new T.Frustum();private matrix=new T.Matrix4();private sphere=new T.Sphere(new T.Vector3(),9);
 private scene:T.Scene; constructor(scene:T.Scene){this.scene=scene;}
 add(root:T.Group){
  const parts:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&(o.userData.modelAsset||o.userData.batchHealthBar)&&!Array.isArray(o.material)){parts.push(o);o.layers.disable(0);}});
  this.sources.push({root,parts});
 }
 remove(root:T.Group){const source=this.sources.find(s=>s.root===root);if(source)for(const part of source.parts)part.layers.enable(0);this.sources=this.sources.filter(source=>source.root!==root);}
 clear(){for(const source of this.sources)for(const part of source.parts)part.layers.enable(0);this.sources=[];for(const b of this.batches.values()){b.mesh.removeFromParent();b.mesh.dispose();}this.batches.clear();}
 update(camera:T.Camera){
  camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const groups=new Map<string,T.Mesh[]>();
  for(const {root,parts} of this.sources){
   if(!root.parent||!root.visible)continue;
   this.sphere.center.copy(root.position);this.sphere.radius=root.userData.cullRadius??9;if(!this.frustum.intersectsSphere(this.sphere))continue;
   // Scene.onBeforeRender runs after Three.js updates all rig matrices.
   for(const part of parts){let visible=true;for(let p:T.Object3D|null=part;p&&p!==root;p=p.parent)if(!p.visible){visible=false;break;}if(!visible)continue;
    const key=part.userData.batchHealthBar?'health-bars':`${part.geometry.uuid}:${(part.material as T.Material).uuid}:${part.castShadow}:${part.receiveShadow}`;let group=groups.get(key);if(!group){group=[];groups.set(key,group);}group.push(part);
   }
  }
  for(const [key,batch] of this.batches)if(!groups.has(key)){batch.mesh.count=0;}
  for(const [key,parts] of groups){
   let batch=this.batches.get(key);
   if(!batch||batch.capacity<parts.length){if(batch){batch.mesh.removeFromParent();batch.mesh.dispose();}const capacity=2**Math.ceil(Math.log2(Math.max(16,parts.length))),first=parts[0];
    const health=!!first.userData.batchHealthBar;
    const mesh=new T.InstancedMesh(health?this.barGeometry:first.geometry,health?this.barMaterial:instancedMaterial(first.material as T.Material,false),capacity);mesh.renderOrder=first.renderOrder;mesh.userData.healthBarBatch=health;mesh.name='EnemySurfaceBatch';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);if(health)mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(capacity*3).fill(1),3).setUsage(T.DynamicDrawUsage);this.scene.add(mesh);batch={mesh,capacity};this.batches.set(key,batch);
   }
   const mesh=batch.mesh,countChanged=mesh.count!==parts.length;mesh.count=parts.length;
   let matrixFirst=parts.length,matrixEnd=0,colorFirst=parts.length,colorEnd=0;
   for(let i=0;i<parts.length;i++){
    const part=parts[i];
    if(writeMatrix(mesh.instanceMatrix,i,part.matrixWorld)){matrixFirst=Math.min(matrixFirst,i);matrixEnd=i+1;}
    if(part.userData.batchHealthBar&&writeColor(mesh.instanceColor!,i,(part.material as T.MeshBasicMaterial).color)){colorFirst=Math.min(colorFirst,i);colorEnd=i+1;}
   }
   uploadRange(mesh.instanceMatrix,matrixFirst*16,matrixEnd*16);
   if(mesh.instanceColor)uploadRange(mesh.instanceColor,colorFirst*3,colorEnd*3);
   if(countChanged||matrixEnd>0||!mesh.boundingSphere)mesh.computeBoundingSphere();
  }
 }
}
