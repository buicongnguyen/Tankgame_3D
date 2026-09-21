import * as T from 'three';
import type {Game,Unit} from './game';
import type {Point} from './rules';
import {distance,segmentBox,turnToward} from './rules';
import {routeSample} from './stage-layout';
import {clearSight} from './encounters';
interface RescueTank {unit:Unit;rescued:boolean;progress:number;marker:T.Mesh;target?:Unit;scanAt?:number;next?:Point;repathAt?:number;}
export class Allies {
 tanks:RescueTank[]=[];trail:Point[]=[];gun:T.Group|null=null;cooldown=2;burst=0;scanAt=0;target?:Unit;
 clear(){for(const a of this.tanks){a.marker.removeFromParent();a.marker.geometry.dispose();(a.marker.material as T.Material).dispose();}this.tanks=[];this.trail=[];this.gun=null;this.cooldown=2;this.burst=0;this.scanAt=0;this.target=undefined;}
 get active(){return this.tanks.filter(a=>a.rescued).map(a=>a.unit);}
 get saved(){return this.tanks.filter(a=>a.rescued).length;}
 get survivors(){return this.active.filter(u=>!u.dead).length;}
 setup(g:Game){
  if(g.convoy&&g.mission===2){const name=g.level===0?'convoy-missile':g.level===1?'convoy-gun':null;if(name){this.gun=g.world.clone(name);this.gun.position.y=2.05;g.convoy.add(this.gun);}}
  if(g.missionData().kind!=='rescue')return;
  for(const fraction of [.34,.72]){const p=routeSample(g.world.layout.points,g.world.layout.length*fraction),u=g.makeUnit(p.x+p.dz*7,p.z-p.dx*7,'raider');u.team='ally';u.hp=u.max=560;u.cooldown=1;(u.visual.bar.material as T.MeshBasicMaterial).color.setHex(0x75fff1);g.world.enemyBatches.remove(u.visual.root);g.world.applySkin(u.visual.root,'guardian');u.visual.beam.visible=false;
   const marker=new T.Mesh(new T.RingGeometry(3.65,4,24),new T.MeshBasicMaterial({color:0x75fff1,side:T.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.copy(u.visual.root.position).setY(.2);g.world.entities.add(marker);this.tanks.push({unit:u,rescued:false,progress:0,marker});g.syncVisual(u);
  }
 }
 private validTarget(g:Game,from:Point,unit:Unit|undefined,range:number):unit is Unit {
  return !!unit&&!unit.dead&&!unit.pending&&unit.encounter?.active!==false&&!g.airborne(unit)&&distance(from,unit.visual.root.position)<range&&clearSight(g,from,unit.visual.root.position);
 }
 update(g:Game,dt:number){
  if(g.phase!=='playing'||g.player.dead)return;
  const player=g.player.visual.root.position;
  if(!this.trail.length||distance(this.trail.at(-1)!,player)>2){this.trail.push({x:player.x,z:player.z});if(this.trail.length>96)this.trail.shift();}
  for(const [i,a] of this.tanks.entries()){
   const u=a.unit,p=u.visual.root.position;if(u.dead){a.marker.visible=false;continue;}
   if(!a.rescued){const near=distance(p,player)<4,contested=g.enemies.some(e=>!e.dead&&!e.pending&&distance(e.visual.root.position,p)<10);if(near&&!contested)a.progress=Math.min(3,a.progress+dt);if(near&&Math.floor(g.elapsed*2)!==Math.floor((g.elapsed-dt)*2))g.radioMessage(contested?'RESCUE / Clear nearby guards.':`RESCUE / Restoring tank ${i+1} · ${Math.ceil(3-a.progress)}s`,1);a.marker.scale.setScalar(1+a.progress/12);
    if(a.progress>=3){a.rescued=true;a.marker.visible=false;g.radioMessage(`SQUADRON / Tank ${i+1} restored. Following Kestrel.`,4);}
    continue;
   }
   u.cooldown=Math.max(0,u.cooldown-dt);
   if(g.elapsed>=(a.scanAt??0)){a.scanAt=g.elapsed+.2;a.target=g.enemies.filter(e=>this.validTarget(g,p,e,26)).sort((a,b)=>distance(p,a.visual.root.position)-distance(p,b.visual.root.position))[0];}const target=this.validTarget(g,p,a.target,26)?a.target:undefined;
   if(target){const t=target.visual.root.position;u.aim=turnToward(u.aim,Math.atan2(t.x-p.x,t.z-p.z),dt*4);if(u.cooldown===0){g.syncVisual(u);g.allyRound(p,u.aim,34,32,0,u.visual.muzzle);u.cooldown=2.8;}}
   // Follow a short player breadcrumb trail; navigate around cover, never teleport through it.
   let walked=0,destination:Point=player;for(let n=this.trail.length-1;n>0;n--){walked+=distance(this.trail[n],this.trail[n-1]);destination=this.trail[n-1];if(walked>=6+i*5)break;}
   const exit=g.world.layout.points.at(-1)!,extracting=this.saved===2&&distance(player,exit)<7;
   // Close the formation at extraction, including when only the rear tank survives.
   if(extracting)destination=exit;
   const gap=distance(p,player),movement=g.input.movement(),blockedConvoy=!!(g.convoy&&distance(p,g.convoy.position)<5)||gap<4&&Math.hypot(movement.x,movement.z)>.1;
   if(blockedConvoy){destination={x:p.x+Math.cos(u.heading)*(i?1:-1)*4,z:p.z-Math.sin(u.heading)*(i?1:-1)*4};}
   if((extracting?distance(p,exit)>4:gap>5+i*2&&distance(p,destination)>2)||blockedConvoy){if(!a.next||g.elapsed>=(a.repathAt??0)||distance(p,a.next)<.7){a.next=g.navigation.next(g.world,p,destination)??undefined;a.repathAt=g.elapsed+.35;}let next=a.next;if(!g.world.covers.some(c=>c.hp>0&&segmentBox(p,destination,c,1.4)!==null))next=destination;
    if(next){const angle=Math.atan2(next.x-p.x,next.z-p.z);g.moveUnit(u,Math.sin(angle)*6*dt,Math.cos(angle)*6*dt,dt);u.heading=turnToward(u.heading,angle,dt*3);if(!target)u.aim=u.heading;}}
   g.syncVisual(u);
  }
  if(this.gun&&g.convoy&&g.convoyHealth>0){this.cooldown=Math.max(0,this.cooldown-dt);const p=g.convoy.position,missile=g.level===0;
   const range=missile?24:22;
   if(g.elapsed>=this.scanAt){
    this.scanAt=g.elapsed+.2;
    this.target=g.enemies.filter(e=>this.validTarget(g,p,e,range)).sort((a,b)=>(missile?Number(g.isInfantry(a))-Number(g.isInfantry(b)):Number(!g.isInfantry(a))-Number(!g.isInfantry(b)))||distance(p,a.visual.root.position)-distance(p,b.visual.root.position))[0];
   }
   // Recheck the cached target: it may move behind cover or take off between scans.
   const target=this.validTarget(g,p,this.target,range)?this.target:undefined;if(target){const angle=Math.atan2(target.visual.root.position.x-p.x,target.visual.root.position.z-p.z),turret=this.gun.getObjectByName('Turret')!;turret.rotation.y=angle-g.convoy.rotation.y;
    if(this.cooldown===0){g.allyRound(p,angle,missile?60:3,missile?30:44,missile?2.5:0,this.gun.getObjectByName('Muzzle')!,missile,missile?target:undefined);if(missile)this.cooldown=6;else {this.burst++;this.cooldown=this.burst%3===0?2:.14;}}}
  }
 }
 progress(g:Game){
  if(this.saved<2)return this.saved/3;
  const exit=g.world.layout.points.at(-1)!;
  const extracted=distance(g.player.visual.root.position,exit)<7&&this.active.some(u=>!u.dead&&distance(u.visual.root.position,exit)<7);
  return this.survivors>0&&(g.battlefieldClear()||extracted)?1:.9;
 }
}
