import type * as T from 'three';
import type {Game} from './game';

/** Draws moving things between their last two fixed logic steps.
 *  The game simulates at a fixed 60 Hz; at an uneven frame rate a frame may advance 0, 1 or 2 steps, so drawing
 *  the latest step makes tanks, soldiers and shells jitter. capture() runs before every step, apply() moves each
 *  drawn object `alpha` of the way from that step's start to its end just before rendering, and restore() puts
 *  the exact logic transforms back right after, so gameplay, HUD projection and tests never see the blend. */
export class RenderSmoother{
 private objects:T.Object3D[]=[];private hulls:(T.Object3D|null)[]=[];private turrets:(T.Object3D|null)[]=[];
 // Per entry: x, y, z, hull (or object) yaw, turret yaw.
 private prev=new Float64Array(0);private curr=new Float64Array(0);private count=0;private applied=0;

 private ensure(n:number){if(this.prev.length>=n*5)return;const size=Math.max(n*10,256);const prev=new Float64Array(size);prev.set(this.prev);this.prev=prev;this.curr=new Float64Array(size);}
 private push(object:T.Object3D,hull:T.Object3D|null,turret:T.Object3D|null){
  const i=this.count++;this.ensure(this.count);this.objects[i]=object;this.hulls[i]=hull;this.turrets[i]=turret;
  const o=i*5,p=object.position;this.prev[o]=p.x;this.prev[o+1]=p.y;this.prev[o+2]=p.z;this.prev[o+3]=(hull??object).rotation.y;this.prev[o+4]=turret?.rotation.y??0;
 }
 /** Before each fixed step: remember the drawn transforms that step will change. */
 capture(game:Game){
  this.count=0;
  // No arrays built here: this runs before every fixed step.
  const add=(unit:Game['player']|undefined)=>{if(unit&&!unit.dead&&unit.visual.root.parent)this.push(unit.visual.root,unit.visual.hull,unit.visual.turret);};
  add(game.player);for(const unit of game.enemies)add(unit);for(const ally of game.allies.tanks)add(ally.unit);
  // The shield bubble and aim-warning beams are placed from their unit's logic position each step: blend them alike.
  const shield=game.world.shield;if(shield.visible&&shield.parent)this.push(shield,null,null);
  for(const unit of game.enemies){const beam=unit.visual.beam;if(!unit.dead&&beam.visible&&beam.parent)this.push(beam,null,null);}
  if(game.convoy?.parent)this.push(game.convoy,null,null);
  for(const shot of game.shots)if(shot.mesh.parent)this.push(shot.mesh,null,null);
  this.objects.length=this.hulls.length=this.turrets.length=this.count;
 }
 /** Just before rendering, with alpha in 0..1 (the unspent share of the next step). */
 apply(alpha:number){
  this.applied=0;if(!(alpha>=0&&alpha<1))return;
  for(let i=0;i<this.count;i++){
   const object=this.objects[i];if(!object.parent)continue;
   const o=i*5,p=object.position,hull=this.hulls[i],turret=this.turrets[i],yawNode=hull??object;
   this.curr[o]=p.x;this.curr[o+1]=p.y;this.curr[o+2]=p.z;this.curr[o+3]=yawNode.rotation.y;this.curr[o+4]=turret?.rotation.y??0;
   // A respawn, an airlift drop or a new stage is a jump, not motion: draw it where it is.
   if(Math.hypot(p.x-this.prev[o],p.z-this.prev[o+2])>3)continue;
   p.set(this.prev[o]+(p.x-this.prev[o])*alpha,this.prev[o+1]+(p.y-this.prev[o+1])*alpha,this.prev[o+2]+(p.z-this.prev[o+2])*alpha);
   yawNode.rotation.y=blend(this.prev[o+3],this.curr[o+3],alpha);
   if(turret)turret.rotation.y=blend(this.prev[o+4],this.curr[o+4],alpha);
   this.applied=i+1;
  }
 }
 /** Right after rendering: the exact logic transforms again. */
 restore(){
  for(let i=0;i<this.applied;i++){
   const object=this.objects[i];if(!object.parent)continue;
   const o=i*5,hull=this.hulls[i],turret=this.turrets[i];
   object.position.set(this.curr[o],this.curr[o+1],this.curr[o+2]);(hull??object).rotation.y=this.curr[o+3];if(turret)turret.rotation.y=this.curr[o+4];
  }
  this.applied=0;
 }
}
/** Shortest-arc blend of two angles. */
const blend=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
