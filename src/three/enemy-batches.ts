import * as T from 'three';

interface Source {root:T.Group;parts:T.Mesh[];}
interface Batch {mesh:T.InstancedMesh;capacity:number;}
/** Draw repeated enemy surfaces together while retaining each unit's original animated rig. */
export class EnemyBatches {
 private sources:Source[]=[];
 private batches=new Map<string,Batch>();
 private frustum=new T.Frustum();private matrix=new T.Matrix4();private sphere=new T.Sphere(new T.Vector3(),9);
 private scene:T.Scene; constructor(scene:T.Scene){this.scene=scene;}
 add(root:T.Group){
  const parts:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&o.userData.modelAsset&&!Array.isArray(o.material)){parts.push(o);o.layers.disable(0);}});
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
    const key=`${part.geometry.uuid}:${(part.material as T.Material).uuid}:${part.castShadow}:${part.receiveShadow}`;let group=groups.get(key);if(!group){group=[];groups.set(key,group);}group.push(part);
   }
  }
  for(const [key,batch] of this.batches)if(!groups.has(key)){batch.mesh.count=0;}
  for(const [key,parts] of groups){
   let batch=this.batches.get(key);
   if(!batch||batch.capacity<parts.length){if(batch){batch.mesh.removeFromParent();batch.mesh.dispose();}const capacity=2**Math.ceil(Math.log2(Math.max(16,parts.length))),first=parts[0];
    const mesh=new T.InstancedMesh(first.geometry,first.material,capacity);mesh.name='EnemySurfaceBatch';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(mesh);batch={mesh,capacity};this.batches.set(key,batch);
   }
   batch.mesh.count=parts.length;parts.forEach((part,i)=>batch!.mesh.setMatrixAt(i,part.matrixWorld));batch.mesh.instanceMatrix.needsUpdate=true;batch.mesh.computeBoundingSphere();
  }
 }
}
