import * as T from 'three';
import type {Game} from './game';
import {createActivity} from './activities';
import type {Activity} from './activities';
import {distance,segmentBox} from './rules';
import {MINE_TRIGGER_RADIUS} from './combat-ranges';

interface Drop {activity:Activity;rig:T.Group;marker:T.Mesh;time:number;quiet?:boolean;}
/** A small mission allowance, independent of wreck loot, sharing the missile radio cooldown. */
export class AirSupport {
 used=0;drops:Drop[]=[];
 limit(g:Game){return g.save.difficulty==='easy'||g.save.difficulty==='crazy'?2:1;}
 remaining(g:Game){return Math.max(0,this.limit(g)-this.used);}
 payload(g:Game):{kind:'health'|'laser'|'arc'|'shield';amount:number}{
  if(g.player.hp<g.player.max*.8)return {kind:'health',amount:g.save.difficulty==='crazy'?35:40};
  if(g.save.weapons.includes(4)&&g.specialAmmo[1]<=2)return {kind:'arc',amount:2};
  if(g.save.weapons.includes(3)&&g.specialAmmo[0]<=4)return {kind:'laser',amount:4};
  return {kind:'shield',amount:4};
 }
 request(g:Game){
  if(g.phase!=='playing'||g.player.dead||g.artilleryCooldown>0||!this.remaining(g))return false;
  const site=this.site(g);
  if(!site){g.radioMessage('AIR SUPPORT / No clear landing site. Move into open ground.',3);return false;}
  const payload=this.payload(g);this.launch(g,payload.kind,payload.amount,site);this.used++;g.artilleryCooldown=28;
  g.radioMessage(`AIR SUPPORT / ${payload.kind==='health'?'Medical':payload.kind==='shield'?'Shield':'Ammo'} crate inbound. Collect at the mint circle.`,4);return true;
 }
 /** Easy opens with a small free cache beside the tank: a few laser shots and arc rockets, usable even
  *  before either weapon is bought. It uses neither the mission's drops nor the radio cooldown. */
 starter(g:Game){
  const laser=this.site(g,[],[6,8,10,12,14]),arc=laser&&this.site(g,[laser],[6,8,10,12,14]);
  if(laser)this.launch(g,'laser',4,laser,true);if(arc)this.launch(g,'arc',2,arc,true);
  return !!laser;
 }
 /** A visible, reachable nearby landing site ahead of the tank; never behind cover, on a mine or by fuel. */
 private site(g:Game,avoid:{x:number;z:number}[]=[],radii=[7,10,13]){
  const player=g.player.visual.root.position;
  let site:{x:number;z:number}|undefined;
  for(const radius of radii)for(let i=0;i<16&&!site;i++){
   const angle=g.player.heading+i*Math.PI/8,p={x:player.x+Math.sin(angle)*radius,z:player.z+Math.cos(angle)*radius};
   if(avoid.some(q=>distance(q,p)<4)||Math.abs(p.x)>g.world.bounds.x-5||Math.abs(p.z)>g.world.bounds.z-5||g.world.covers.some(c=>c.hp>0&&segmentBox(player,p,c,3)!==null)||g.world.activities.some(a=>!a.spent&&distance(a,p)<(a.kind==='mine'?MINE_TRIGGER_RADIUS+4:6))||g.world.covers.some(c=>c.hp>0&&['barrel','fuelcrate'].includes(c.kind)&&distance(c,p)<10)||g.hazards.danger(p))continue;
   site=p;
  }
  return site;
 }
 private launch(g:Game,kind:'health'|'laser'|'arc'|'shield',amount:number,site:{x:number;z:number},quiet=false){
  const activity=createActivity(g.world.entities,kind,site.x,site.z,amount);
  activity.airborne=true;activity.mesh.children[0].visible=false;activity.mesh.traverse(o=>{if(o.userData.activityLabel)o.visible=false;});activity.mesh.position.y=18;g.world.activities.push(activity);
  const rig=new T.Group();rig.name='SupplyParachute';rig.position.set(site.x,18,site.z);g.world.entities.add(rig);
  const canopy=new T.Mesh(new T.SphereGeometry(2.2,12,6,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0xd2eedf,roughness:1,side:T.DoubleSide}));canopy.position.y=3;canopy.scale.y=.55;rig.add(canopy);
  const ropes:number[]=[];for(let i=0;i<4;i++){const angle=Math.PI/4+i*Math.PI/2;ropes.push(Math.cos(angle)*.65,.6,Math.sin(angle)*.65,Math.cos(angle)*2.2,3,Math.sin(angle)*2.2);}
  const lines=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(ropes,3)),new T.LineBasicMaterial({color:0x394f4d}));rig.add(lines);
  const marker=new T.Mesh(new T.RingGeometry(2.9,3.1,32),new T.MeshBasicMaterial({color:0x86ffdf,side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));marker.rotation.x=-Math.PI/2;marker.position.set(site.x,.13,site.z);g.world.entities.add(marker);
  this.drops.push({activity,rig,marker,time:0,quiet});
 }
 dispose(drop:Drop){
  for(const root of [drop.rig,drop.marker]){root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});root.removeFromParent();}
 }
 update(g:Game,dt:number){
  if(g.phase!=='playing'||g.player.dead)return;
  for(let i=this.drops.length-1;i>=0;i--){const d=this.drops[i];d.time+=dt;const y=18*Math.max(0,1-d.time/3.2);d.activity.mesh.position.y=y;d.rig.position.y=y;d.rig.rotation.z=Math.sin(d.time*2)*.07;
   if(y===0){d.activity.airborne=false;d.activity.mesh.children[0].visible=true;d.activity.mesh.traverse(o=>{if(o.userData.activityLabel)o.visible=true;});this.dispose(d);this.drops.splice(i,1);if(!d.quiet)g.radioMessage('AIR SUPPORT / Crate landed. Move onto it to collect.',3);}
  }
 }
 clear(){for(const d of this.drops)this.dispose(d);this.drops=[];this.used=0;}
}
