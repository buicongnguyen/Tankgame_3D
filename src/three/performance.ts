import * as T from 'three';
import type {Game} from './game';
import {coarsePointer} from './media';

/** Pixel ratios per detail tier. `base` is the fixed ratio used outside battle (and always on desktop);
 *  touch screens may move between `lo` and `hi` while a battle runs. High starts at its top and only gives
 *  resolution back when frames run late; Low starts at its old small buffer and sharpens only while the
 *  device keeps up. */
export function ratioRange(low:boolean){
 const dpr=devicePixelRatio,long=Math.max(innerWidth,innerHeight);
 if(low){const base=Math.min(dpr,.8,960/long);return {base,lo:base,hi:Math.max(base,Math.min(dpr,1.2,1440/long))};}
 const base=Math.min(dpr,1.6);return {base,lo:Math.min(base,1),hi:base};
}

const BATTLE=['playing','paused','finishing'];
/** Slower than this (under 25 FPS) at the lowest resolution, High detail offers Low detail. A browser that
 *  caps animation frames at 30 Hz (power saving) stays under it, since Low would be capped the same way. */
const HINT_MS=40;
const SHADOWS=256;
/** Shadow map sizes: the tier's own, and the step a late phone takes at its lowest resolution. */
const SHADOW_MAP=2048,SHADOW_MAP_LATE=1024;

/** Soft drop shadows under units in Low detail, which renders without shadow maps: an ellipse along each
 *  vehicle's heading, nudged away from the sun so it shows past the hull from the high camera. One draw. */
class ContactShadows{
 private mesh?:T.InstancedMesh;private readonly matrix=new T.Matrix4();private readonly spot=new T.Vector3();private readonly size=new T.Vector3();
 private readonly flat=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0));private readonly turn=new T.Quaternion();private readonly up=new T.Vector3(0,1,0);
 private create(scene:T.Scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,fade=ctx.createRadialGradient(32,32,4,32,32,32);
  fade.addColorStop(0,'rgba(0,0,0,0.62)');fade.addColorStop(.55,'rgba(0,0,0,0.34)');fade.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=fade;ctx.fillRect(0,0,64,64);
  const material=new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  this.mesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),material,SHADOWS);this.mesh.name='ContactShadows';this.mesh.frustumCulled=false;this.mesh.renderOrder=1;this.mesh.count=0;scene.add(this.mesh);
 }
 update(game:Game){
  const world=game.world;
  if(!world.low||!BATTLE.includes(game.phase)||!game.player){if(this.mesh)this.mesh.visible=false;return;}
  if(!this.mesh)this.create(world.scene);
  const mesh=this.mesh!;let count=0;
  const sun=world.sun.position.clone().sub(world.sun.target.position).setY(0).normalize();
  const add=(x:number,z:number,radius:number,heading:number,long:number)=>{if(count>=SHADOWS)return;
   this.spot.set(x-sun.x*radius*.45,.05,z-sun.z*radius*.45);this.size.set(radius*2.7,radius*2.7*long,1);
   this.turn.setFromAxisAngle(this.up,heading).multiply(this.flat);this.matrix.compose(this.spot,this.turn,this.size);mesh.setMatrixAt(count++,this.matrix);};
  for(const unit of [game.player,...game.enemies,...game.allies.tanks.map(a=>a.unit)]){
   if(!unit||unit.dead||unit.pending||!unit.visual.root.visible||game.airborne(unit))continue;
   // Vehicles are longer than wide and face their heading (the hull turns, not the root); soldiers get a round shadow.
   const p=unit.visual.root.position;add(p.x,p.z,game.unitRadius(unit),unit.heading,game.isInfantry(unit)?1:1.45);
  }
  if(game.convoy?.visible)add(game.convoy.position.x,game.convoy.position.z,2.3,game.convoy.rotation.y,1.45);
  mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;
 }
}

/** Frame budget for phones and tablets: a `?perf` readout, a render resolution that follows the frame rate
 *  during battle, a one-time Low detail hint when High cannot keep up, and Low detail contact shadows. */
export class FrameBudget{
 /** The Low detail hint; `?e2e` runs keep it off unless a test turns it on. */
 hints=!/[?&]e2e\b/.test(location.search);
 readonly shadows=new ContactShadows();
 private last=0;private raf=1000/60;private rendered=0;private interval=1000/60;
 private logicStart=0;private renderStart=0;private logicMs=0;private renderMs=0;
 private over=0;private under=0;private changed=0;private slow=0;private ceiling=Infinity;private tier:boolean|null=null;private hinted=false;
 /** The shadow step is a trial too: kept only if frames get at least 10% faster within three seconds. */
 private shadowCut=false;private shadowTrial:{interval:number;at:number}|null=null;private shadowFutile=false;
 /** A resolution drop on trial: kept only if frames get at least 10% faster within three seconds. */
 private trial:{from:number;interval:number;at:number}|null=null;private futile=false;
 private note?:HTMLElement;private readout?:HTMLElement;private shown=0;

 /** Every animation frame; `due` says whether this one renders. */
 frame(game:Game,now:number,due:boolean){
  const gap=this.last?now-this.last:1000/60;this.last=now;if(gap<250)this.raf=this.raf*.9+gap*.1;
  if(!due)return;
  const interval=this.rendered?now-this.rendered:0;this.rendered=now;
  if(interval>0&&interval<500)this.interval=this.interval*.85+interval*.15;
  this.logicStart=performance.now();
  this.adapt(game,now,interval>0&&interval<500?interval:0);
 }
 beforeRender(game:Game){const now=performance.now();this.logicMs=this.logicMs*.9+(now-this.logicStart)*.1;this.shadows.update(game);this.renderStart=performance.now();}
 afterRender(game:Game){const now=performance.now();this.renderMs=this.renderMs*.9+(now-this.renderStart)*.1;this.show(game,now);}

