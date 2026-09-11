import {MISSIONS} from './campaign';
import * as T from 'three';
import type {Game,Unit} from './game';
import {distance,segmentBox,segmentCircle,turnToward,clamp,circleBox} from './rules';
import type {Point} from './rules';
import {BOUNDS} from './activities';
export type BossKind='rail'|'missile'|'walker'|'helicopter'|'spider'|'laser';
export const bossKind=(mission:number):BossKind=>MISSIONS[mission]?.boss??(['rail','laser','helicopter','spider','missile','rail','missile','helicopter','walker','laser','spider','helicopter','spider','laser','spider','helicopter'] as BossKind[])[mission%16];
export const BOSS={rail:{name:'Rail Titan',health:800,radius:2.5,charge:1.4},missile:{name:'Tempest Carrier',health:850,radius:2.5,charge:1.6},walker:{name:'Iron Sovereign',health:1050,radius:3.4,charge:1.0},helicopter:{name:'Sky Wraith',health:680,radius:3,charge:1.8},spider:{name:'Rift Stalker',health:920,radius:3.8,charge:1.2},laser:{name:'Prism Reaper',health:780,radius:2.5,charge:1.5}};
interface State{phase:'tracking'|'charging'|'exposed'|'landing'|'firing';time:number;burst?:number;landing?:Point;heading:number;targets:Point[];markers:T.Mesh[];rockets:T.Mesh[];}
export class BossCombat{
 states=new Map<Unit,State>();
 cancel(unit:Unit){const state=this.states.get(unit);if(state)for(const r of state.rockets)r.removeFromParent();if(state)for(const m of state.markers){m.removeFromParent();m.geometry.dispose();(m.material as T.Material).dispose();}unit.visual.beam.visible=false;this.states.delete(unit);}
 clear(){for(const u of [...this.states.keys()])this.cancel(u);}
 multiplier(unit:Unit){return this.states.get(unit)?.phase==='exposed'?1.75:.65;}
 status(unit:Unit){const phase=this.states.get(unit)?.phase;if(unit.bossKind==='helicopter'&&unit.visual.root.position.y>2)return phase==='landing'?'LANDING':phase==='charging'?'ROCKETS INBOUND':'AIRBORNE · LASER / ARC';return phase==='firing'?'LASER BURST':phase==='charging'?'ATTACK INBOUND':phase==='exposed'?'CORE EXPOSED':'ARMORED';}
 update(g:Game,u:Unit,dt:number){
  if(u.dead||dt<=0||g.phase!=='playing')return;
  const kind=u.bossKind??bossKind(g.mission),cfg=BOSS[kind],p=u.visual.root.position,target=g.player.visual.root.position;
  let s=this.states.get(u);if(!s){s={phase:'tracking',time:2.2+g.enemies.indexOf(u)%4*.55,heading:u.aim,targets:[],markers:[],rockets:[]};this.states.set(u,s);}
  const core=u.visual.root.getObjectByName('Core');if(core)core.visible=s.phase==='exposed';u.visual.beam.visible=false;u.visual.root.userData.walking=false;
  if(kind==='helicopter'){const rotor=u.visual.root.getObjectByName('Rotor'),tail=u.visual.root.getObjectByName('TailRotor');if(rotor)rotor.rotation.y+=dt*(s.phase==='exposed'?5:28);if(tail)tail.rotation.x+=dt*35;}
  if(s.phase==='tracking'){
   const dist=distance(p,target),aim=Math.atan2(target.x-p.x,target.z-p.z);u.aim=turnToward(u.aim,aim,dt*1.4);
   if(kind==='helicopter'){
    if(!s.landing||dist>50&&distance(p,s.landing)<1||!this.freeLanding(g,u,s.landing))s.landing=this.landingPoint(g,u);this.fly(u,s.landing,6.5,dt);u.heading=turnToward(u.heading,aim,dt);
   }else if(dist>24||kind==='walker'||kind==='spider'){
    if(kind==='spider'&&s.time<=0)s.landing??=this.landingPoint(g,u);
    const seeking=kind==='spider'&&s.landing,march=seeking?Math.atan2(s.landing!.x-p.x,s.landing!.z-p.z):aim;
    const forward=seeking?1:dist>24?1:dist<15?-.6:kind==='spider'?.7:0,side=seeking?0:kind==='walker'||kind==='spider'?.6:0;
    const dx=(Math.sin(march)*forward+Math.cos(march)*side)*2.3*dt,dz=(Math.cos(march)*forward-Math.sin(march)*side)*2.3*dt;
    if(kind==='spider')this.climb(g,u,dx,dz,dt);else g.moveUnit(u,dx,dz,dt);u.heading=turnToward(u.heading,aim,dt);
   }
   if(kind==='spider'&&(p.y>.2||g.world.covers.some(c=>c.hp>0&&circleBox(p,g.unitRadius(u),c)))){s.time-=dt;g.syncVisual(u);this.legs(g,u,4);return;}
   if(dist>52){g.syncVisual(u);return;}s.time-=dt;
   if(s.time<=0){if(kind==='spider')s.landing=undefined;s.phase='charging';s.time=cfg.charge;s.heading=aim;u.aim=aim;s.targets=kind==='missile'||kind==='helicopter'?[-5,0,5].map(dx=>({x:clamp(target.x+dx,-BOUNDS.x,BOUNDS.x),z:clamp(target.z+(dx===0?3:-2),-BOUNDS.z,BOUNDS.z)})):[];
    for(const t of s.targets){const marker=new T.Mesh(new T.RingGeometry(4.3,4.5,48),new T.MeshBasicMaterial({color:0xff6655,transparent:true,opacity:.8,side:T.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.set(t.x,.18,t.z);marker.renderOrder=2;(marker.material as T.Material).depthWrite=false;g.world.entities.add(marker);s.markers.push(marker);const rocket=g.world.rocket();rocket.visible=false;rocket.rotation.x=Math.PI/2;rocket.position.set(t.x,28,t.z);g.world.entities.add(rocket);s.rockets.push(rocket);}
   }
  }else if(s.phase==='charging'){
   s.time-=dt;u.aim=s.heading;
   if(kind!=='missile'&&kind!=='helicopter'){const beam=u.visual.beam;beam.visible=true;beam.scale.set(kind==='walker'||kind==='spider'?3:1,1,52);beam.position.set(p.x+Math.sin(s.heading)*26,.13,p.z+Math.cos(s.heading)*26);beam.rotation.y=s.heading;}
   if((kind==='missile'||kind==='helicopter')&&s.time<.65)for(const rocket of s.rockets){rocket.visible=true;rocket.position.y=Math.max(.5,s.time/.65*28);if(g.trailClock<=0)g.world.rocketTrail(rocket);}
   for(const m of s.markers)(m.material as T.MeshBasicMaterial).opacity=.65+Math.sin(g.elapsed*12)*.2;
   if(s.time<=0){
    if(kind==='rail')this.rail(g,u,s.heading);
    if(kind==='missile'||kind==='helicopter')for(const t of s.targets){g.world.fx.impact(new T.Vector3(t.x,.8,t.z),true);g.explode(t,4.5,70);}
    if(kind==='walker'||kind==='spider'){for(const angle of [-.22,0,.22]){u.aim=s.heading+angle;g.shoot(u,false);}u.aim=s.heading;}
    for(const m of s.markers){m.removeFromParent();m.geometry.dispose();(m.material as T.Material).dispose();}s.markers=[];for(const r of s.rockets)r.removeFromParent();s.rockets=[];u.visual.beam.visible=false;s.phase=kind==='helicopter'?'landing':kind==='laser'?'firing':'exposed';s.time=kind==='laser'?1:kind==='spider'?3.5:2.4;s.burst=0;if(kind==='helicopter')s.landing=this.landingPoint(g,u);
   }
  }else if(s.phase==='landing'){
   s.landing??=this.landingPoint(g,u);if(!this.freeLanding(g,u,s.landing))s.landing=this.landingPoint(g,u);
   this.fly(u,s.landing,distance(p,s.landing)<.7?0:6.5,dt);
   if(distance(p,s.landing)<.7&&p.y<.15){p.y=0;s.phase='exposed';s.time=4;}
  }else if(s.phase==='firing'){
   s.time-=dt;s.burst=(s.burst??0)-dt;u.aim=s.heading;
   if(s.burst<=0){s.burst=.2;this.rail(g,u,s.heading,16,0x8bffff);}
   if(s.time<=0){s.phase='exposed';s.time=2.8;}
  }else{ s.time-=dt;if(s.time<=0){s.phase='tracking';s.time=kind==='helicopter'?3.6:u.hp<u.max*.5?1.2:2.2;s.landing=undefined;} }
  if(kind==='walker'||kind==='spider')this.legs(g,u,kind==='spider'?4:3);
  if(core)core.visible=s.phase==='exposed';g.syncVisual(u);
 }
 legs(g:Game,u:Unit,count:number){for(let i=0;i<count;i++)for(const side of ['L','R']){const leg=u.visual.root.getObjectByName('Leg'+i+side);if(leg)leg.rotation.z=u.visual.root.userData.walking?Math.sin(g.elapsed*6+i*2+(side==='L'?0:Math.PI))*.18:0;}}
 freeLanding(g:Game,u:Unit,p:Point){const r=g.unitRadius(u),reserved=[...this.states].some(([other,state])=>other!==u&&!other.dead&&state.landing&&distance(p,state.landing)<r+g.unitRadius(other)+.5);return !reserved&&Math.abs(p.x)<BOUNDS.x-r&&Math.abs(p.z)<BOUNDS.z-r&&!g.world.covers.some(c=>c.hp>0&&circleBox(p,r,c))&&[g.player,...g.enemies].every(e=>e===u||e.dead||g.airborne(e)||distance(p,e.visual.root.position)>r+g.unitRadius(e)+.5)&&(!g.convoy||distance(p,g.convoy.position)>r+2.5);}
 landingPoint(g:Game,u:Unit):Point{
  const player=g.player.visual.root.position,position=u.visual.root.position;
  // The far side of a nearby obstacle hides a grounded aircraft from direct fire.
  const covers=g.world.covers.filter(c=>c.hp>0&&distance(c,player)>12&&distance(c,position)<52).sort((a,b)=>distance(a,player)-distance(b,player));
  for(const c of covers){const d=Math.max(.1,distance(c,player)),offset=Math.max(c.w,c.d)/2+g.unitRadius(u)+1;const p={x:c.x+(c.x-player.x)/d*offset,z:c.z+(c.z-player.z)/d*offset};if(this.freeLanding(g,u,p))return p;}
  for(let radius=8;radius<70;radius+=6)for(let i=0;i<16;i++){const a=Math.atan2(player.x-position.x,player.z-position.z)+i*Math.PI/8,p={x:position.x+Math.sin(a)*radius,z:position.z+Math.cos(a)*radius};if(this.freeLanding(g,u,p))return p;}
  return {x:position.x,z:position.z};
 }
 fly(u:Unit,target:Point,height:number,dt:number){const p=u.visual.root.position,d=distance(p,target),travel=Math.min(d,dt*6);if(d>.01){p.x+=(target.x-p.x)/d*travel;p.z+=(target.z-p.z)/d*travel;}p.y+=clamp(height-p.y,-dt*3,dt*3);u.visual.root.userData.walking=false;}
 climb(g:Game,u:Unit,dx:number,dz:number,dt:number){
  if(g.hazards.quaking){u.velocity={x:0,z:0};return;}
  const p=u.visual.root.position,r=g.unitRadius(u),next={x:clamp(p.x+dx,-BOUNDS.x+r,BOUNDS.x-r),z:clamp(p.z+dz,-BOUNDS.z+r,BOUNDS.z-r)};
  const blocked=[g.player,...g.enemies].some(e=>e!==u&&!e.dead&&distance(next,e.visual.root.position)<r+g.unitRadius(e))||!!(g.convoy&&distance(next,g.convoy.position)<r+2.4);
  if(!blocked){p.x=next.x;p.z=next.z;u.visual.root.userData.walking=true;}
  const speed=Math.max(.01,Math.hypot(dx,dz)),ahead={x:p.x+dx/speed*2,z:p.z+dz/speed*2};let height=0;
  for(const c of g.world.covers)if(c.hp>0&&(circleBox(p,r,c)||circleBox(ahead,r,c)))height=Math.max(height,c.kind==='cityblock'?9:c.kind==='house'?5:c.kind==='hill'||c.kind==='glacier'?5:c.kind==='volcano'?13:2.5);
  p.y+=(height-p.y)*Math.min(1,dt*8);
 }
 rail(g:Game,u:Unit,heading:number,damage=75,color=0xff694e){
  const from=u.visual.root.position.clone().setY(1.5),to=from.clone().add(new T.Vector3(Math.sin(heading)*52,0,Math.cos(heading)*52));let first=1,hit:(()=>void)|null=null;
  for(const c of g.world.covers){if(c.hp<=0)continue;const t=segmentBox(from,to,c,.1);if(t!==null&&t<first){first=t;hit=()=>g.hitCover(c,damage*1.2);}}
  const t=segmentCircle(from,to,g.player.visual.root.position,1.3);if(t!==null&&t<first){first=t;hit=()=>g.damageUnit(g.player,damage,from);}if(hit)hit();to.lerpVectors(from,to,first);const dir=to.clone().sub(from);
  const mesh=new T.Mesh(new T.CylinderGeometry(.2,.2,Math.max(.01,dir.length()),8),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:T.AdditiveBlending}));mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());g.world.entities.add(mesh);g.special.beams.push({mesh,life:.18});g.world.fx.impact(to,true);g.tone(80,.15,.05);
 }
}
