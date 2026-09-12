import * as T from 'three';
import type {Game,Unit} from './game';
import type {Cover} from './world';
export const isConcrete=(cover:Pick<Cover,'kind'>)=>cover.kind==='barricade'||cover.kind==='stonewall';
import {clamp,segmentBox,segmentCircle} from './rules';
import {BOUNDS} from './activities';
import {WEAPONS} from './armory';
export class SpecialWeapons{
 beams:{mesh:T.Mesh;life:number}[]=[];
 arcs:{mesh:T.Mesh;marker:T.Mesh;from:T.Vector3;target:T.Vector3;age:number;duration:number;damage:number;radius:number}[]=[];
 remove(mesh:T.Mesh){mesh.removeFromParent();if(mesh.userData.shared)return;mesh.geometry.dispose();(mesh.material as T.Material).dispose();}
 clear(){for(const b of this.beams)this.remove(b.mesh);for(const a of this.arcs){this.remove(a.mesh);this.remove(a.marker);}this.beams=[];this.arcs=[];}
 fire(g:Game,w:number){
  const start=g.player.visual.root.position.clone();start.y=1.5;
  const info=WEAPONS[w],damage=info.damage*g.playerDamageMultiplier(w);
  if(w===3){
   const end=start.clone().add(new T.Vector3(Math.sin(g.player.aim)*60,0,Math.cos(g.player.aim)*60));
   const intersections:{t:number;cover?:Cover;unit?:Unit}[]=[];
   for(const cover of g.world.covers){if(cover.hp<=0)continue;const t=segmentBox(start,end,cover,.05);if(t!==null)intersections.push({t,cover});}
   for(const unit of g.enemies){if(unit.dead)continue;const t=segmentCircle(start,end,unit.visual.root.position,g.unitRadius(unit));if(t!==null)intersections.push({t,unit});}
   intersections.sort((a,b)=>a.t-b.t||Number(!!b.cover)-Number(!!a.cover));
   const concrete=new Set<object>();let limit=1;
   const hits:typeof intersections=[];
   // Freeze this shot's obstruction order before explosions can remove more cover.
   for(const hit of intersections){
    hits.push(hit);if(!hit.cover)continue;
    // Adjacent panels share one barrier: crossing a seam must not consume another wall.
    if(isConcrete(hit.cover))concrete.add(hit.cover.section?.wall??hit.cover);
    if(!isConcrete(hit.cover)||concrete.size===2){limit=hit.t;break;}
   }
   for(const hit of hits){if(hit.cover)g.hitCover(hit.cover,damage,true);else if(hit.unit)g.damageUnit(hit.unit,damage,start,true);}
   end.lerpVectors(start,end,limit);const delta=end.clone().sub(start);
   const beam=new T.Mesh(new T.CylinderGeometry(.14,.14,Math.max(.01,delta.length()),8),new T.MeshBasicMaterial({color:0x8bffff,transparent:true,opacity:.95,blending:T.AdditiveBlending,depthWrite:false}));beam.position.copy(start).add(end).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());g.world.entities.add(beam);this.beams.push({mesh:beam,life:.18});g.world.fx.impact(end);g.tone(920,.12,.04);
  }else{
   const offset=g.aimPoint.clone().sub(start);offset.y=0;if(offset.length()>45)offset.setLength(45);
   const target=start.clone().add(offset);target.set(clamp(target.x,-BOUNDS.x,BOUNDS.x),0,clamp(target.z,-BOUNDS.z,BOUNDS.z));
   const count=w===7?3:1,lateral=new T.Vector3(Math.cos(g.player.aim),0,-Math.sin(g.player.aim));
   for(let i=0;i<count;i++){
    const side=i-(count-1)/2,from=start.clone().addScaledVector(lateral,side*.85),landing=target.clone().addScaledVector(lateral,side*3.2);
    landing.x=clamp(landing.x,-BOUNDS.x,BOUNDS.x);landing.z=clamp(landing.z,-BOUNDS.z,BOUNDS.z);
    const mesh=g.world.rocket();mesh.scale.setScalar(w===7?.9:1.25);mesh.position.copy(from);g.world.entities.add(mesh);
    const marker=new T.Mesh(new T.RingGeometry(info.splash-.16,info.splash,48),new T.MeshBasicMaterial({color:0xc392ff,side:T.DoubleSide,transparent:true,opacity:.65,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));marker.rotation.x=-Math.PI/2;marker.position.copy(landing).y=.12;g.world.entities.add(marker);
    this.arcs.push({mesh,marker,from,target:landing,age:0,duration:1.5,damage,radius:info.splash});
   }
   g.tone(140,.18,.05);
  }
 }
 update(g:Game,dt:number){
  for(let i=this.beams.length-1;i>=0;i--){const b=this.beams[i];b.life-=dt;if(b.life<=0){this.remove(b.mesh);this.beams.splice(i,1);}else (b.mesh.material as T.MeshBasicMaterial).opacity=b.life/.18;}
  for(let i=this.arcs.length-1;i>=0;i--){const a=this.arcs[i];a.age+=dt;const t=Math.min(1,a.age/a.duration),previous=a.mesh.position.clone();a.mesh.position.lerpVectors(a.from,a.target,t);a.mesh.position.y+=(4*t*(1-t))*16;const forward=a.mesh.position.clone().sub(previous);if(forward.lengthSq()>0)a.mesh.lookAt(a.mesh.position.clone().add(forward));if(g.trailClock<=0)g.world.rocketTrail(a.mesh);
   if(t>=1){g.world.fx.impact(a.target.clone().setY(.8),true);g.explode(a.target,a.radius,a.damage,true);this.remove(a.mesh);this.remove(a.marker);this.arcs.splice(i,1);}
  }
 }
}