 private setRatio(game:Game,ratio:number|null,now:number){game.world.renderRatio=ratio;game.world.resize();this.changed=now;this.over=this.under=0;}
 /** Back to the tier's own ratio with a clean slate (a new battle, a detail change, or leaving touch mode). */
 private settle(game:Game,now:number){if(game.world.renderRatio!==null)this.setRatio(game,null,now);if(this.shadowCut){this.shadowCut=false;game.world.shadowDetail(SHADOW_MAP);}this.shadowTrial=null;this.shadowFutile=false;this.over=this.under=this.slow=0;this.ceiling=Infinity;this.trial=null;this.futile=false;}
 private adapt(game:Game,now:number,interval:number){
  const world=game.world;
  if(world.low!==this.tier){this.tier=world.low;this.settle(game,now);}
  if(!BATTLE.includes(game.phase)||!coarsePointer()){this.closeNote();this.settle(game,now);return;}
  if(game.phase!=='playing'){this.over=this.under=0;return;}
  const budget=1000/(world.low?30:60),range=ratioRange(world.low),current=world.renderRatio??range.base;
  if(this.interval>budget*1.25){this.over+=interval;this.under=0;}
  else if(this.interval<budget*1.1&&this.raf<1000/60*1.2){this.under+=interval;this.over=0;}
  else{this.over=Math.max(0,this.over-interval);this.under=Math.max(0,this.under-interval);}
  // A drop that does not speed frames up is undone, and this battle stops trading resolution:
  // the limit is elsewhere (a 30 Hz power-saving cap, the CPU), so sharpness would be lost for nothing.
  if(this.trial&&now-this.trial.at>3000){const trial=this.trial;this.trial=null;if(this.interval>trial.interval*.9){this.futile=true;this.setRatio(game,trial.from,now);return;}}
  if(!this.trial&&!this.futile&&this.over>1500&&now-this.changed>1500&&current>range.lo+.01){
   this.trial={from:current,interval:this.interval,at:now};this.ceiling=current;this.setRatio(game,Math.max(range.lo,current*.85),now);
  }
  else if(!this.trial&&this.under>5000&&now-this.changed>5000&&current<range.hi-.01&&current*1.1<this.ceiling-.01)this.setRatio(game,Math.min(range.hi,current*1.1),now);
  // Resolution first, then shadows: High still late at its lowest useful resolution draws a quarter of the
  // shadow texels for the rest of this battle (the next battle starts sharp again).
  // Never after a futile resolution trial: the limit is then a frame cap or the CPU, which fewer texels do not lift.
  if(this.shadowTrial&&now-this.shadowTrial.at>3000){const trial=this.shadowTrial;this.shadowTrial=null;if(this.interval>trial.interval*.9){this.shadowFutile=true;this.shadowCut=false;world.shadowDetail(SHADOW_MAP);}}
  if(!world.low&&!this.shadowCut&&!this.shadowFutile&&!this.trial&&!this.futile&&current<=range.lo+.01&&this.over>3000){this.shadowCut=true;this.shadowTrial={interval:this.interval,at:now};world.shadowDetail(SHADOW_MAP_LATE);this.over=0;}
  // High that stays under 25 FPS at its lowest useful resolution: offer Low detail, once.
  if(!world.low&&(current<=range.lo+.01||this.futile)&&this.interval>HINT_MS){this.slow+=interval;if(this.slow>6000&&!this.hinted&&this.hints&&!this.shadowTrial){this.hinted=true;this.hint(game);}}
  else this.slow=0;
 }
 /** A new battle (deploy, retry, restart from pause): the tier's own resolution and shadows again, a clean slate. */
 newBattle(game:Game){this.closeNote();this.settle(game,performance.now());}
 private closeNote(){this.note?.remove();this.note=undefined;}
 private hint(game:Game){
  const note=document.createElement('section');note.className='perf-hint';note.setAttribute('aria-label','Performance tip');
  note.innerHTML='<p role="status">Running slowly on this device. Low detail plays smoother.</p><div><button type="button" data-choice="low">LOW DETAIL</button><button type="button" data-choice="keep" aria-label="Keep high detail">KEEP</button></div>';
  const timer=setTimeout(()=>{if(this.note===note)this.closeNote();},20000);
  note.addEventListener('click',event=>{const choice=(event.target as Element).closest<HTMLElement>('[data-choice]')?.dataset.choice;if(!choice)return;clearTimeout(timer);this.closeNote();
   // Detail changes while paused, so the stage and tank stay as they are; Resume continues in Low detail.
   if(choice==='low'&&!game.world.low&&(game.phase==='playing'||game.phase==='paused')){if(game.phase==='playing')game.pause();void game.changeQuality();}});
  this.note=note;document.body.append(note);
 }
 private show(game:Game,now:number){
  if(!this.readout){if(!/[?&]perf\b/.test(location.search))return;this.readout=document.createElement('pre');this.readout.className='perf-readout';this.readout.setAttribute('aria-hidden','true');document.body.append(this.readout);}
  if(now-this.shown<500)return;this.shown=now;
  const r=game.world.renderer,size=r.getDrawingBufferSize(new T.Vector2());
  this.readout.textContent=`${Math.round(1000/this.interval)} fps  ${this.interval.toFixed(1)} ms\nlogic ${this.logicMs.toFixed(2)} ms  render ${this.renderMs.toFixed(2)} ms\n${r.info.render.calls} draws  ${Math.round(r.info.render.triangles/1000)}k tris\n${game.world.low?'Low':'High'}  ${r.getPixelRatio().toFixed(2)}x  ${size.x}x${size.y}`;
 }
}
