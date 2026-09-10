import * as T from 'three';
type Kind='flash'|'smoke'|'spark'|'ring';
interface Particle {mesh:T.Mesh;age:number;life:number;size:number;velocity:T.Vector3;kind:Kind;}
/** Shared geometry and bounded transient particles; no external texture requests. */
export class CombatEffects {
  particles:Particle[]=[];low=false;
  plane=new T.PlaneGeometry(1,1);shard=new T.IcosahedronGeometry(1,0);ring=new T.RingGeometry(.86,1,48);
  texture:T.CanvasTexture;root=new T.Group();
  constructor(scene:T.Scene){
    scene.add(this.root);
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d')!;
    const gradient=ctx.createRadialGradient(64,64,3,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.25,'rgba(255,255,255,.8)');gradient.addColorStop(.65,'rgba(255,255,255,.25)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    this.texture=new T.CanvasTexture(canvas);
  }
  emit(p:T.Vector3,kind:Kind,color:number,size:number,life:number,velocity=new T.Vector3()){
    if(this.particles.length>=(this.low?85:230))return;
    const soft=kind==='flash'||kind==='smoke';
    const material=new T.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false,map:soft?this.texture:null,blending:kind==='flash'?T.AdditiveBlending:T.NormalBlending,side:T.DoubleSide});
    const mesh=new T.Mesh(soft?this.plane:kind==='ring'?this.ring:this.shard,material);mesh.position.copy(p);mesh.scale.setScalar(size);
    if(kind==='ring')mesh.rotation.x=-Math.PI/2;
    this.root.add(mesh);this.particles.push({mesh,age:0,life,size,velocity,kind});
  }
  muzzle(p:T.Vector3,heading:number,rocket=false){
    this.emit(p,'flash',rocket?0xff7735:0xffdd83,rocket?3:2.1,.1);
    for(let i=0;i<4;i++)this.emit(p,'spark',0xffdb82,.09,.2,new T.Vector3(Math.sin(heading)*13+(Math.random()-.5)*4,Math.random()*2,Math.cos(heading)*13+(Math.random()-.5)*4));
    this.emit(p,'smoke',0xb9ad90,1,.6,new T.Vector3(0,1.5,0));
  }
  smoke(p:T.Vector3,size=1,color=0x514d46){this.emit(p,'smoke',color,size,1.6,new T.Vector3(.35,1.5,.1));}
  impact(p:T.Vector3,large=false){
    this.emit(p,'flash',0xffc56c,large?8:2,.18);
    const floor=p.clone();floor.y=.09;this.emit(floor,'ring',0xd7b77e,large?2:.5,large?.65:.3);
    for(let i=0;i<(this.low?5:large?22:8);i++){
      const angle=Math.random()*Math.PI*2,speed=(large?12:5)*Math.random();
      this.emit(p,'spark',i%3===0?0x44413a:0xffa64d,large?.12+Math.random()*.16:.06,.6+Math.random()*.5,new T.Vector3(Math.sin(angle)*speed,2+Math.random()*8,Math.cos(angle)*speed));
    }
    if(large)for(let i=0;i<8;i++){
      const cloud=p.clone().add(new T.Vector3((Math.random()-.5)*3,Math.random()*2,(Math.random()-.5)*3));
      this.emit(cloud,'flash',i%2?0xff681f:0xffba40,2.5+Math.random()*2,.4+Math.random()*.3,new T.Vector3(0,2,0));
      this.emit(cloud,'smoke',0x47443e,2+Math.random()*2,2.5+Math.random(),new T.Vector3((Math.random()-.5)*2,2+Math.random()*2,0));
    }
  }
  update(dt:number,camera:T.Camera){
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.age+=dt;
      if(p.age>=p.life){p.mesh.removeFromParent();(p.mesh.material as T.Material).dispose();this.particles.splice(i,1);continue;}
      const t=p.age/p.life;p.mesh.position.addScaledVector(p.velocity,dt);
      if(p.kind==='spark'){p.velocity.y-=dt*16;p.mesh.rotation.x+=dt*6;if(p.mesh.position.y<.1){p.mesh.position.y=.1;p.velocity.y=Math.abs(p.velocity.y)*.2;p.velocity.multiplyScalar(.7);}}
      if(p.kind==='flash'||p.kind==='smoke')p.mesh.quaternion.copy(camera.quaternion);
      p.mesh.scale.setScalar(p.size*(p.kind==='smoke'?1+t*2.7:p.kind==='ring'?1+t*5:p.kind==='flash'?1+t*.7:1));
      (p.mesh.material as T.MeshBasicMaterial).opacity=(1-t)*(p.kind==='smoke'?.62:1);
    }
  }
  clear(){for(const p of this.particles){p.mesh.removeFromParent();(p.mesh.material as T.Material).dispose();}this.particles=[];}
}
