import * as T from 'three';
import type {Game,Unit} from './game';

/** Visual-only motion for soldiers and light vehicles: individual strides, a walking bob, a lean into turns,
 *  breathing and look-around while idle, a gun kick when firing and a stagger when hit. All of it is maths on
 *  the rig's existing pivots (Hull, Turret, legs, wheels), so it costs a few multiplies per unit and no
 *  geometry. Gameplay never reads these offsets: restPose() puts the upper body back on the aim before a
 *  shot leaves the muzzle. */
interface Rig {
 hull:T.Object3D;turret:T.Object3D;legs:(T.Object3D|null)[];wheels:T.Object3D[];
 hullY:number;turretY:number;phase:number;amp:number;roll:number;lean:number;scan:number;lastX:number;lastZ:number;lastHeading:number;
}
const rigs=new WeakMap<Unit,Rig>();
const TAU=Math.PI*2;
/** Metres walked per full leg cycle (two steps) for a 2.3 m soldier; jeep wheel radius in metres. */
const STRIDE=1.7,WHEEL=.42;
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** A per-unit phase from where it was born, so no two soldiers march in step and no random numbers are used. */
const seedPhase=(x:number,z:number)=>{const s=Math.sin(x*12.9898+z*78.233)*43758.5453;return (s-Math.floor(s))*TAU;};

function rigFor(unit:Unit):Rig|null{
 const visual=unit.visual,cached=rigs.get(unit);
 // A detail swap rebuilds the visual, so a cached rig is valid only while it points at the live nodes.
 if(cached&&cached.hull===visual.hull&&cached.turret===visual.turret&&cached.legs.every(leg=>!leg||leg.parent))return cached;
 const root=visual.root,p=root.position;
 const rig:Rig={hull:visual.hull,turret:visual.turret,legs:[root.getObjectByName('LeftLeg')??null,root.getObjectByName('RightLeg')??null],
  wheels:['WheelFL','WheelFR','WheelRL','WheelRR'].map(name=>root.getObjectByName(name)).filter((w):w is T.Object3D=>!!w),
  hullY:cached?.hullY??visual.hull.position.y,turretY:cached?.turretY??visual.turret.position.y,phase:cached?.phase??seedPhase(p.x,p.z),amp:0,roll:cached?.roll??0,lean:0,scan:0,
  lastX:p.x,lastZ:p.z,lastHeading:unit.heading};
 // Yaw first, then pitch and roll in the body's own frame, so a stagger tips backwards whatever the heading.
 rig.hull.rotation.order=rig.turret.rotation.order='YXZ';
 rigs.set(unit,rig);return rig;
}

/** Called from Game.syncVisual after the hull and turret took the logic heading and aim. */
export function animateRig(game:Game,unit:Unit){
 const infantry=game.isInfantry(unit);
 if(!infantry&&unit.role!=='jeep')return;
 const rig=rigFor(unit);if(!rig)return;
 const p=unit.visual.root.position,t=game.elapsed;
 const dx=p.x-rig.lastX,dz=p.z-rig.lastZ;let moved=Math.hypot(dx,dz);if(moved>2)moved=0;   // a respawn or airlift drop is not a stride
 const turned=wrap(unit.heading-rig.lastHeading);rig.lastX=p.x;rig.lastZ=p.z;rig.lastHeading=unit.heading;
 const walking=!!unit.visual.root.userData.walking&&moved>1e-4;
 // Wheels turn by the distance driven along the heading, so they roll backwards when reversing.
 if(unit.role==='jeep'){rig.roll+=(moved?Math.sign(dx*Math.sin(unit.heading)+dz*Math.cos(unit.heading)):0)*moved/WHEEL;for(const wheel of rig.wheels)wheel.rotation.x=-rig.roll;return;}
 // Legs: the phase advances with distance walked, so the feet match the ground at any speed.
 rig.phase=(rig.phase+moved/STRIDE*TAU)%TAU;
 rig.amp+=((walking?.5:0)-rig.amp)*.2;
 const swing=Math.sin(rig.phase)*rig.amp;
 if(rig.legs[0])rig.legs[0].rotation.x=swing;if(rig.legs[1])rig.legs[1].rotation.x=-swing;
 // Body: a bob twice per cycle while walking, breathing while still, and a lean into turns.
 const bob=Math.abs(Math.sin(rig.phase))*.05*(rig.amp/.5),breath=Math.sin(t*2.1+rig.phase)*.012*(1-rig.amp/.5);
 rig.lean+=(Math.max(-.16,Math.min(.16,-turned*5))-rig.lean)*.2;
 const fired=t-(unit.visual.root.userData.firedAt??-9),hit=t-(unit.visual.root.userData.hitAt??-9);
 const kick=Math.max(0,1-fired/.18),stagger=Math.max(0,1-hit/.35);
 // Look-around only while calm: not while aiming (warning beam) or searching, not in a firefight, not right after a
 // hit and not while walking, so the gun points where the beam and the shot go.
 const engaged=unit.visual.beam.visible||(unit.searchUntil??-1)>t;
 const calm=!engaged&&fired>2.5&&hit>1.5&&rig.amp<.05;
 rig.scan+=((calm?Math.sin(t*.55+rig.phase)*.42:0)-rig.scan)*.06;
 // Lean and stagger bend the upper body only: legs (under Hull) and torso (under Turret) pivot at different
 // heights, so tilting both would open a gap at the hips.
 rig.hull.position.y=rig.hullY+bob;
 rig.turret.position.y=rig.turretY+bob+breath;rig.turret.rotation.y+=rig.scan;rig.turret.rotation.z=rig.lean;rig.turret.rotation.x=-kick*.12-stagger*.24;
}

/** Puts the upper body exactly on the logic aim (no scan, kick, lean or bob) before a shot reads the muzzle. */
export function restPose(unit:Unit){
 const rig=rigs.get(unit);if(!rig||rig.turret!==unit.visual.turret)return;
 rig.turret.rotation.set(0,unit.aim,0);rig.turret.position.y=rig.turretY;rig.scan=0;
}
export const noteShot=(unit:Unit,time:number)=>{unit.visual.root.userData.firedAt=time;};
export const noteHit=(unit:Unit,time:number)=>{unit.visual.root.userData.hitAt=time;};
