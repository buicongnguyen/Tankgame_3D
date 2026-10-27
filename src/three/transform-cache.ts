import * as T from 'three';

const cached = new WeakMap<T.Object3D,{native:T.Object3D['updateMatrixWorld'];optimized:T.Object3D['updateMatrixWorld']}>();
const watched = new WeakSet<T.Object3D>();
/** Opt-in to the r186 ordinary Object3D path. Explicit matrix updates remain native;
 * changed ancestors and force=true still propagate through the normal traversal. */
export function cacheTransform(object:T.Object3D) {
  if(cached.has(object)||object.updateMatrixWorld!==T.Object3D.prototype.updateMatrixWorld||object.updateMatrix!==T.Object3D.prototype.updateMatrix||object instanceof T.Bone)return;
  const original=object.updateMatrixWorld;
  let valid=false,parent:T.Object3D|null=null;
  let px=0,py=0,pz=0,qx=0,qy=0,qz=0,qw=1,sx=1,sy=1,sz=1;
  object.updateMatrixWorld=function(force?:boolean) {
    if(!this.matrixAutoUpdate||!this.matrixWorldAutoUpdate||this.pivot!==null){valid=false;original.call(this,force);return;}
    const p=this.position,q=this.quaternion,s=this.scale;
    const unchanged=valid&&parent===this.parent&&px===p.x&&py===p.y&&pz===p.z&&qx===q.x&&qy===q.y&&qz===q.z&&qw===q.w&&sx===s.x&&sy===s.y&&sz===s.z;
    if(!unchanged){
      // Reparenting is a world-transform change even if the local pose is identical.
      if(parent!==this.parent)this.matrixWorldNeedsUpdate=true;
      valid=true;parent=this.parent;px=p.x;py=p.y;pz=p.z;qx=q.x;qy=q.y;qz=q.z;qw=q.w;sx=s.x;sy=s.y;sz=s.z;
      original.call(this,force);return;
    }
    this.matrixAutoUpdate=false;
    try{original.call(this,force);}finally{this.matrixAutoUpdate=true;}
  };
  cached.set(object,{native:original,optimized:object.updateMatrixWorld});
}

export function cacheTransforms(root:T.Object3D){root.traverse(cacheTransform);}

/** Watch only the world's owning containers, not templates or every rig joint. */
export function cacheTransformChildren(root:T.Object3D){
  cacheTransforms(root);
  if(watched.has(root))return;
  watched.add(root);
  root.addEventListener('childadded',event=>cacheTransforms(event.child));
}

/** Development benchmarks can alternate native/cached traversal without changing poses. */
export function setTransformCachingEnabled(root:T.Object3D,enabled:boolean){
  root.traverse(object=>{const methods=cached.get(object);if(methods)object.updateMatrixWorld=enabled?methods.optimized:methods.native;});
}
