import * as T from 'three';
import type {Game,Unit} from './game';
import type {Point} from './rules';
import {circleBox,distance,turnToward} from './rules';
import {MINE_TRIGGER_RADIUS} from './combat-ranges';
import {clearSight} from './encounters';

/** Enemy transport helicopters on Large skirmish maps. They fly infantry to a marked landing zone,
 *  where they sit with the ramp down; in the air only laser, arc rockets and missiles reach them. */
export const AIRLIFT={altitude:11,cruise:14,descent:3.2,climb:3.6,ramp:.8,gap:.55,dwell:1.2,open:1.8,clearance:6,rampReach:7,rampClear:2,hover:3,divert:5} as const;
type Phase='ingress'|'descend'|'unload'|'ascend'|'egress';
/** `face` is the planned landing heading; the ramp opens on the opposite side. */
export interface Flight {unit:Unit;passengers:Unit[];lz:Point;face:number;exit:Point;phase:Phase;ramp:number;next:number;blocked:number;marker:T.Group;}

/** Where a ray from `from` along `bearing` leaves the battlefield, `margin` metres past the edge. */
export function edgePoint(g:Game,from:Point,bearing:number,margin:number):Point{
 const bx=g.world.bounds.x+margin,bz=g.world.bounds.z+margin,dx=Math.sin(bearing),dz=Math.cos(bearing);
 const tx=dx>1e-6?(bx-from.x)/dx:dx<-1e-6?(-bx-from.x)/dx:Infinity,tz=dz>1e-6?(bz-from.z)/dz:dz<-1e-6?(-bz-from.z)/dz:Infinity,t=Math.min(tx,tz);
 return {x:from.x+dx*t,z:from.z+dz*t};
}
const CANOPY=new Set(['pine','white-pine','palm','jungle-tree']);
/** Where the lowered ramp touches the ground for an airlift at `p` facing `face`. */
export function rampFoot(p:Point,face:number,reach:number=AIRLIFT.rampReach):Point{return {x:p.x-Math.sin(face)*reach,z:p.z-Math.cos(face)*reach};}
/** Room to land facing `face`: a clear circle for the fuselage and rotor discs plus the patch where the ramp
 *  comes down. Mines would detonate under it; repair pads and crates would be hidden beneath it.
 *  With `self` (a flight already on approach) hostile ground units only block the fuselage footprint,
 *  so their own armor rolling past does not stall the landing; the player and allies deny the whole zone. */
export function clearGround(g:Game,p:Point,face:number,self?:Unit){
 const r=AIRLIFT.clearance;
 // Tree canopies spread well past their trunk collision boxes; keep rotors and the ramp out of them.
 const open=(q:Point,radius:number)=>Math.abs(q.x)<g.world.bounds.x-radius-2&&Math.abs(q.z)<g.world.bounds.z-radius-2&&!g.world.covers.some(c=>c.hp>0&&circleBox(q,radius+(CANOPY.has(c.kind)?1.6:0),c))&&
  !g.world.activities.some(a=>!a.spent&&distance(q,a)<(a.kind==='mine'?MINE_TRIGGER_RADIUS:a.kind==='repair'?5:1.5)+radius);
 return open(p,r)&&open(rampFoot(p,face),AIRLIFT.rampClear)&&
  ![g.player,...g.enemies,...g.allies.active].some(u=>u!==self&&!u.dead&&!u.pending&&!g.airborne(u)&&distance(p,u.visual.root.position)<(self&&u!==g.player&&u.team!=='ally'?3.2:r)+g.unitRadius(u));
}

export class Airlifts {
 flights:Flight[]=[];
 private called=new Set<string>();
 clear(){this.flights=[];this.called.clear();}
 /** An empty airlift climbing out no longer counts toward the hostiles left, though it can still be shot down. */
 departing(u:Unit){return this.flights.some(f=>f.unit===u&&(f.phase==='ascend'||f.phase==='egress'||f.phase==='unload'&&!f.passengers.some(r=>r.aboard===u&&!r.dead)));}

 /** Clear landing ground around a bearing from `from`, trying each range in turn (so later ranges are
  *  fallbacks). The airlift arrives from beyond the zone flying toward `from`, so its ramp faces away.
  *  `hidden` prefers spots that cover screens from `from`; claimed zones stay 14 m apart. `flight` is
  *  an airlift already on approach, which does not block itself. */
 landingZone(g:Game,from:Point,bearing:number,ranges:number[],hidden=false,flight?:Flight):Point|null{
  let fallback:Point|null=null;const taken=this.flights.filter(f=>f!==flight&&f.phase!=='egress').map(f=>f.lz);
  for(const r of ranges)for(const turn of [0,.2,-.2,.4,-.4,.6,-.6,.8,-.8,1,-1]){
   const b=bearing+turn,p={x:from.x+Math.sin(b)*r,z:from.z+Math.cos(b)*r};
   if(taken.some(t=>distance(t,p)<14)||!clearGround(g,p,b+Math.PI,flight?.unit))continue;
   if(!hidden||!clearSight(g,from,p))return p;fallback??=p;
  }
  return fallback;
 }

