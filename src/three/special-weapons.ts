import * as T from 'three';
import type {Game} from './game';
import {clamp,segmentBox,segmentCircle} from './rules';
import {BOUNDS} from './activities';
export class SpecialWeapons{
 beams:{mesh:T.Mesh;life:number}[]=[];
 arcs:{mesh:T.Mesh;marker:T.Mesh;from:T.Vector3;target:T.Vector3;age:number;duration:number;damage:number}[]=[];
 remove(mesh:T.Mesh){mesh.removeFromParent();if(mesh.userData.shared)return;mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
 clear(){for(const b of this.beams)this.remove(b.mesh);for(const a of this.arcs){this.remove(a.mesh);this.remove(a.marker);}this.beams=[];this.arcs=[];}
 fire(g:Game,w:number){
  const start=g.player.visual.root.position.clone();start.y=1.5;
  const damage=(w===3?150:170)*(1+g.save.upgrades.power*.2+(g.powerBoost>0?.35:0));
  if(w===3){
   const end=start.clone().add(new T.Vector3(Math.sin(g.player.aim)*60,0,Math.cos(g.player.aim)*60));let first=1,hit:(()=>void)|null=null;
   for(const c of g.world.covers){if(c.hp<=0)continue;const t=segmentBox(start,end,c,.05);if(t!==null&&t<first){first=t;hit=()=>g.hitCover(c,damage);}}
   for(const u of g.enemies){if(u.dead)continue;const t=segmentCircle(start,end,u.visual.root.position,g.unitRadius(u));if(t!==null&&t<first){first=t;hit=()=>g.damageUnit(u,damage,start);}}
   end.lerpVectors(start,end,first);if(hit)hit();const delta=end.clone().sub(start);
   const beam=new T.Mesh(new T.CylinderGeometry(.14,.14,Math.max(.01,delta.length()),8),new T.MeshBasicMaterial({color:0x8bffff,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false}));beam.position.copy(start).add(end).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());g.world.entities.add(beam);this.beams.push({mesh:beam,life:.18});g.world.fx.impact(end);g.tone(920,.12,.04);
  }else{
   const offset=g.aimPoint.clone().sub(start);offset.y=0;if(offset.length()>45)offset.setLength(45);
   const target=start.clone().add(offset);target.set(clamp(target.x,-BOUNDS.x,BOUNDS.x),0,clamp(target.z,-BOUNDS.z,BOUNDS.z));
   const mesh=g.world.rocket();mesh.position.copy(start);g.world.entities.add(mesh);
   const marker=new T.Mesh(new T.RingGeometry(6.8,7,48),new T.MeshBasicMaterial({color:0xc392ff,side:T.DoubleSide,transparent:true,opacity:.65}));marker.rotation.x=-Math.PI/2;marker.position.copy(target).y=.1;g.world.entities.add(marker);
   this.arcs.push({mesh,marker,from:start,target,age:0,duration:1.5,damage});g.tone(140,.18,.05);
  }
 }
 update(g:Game,dt:number){
  for(let i=this.beams.length-1;i>=0;i--){const b=this.beams[i];b.life-=dt;if(b.life<=0){this.remove(b.mesh);this.beams.splice(i,1);}else (b.mesh.material as T.MeshBasicMaterial).opacity=b.life/.18;}
  for(let i=this.arcs.length-1;i>=0;i--){const a=this.arcs[i];a.age+=dt;const t=Math.min(1,a.age/a.duration),previous=a.mesh.position.clone();a.mesh.position.lerpVectors(a.from,a.target,t);a.mesh.position.y+=(4*t*(1-t))*16;const forward=a.mesh.position.clone().sub(previous);if(forward.lengthSq()>0)a.mesh.lookAt(a.mesh.position.clone().add(forward));if(g.trailClock<=0)g.world.rocketTrail(a.mesh);
   if(t>=1){g.world.fx.impact(a.target.clone().setY(.8),true);g.explode(a.target,7,a.damage);this.remove(a.mesh);this.remove(a.marker);this.arcs.splice(i,1);}
  }
 }
}
