import {MISSIONS} from './campaign';
import * as T from 'three';
import type {Game,Unit} from './game';
import {distance,segmentBox,segmentCircle,turnToward,clamp} from './rules';
import type {Point} from './rules';
import {BOUNDS} from './activities';
export type BossKind='rail'|'missile'|'walker';
export const bossKind=(mission:number):BossKind=>MISSIONS[mission]?.boss??'rail';
export const BOSS={rail:{name:'Rail Titan',health:800,radius:2.5,charge:1.4},missile:{name:'Tempest Carrier',health:850,radius:2.5,charge:1.6},walker:{name:'Iron Sovereign',health:1050,radius:3.4,charge:1.0}};
interface State{phase:'tracking'|'charging'|'exposed';time:number;heading:number;targets:Point[];markers:T.Mesh[];rockets:T.Mesh[];}
export class BossCombat{
 states=new Map<Unit,State>();
 cancel(unit:Unit){const state=this.states.get(unit);if(state)for(const r of state.rockets)r.removeFromParent();if(state)for(const m of state.markers){m.removeFromParent();m.geometry.dispose();(m.material as T.Material).dispose();}unit.visual.beam.visible=false;this.states.delete(unit);}
 clear(){for(const u of [...this.states.keys()])this.cancel(u);}
 multiplier(unit:Unit){return this.states.get(unit)?.phase==='exposed'?1.75:.65;}
 status(unit:Unit){const phase=this.states.get(unit)?.phase;return phase==='charging'?'ATTACK INBOUND':phase==='exposed'?'CORE EXPOSED':'ARMORED';}
 update(g:Game,u:Unit,dt:number){
  const kind=bossKind(g.mission),cfg=BOSS[kind],p=u.visual.root.position,target=g.player.visual.root.position;
  let s=this.states.get(u);if(!s){s={phase:'tracking',time:2.2,heading:u.aim,targets:[],markers:[],rockets:[]};this.states.set(u,s);}
  const core=u.visual.root.getObjectByName('Core');if(core)core.visible=s.phase==='exposed';u.visual.beam.visible=false;u.visual.root.userData.walking=false;
  if(s.phase==='tracking'){
   const dist=distance(p,target),aim=Math.atan2(target.x-p.x,target.z-p.z);u.aim=turnToward(u.aim,aim,dt*1.4);
   if(dist>24||kind==='walker') {const forward=dist>24?1:dist<15?-.6:0,side=kind==='walker'?.6:0;g.moveUnit(u,(Math.sin(aim)*forward+Math.cos(aim)*side)*2.3*dt,(Math.cos(aim)*forward-Math.sin(aim)*side)*2.3*dt,dt);u.heading=turnToward(u.heading,aim,dt);}
   if(dist>52){g.syncVisual(u);return;}s.time-=dt;
   if(s.time<=0){s.phase='charging';s.time=cfg.charge;s.heading=aim;u.aim=aim;s.targets=kind==='missile'?[-5,0,5].map(dx=>({x:clamp(target.x+dx,-BOUNDS.x,BOUNDS.x),z:clamp(target.z+(dx===0?3:-2),-BOUNDS.z,BOUNDS.z)})):[];
    for(const t of s.targets){const marker=new T.Mesh(new T.RingGeometry(4.3,4.5,48),new T.MeshBasicMaterial({color:0xff6655,transparent:true,opacity:.8,side:T.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.set(t.x,.1,t.z);g.world.entities.add(marker);s.markers.push(marker);const rocket=g.world.rocket();rocket.visible=false;rocket.rotation.x=Math.PI/2;rocket.position.set(t.x,28,t.z);g.world.entities.add(rocket);s.rockets.push(rocket);}
   }
  }else if(s.phase==='charging'){
   s.time-=dt;u.aim=s.heading;
   if(kind!=='missile'){const beam=u.visual.beam;beam.visible=true;beam.scale.set(kind==='walker'?3:1,1,52);beam.position.set(p.x+Math.sin(s.heading)*26,.13,p.z+Math.cos(s.heading)*26);beam.rotation.y=s.heading;}
   if(kind==='missile'&&s.time<.65)for(const rocket of s.rockets){rocket.visible=true;rocket.position.y=Math.max(.5,s.time/.65*28);if(g.trailClock<=0)g.world.rocketTrail(rocket);}
   for(const m of s.markers)(m.material as T.MeshBasicMaterial).opacity=.65+Math.sin(g.elapsed*12)*.2;
   if(s.time<=0){
    if(kind==='rail')this.rail(g,u,s.heading);
    if(kind==='missile')for(const t of s.targets){g.world.fx.impact(new T.Vector3(t.x,.8,t.z),true);g.explode(t,4.5,70);}
    if(kind==='walker'){for(const angle of [-.22,0,.22]){u.aim=s.heading+angle;g.shoot(u,false);}u.aim=s.heading;}
    for(const m of s.markers){m.removeFromParent();m.geometry.dispose();(m.material as T.Material).dispose();}s.markers=[];for(const r of s.rockets)r.removeFromParent();s.rockets=[];u.visual.beam.visible=false;s.phase='exposed';s.time=2.4;
   }
  }else{ s.time-=dt;if(s.time<=0){s.phase='tracking';s.time=u.hp<u.max*.5?1.2:2.2;} }
  if(kind==='walker')for(let i=0;i<3;i++)for(const side of ['L','R']){const leg=u.visual.root.getObjectByName('Leg'+i+side);if(leg)leg.rotation.z=u.visual.root.userData.walking?Math.sin(g.elapsed*6+i*2+(side==='L'?0:Math.PI))*.18:0;}
  if(core)core.visible=s.phase==='exposed';g.syncVisual(u);
 }
 rail(g:Game,u:Unit,heading:number){
  const from=u.visual.root.position.clone().setY(1.5),to=from.clone().add(new T.Vector3(Math.sin(heading)*52,0,Math.cos(heading)*52));let first=1,hit:(()=>void)|null=null;
  for(const c of g.world.covers){if(c.hp<=0)continue;const t=segmentBox(from,to,c,.1);if(t!==null&&t<first){first=t;hit=()=>g.hitCover(c,90);}}
  const t=segmentCircle(from,to,g.player.visual.root.position,1.3);if(t!==null&&t<first){first=t;hit=()=>g.damageUnit(g.player,75,from);}if(hit)hit();to.lerpVectors(from,to,first);const dir=to.clone().sub(from);
  const mesh=new T.Mesh(new T.CylinderGeometry(.2,.2,Math.max(.01,dir.length()),8),new T.MeshBasicMaterial({color:0xff694e,transparent:true,opacity:.9,blending:T.AdditiveBlending}));mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());g.world.entities.add(mesh);g.special.beams.push({mesh,life:.18});g.world.fx.impact(to,true);g.tone(80,.15,.05);
 }
}