 /** Launches an airlift from `from` (usually off the map edge) carrying `passengers` to `lz`. */
 dispatch(g:Game,team:number,color:string,passengers:Unit[],lz:Point,from:Point):Unit{
  const unit=g.makeUnit(from.x,from.z,'airlift');unit.squad=team;g.world.paintTeam(unit.visual,team);
  unit.visual.root.position.y=AIRLIFT.altitude;unit.heading=unit.aim=Math.atan2(lz.x-from.x,lz.z-from.z);g.enemies.push(unit);
  // Riders created mid-battle (reinforcements) start visible; hide them as they board.
  for(const p of passengers){p.pending=true;p.aboard=unit;p.visual.root.position.set(from.x,0,from.z);g.syncVisual(p);}
  const marker=this.marker(color);marker.position.set(lz.x,.09,lz.z);marker.rotation.y=unit.heading;g.world.entities.add(marker);
  this.flights.push({unit,passengers:[...passengers],lz:{...lz},face:unit.heading,exit:{...from},phase:'ingress',ramp:0,next:0,blocked:0,marker});
  g.syncVisual(unit);
  return unit;
 }
 /** Pulsing landing-zone rings in the team colour: the fuselage clearance, plus a small ring where the
  *  ramp comes down so the player can see where troops will step off. Rotate the group to the landing heading. */
 private marker(css:string){
  const color=new T.Color(css),group=new T.Group();group.name='AirliftLZ';
  const material=()=>new T.MeshBasicMaterial({color,transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide});
  for(const [inner,outer,z] of [[AIRLIFT.clearance-1.1,AIRLIFT.clearance-.3,0],[1.3,1.8,-AIRLIFT.rampReach]] as const){const ring=new T.Mesh(new T.RingGeometry(inner,outer,48),material());ring.rotation.x=-Math.PI/2;ring.position.z=z;ring.renderOrder=2;ring.userData.owned=true;group.add(ring);}
  return group;
 }

 update(g:Game,dt:number){
  const pace=g.skirmish?.pace??1;
  for(let i=this.flights.length-1;i>=0;i--){
   const f=this.flights[i],u=f.unit,p=u.visual.root.position;
   if(u.dead){this.flights.splice(i,1);this.dropMarker(f);continue;}
   const rig=u.visual.root;for(const [name,spin] of [['Rotor0',24],['Rotor1',-24]] as const){const rotor=rig.getObjectByName(name);if(rotor)rotor.rotation.y+=spin*dt;}
   if(f.phase==='ingress'){
    const d=distance(p,f.lz),dir=Math.atan2(f.lz.x-p.x,f.lz.z-p.z),step=Math.min(d,Math.min(AIRLIFT.cruise*pace,1.5+d*1.1)*dt);
    p.x+=Math.sin(dir)*step;p.z+=Math.cos(dir)*step;if(d>2)u.heading=turnToward(u.heading,dir,dt*1.6);
    if(d-step<.05){p.x=f.lz.x;p.z=f.lz.z;f.phase='descend';}
   }else if(f.phase==='descend'){
    // Yaw to the planned heading on the way down, so the ramp opens onto the ground that was checked.
    u.heading=turnToward(u.heading,f.face,dt*1.2);
    // Ground units sitting on the zone hold the airlift in a low hover; after a few seconds it diverts.
    if(clearGround(g,f.lz,f.face,u)){f.blocked=0;p.y=Math.max(0,p.y-Math.min(AIRLIFT.descent*pace,.8+p.y*1.2)*dt);if(p.y<=1e-3){p.y=0;u.heading=f.face;f.phase='unload';f.next=0;this.say(g,'land','IVO / An airlift is unloading. Its ramp is down: every gun can hit it now.');}}
    else{
     // Settle to the hover from above, or climb back to it if the zone was blocked late.
     p.y=p.y>AIRLIFT.hover?Math.max(AIRLIFT.hover,p.y-AIRLIFT.descent*pace*dt):Math.min(AIRLIFT.hover,p.y+AIRLIFT.climb*pace*dt);
     if(p.y===AIRLIFT.hover&&(f.blocked+=dt)>AIRLIFT.divert){const next=this.divert(g,f);if(next){f.lz=next.lz;f.face=next.face;f.marker.position.set(next.lz.x,.09,next.lz.z);f.marker.rotation.y=next.face;f.phase='ingress';}f.blocked=0;}
    }
   }else if(f.phase==='unload'){
    const aboard=f.passengers.filter(r=>r.aboard===u&&!r.dead);
    if(aboard.length){f.ramp=Math.min(1,f.ramp+dt/AIRLIFT.ramp);if(f.ramp>=1){f.next-=dt;if(f.next<=0){this.release(g,f,aboard[0]);f.next=AIRLIFT.gap/pace;}}}
    // The crew holds the ramp open a moment after the last rider steps off, then closes up.
    else if((f.next-=dt)>-AIRLIFT.dwell){f.marker.visible=false;}
    else{f.ramp=Math.max(0,f.ramp-dt/AIRLIFT.ramp);f.marker.visible=false;if(f.ramp<=0)f.phase='ascend';}
   }else if(f.phase==='ascend'){
    p.y=Math.min(AIRLIFT.altitude,p.y+AIRLIFT.climb*pace*dt);if(p.y>=AIRLIFT.altitude)f.phase='egress';
   }else{
    const d=distance(p,f.exit),dir=Math.atan2(f.exit.x-p.x,f.exit.z-p.z),step=Math.min(d,AIRLIFT.cruise*pace*dt);
    p.x+=Math.sin(dir)*step;p.z+=Math.cos(dir)*step;u.heading=turnToward(u.heading,dir,dt*1.6);
    // Off the map edge: leave quietly, without a kill or a wreck.
    if(d-step<.05){u.dead=true;u.hp=0;g.syncVisual(u);g.world.retireTank(u.visual);this.dropMarker(f);this.flights.splice(i,1);continue;}
   }
   const ramp=rig.getObjectByName('Ramp');if(ramp)ramp.rotation.x=-AIRLIFT.open*f.ramp;
   if(f.marker.visible){const pulse=.62+.25*Math.sin(g.elapsed*6);f.marker.traverse(o=>{if(o instanceof T.Mesh)(o.material as T.MeshBasicMaterial).opacity=pulse;});}
   for(const r of f.passengers)if(r.aboard===u)r.visual.root.position.set(p.x,0,p.z);
   g.syncVisual(u);
  }
 }
 /** Passengers walk off the foot of the ramp, into the nearest open ground if something blocks it. */
 private release(g:Game,f:Flight,r:Unit){
  const p=f.unit.visual.root.position,back=f.unit.heading+Math.PI,k=f.passengers.indexOf(r),side=(k%3-1)*1.3,base=rampFoot(p,f.unit.heading,AIRLIFT.rampReach+.6);
  const foot={x:base.x+Math.cos(back)*side,z:base.z-Math.sin(back)*side};
  let spot=foot;
  if(!g.canSpawnUnit(foot.x,foot.z,r.role))search:for(let d=1;d<=6;d++)for(let a=0;a<8;a++){const q={x:foot.x+Math.cos(a*Math.PI/4)*d,z:foot.z+Math.sin(a*Math.PI/4)*d};if(g.canSpawnUnit(q.x,q.z,r.role)){spot=q;break search;}}
  r.visual.root.position.set(spot.x,0,spot.z);r.heading=r.aim=back;r.pending=false;r.aboard=undefined;r.cooldown=Math.max(r.cooldown,1.2);g.syncVisual(r);
 }
 /** A blocked zone moves at least 20 m from the player, behind cover when possible, nose toward the
  *  player so the ramp opens away from their gun. */
 private divert(g:Game,f:Flight){
  const player=g.player.visual.root.position,d=distance(player,f.lz),away=d>1?Math.atan2(f.lz.x-player.x,f.lz.z-player.z):f.face+Math.PI;
  const lz=this.landingZone(g,player,away,[20,26,32,40,48].map(r=>Math.max(r,d+12)),true,f);
  return lz&&{lz,face:Math.atan2(player.x-lz.x,player.z-lz.z)};
 }
 /** A downed airlift takes everyone still aboard with it. */
 lost(g:Game,u:Unit){
  const f=this.flights.find(x=>x.unit===u);if(!f)return;
  const aboard=f.passengers.filter(r=>r.aboard===u&&!r.dead);
  for(const r of aboard){r.dead=true;r.hp=0;r.aboard=undefined;g.syncVisual(r);g.world.retireTank(r.visual);g.infantryKills++;}
  this.dropMarker(f);
  g.radioMessage(aboard.length?`KESTREL / Airlift down. ${aboard.length} soldier${aboard.length>1?'s':''} lost with it.`:'KESTREL / Airlift down.',3);
 }
 /** Markers own their ring geometry and materials; World.clear only frees what is still attached. */
 private dropMarker(f:Flight){if(!f.marker.parent)return;f.marker.removeFromParent();f.marker.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});}
 private say(g:Game,key:string,text:string){if(this.called.has(key))return;this.called.add(key);g.radioMessage(text,4);}
}
