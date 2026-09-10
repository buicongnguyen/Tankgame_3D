import * as T from 'three';
import { World } from './world';
import type { Cover, TankVisual } from './world';
import { Input } from './input';
import { terrainSpeed } from './environment';
import { BOUNDS } from './activities';
import { MISSIONS, freshSave, parseSave, rewardClear, SAVE_KEY, weaponCount, weaponNames } from './campaign';
import type { Save, Difficulty } from './campaign';
import { armorMultiplier, clamp, circleBox, distance, purchase, segmentBox, segmentCircle, turnToward, upgradeCost } from './rules';
import type { Point, Upgrade } from './rules';
type Phase='menu'|'playing'|'paused'|'depot'|'failed'|'victory';
interface Unit { visual:TankVisual; hp:number; max:number; heading:number; aim:number; cooldown:number; role:'player'|'raider'|'sentry'|'heavy'|'boss'; dead:boolean; }
interface Shot { mesh:T.Mesh; p:Point; from:Point; dx:number; dz:number; speed:number; damage:number; life:number; friendly:boolean; splash:number; }
interface Pickup { mesh:T.Mesh; life:number; }
export class Game {
  root:HTMLElement; world:World; input:Input; save:Save=freshSave(); phase:Phase='menu'; mission=0;
  player!:Unit; enemies:Unit[]=[]; shots:Shot[]=[]; pickups:Pickup[]=[];
  elapsed=0; capture=0; spawnTimer=0; kills=0; shotsFired=0; lastReward=0;
  weapon=0; reload=0; shieldTime=0; shieldCooldown=0; repairs=1; relayHealth=300; convoyHealth=260; convoy:T.Group|null=null;convoyBlocked=false;
  overlay:HTMLElement; hud:HTMLElement; radio:HTMLElement; mini:HTMLCanvasElement;
  radioTimer=0; hudTimer=0; last=0; accumulator=0; hurtTimer=0;
  ray=new T.Raycaster(); plane=new T.Plane(new T.Vector3(0,1,0),0); aimPoint=new T.Vector3(0,0,-15);
  audio:AudioContext|null=null; saveWarning=false;
  fieldWeaponCount=1;artilleryCooldown=0;powerBoost=0;trailClock=0;dustClock=0;
  strikes:{x:number;z:number;time:number;marker:T.Mesh}[]=[];
  projectileGeometry=new T.CylinderGeometry(.10,.16,1.6,8).rotateX(Math.PI/2);
  trailGeometry=new T.ConeGeometry(.22,2.8,8).rotateX(-Math.PI/2);
  trailMaterial=new T.MeshBasicMaterial({color:0xffa147,transparent:true,opacity:.4,blending:T.AdditiveBlending,depthWrite:false});
  projectileMaterials=[new T.MeshBasicMaterial({color:0xffe7a2}),new T.MeshBasicMaterial({color:0xff7552})];
  constructor(root:HTMLElement){
    this.root=root;
    try{this.save=parseSave(localStorage.getItem(SAVE_KEY));}catch{this.saveWarning=true;}
    root.innerHTML=`<div id="battlefield"></div><div class="vignette"></div><div id="hud" hidden>
      <div class="mission-hud"><span class="eyebrow" id="mission-number"></span><h2 id="mission-name"></h2><p id="objective"></p><div class="objective-track"><i id="objective-fill"></i></div></div>
      <div class="top-actions"><button id="pause" aria-label="Pause game">Ⅱ <span>PAUSE</span></button><canvas id="minimap" width="176" height="132" aria-label="Tactical map"></canvas></div>
      <div class="bottom-hud"><div class="hull-block"><div><span>HULL</span><strong id="health-label"></strong></div><div class="hull-track"><i id="health-fill"></i></div><small id="status-line">ARMOR ONLINE</small></div>
      <button class="weapon-block" id="weapon"><span id="weapon-label"></span><strong id="reload-label"></strong><div class="reload-track"><i id="reload-fill"></i></div><small>1 / 2 / 3 · SWITCH</small></button>
      <div class="abilities"><button id="artillery"><kbd>R</kbd><span id="artillery-label">STRIKE</span></button><button id="shield"><kbd>Q</kbd><span id="shield-label">SHIELD</span></button><button id="repair"><kbd>E</kbd><span id="repair-label">REPAIR ×1</span></button></div></div>
      <div class="touch-pad move-pad" id="move-pad" aria-label="Drive joystick"><span class="stick-nub"></span><small>DRIVE</small></div><div class="touch-pad aim-pad" id="aim-pad" aria-label="Aim and fire joystick"><span class="stick-nub"></span><small>AIM / FIRE</small></div>
      <div class="radio" id="radio" role="status"></div><div class="desktop-hint">WASD <span>drive</span> · MOUSE <span>aim</span> · HOLD CLICK <span>fire</span></div>
    </div><div id="overlay"></div><div class="loading" id="loading"><span class="eyebrow">KESTREL // CONNECTING</span><h1>Establishing uplink<span class="blink">_</span></h1><p>Loading the valley and armored units.</p></div>`;
    this.overlay=this.el('overlay');this.hud=this.el('hud');this.radio=this.el('radio');this.mini=this.el('minimap') as HTMLCanvasElement;
    this.world=new World(this.el('battlefield'));this.input=new Input(this.world.renderer.domElement);
    this.input.onPause=()=>{if(this.phase==='playing')this.pause();else if(this.phase==='paused'&&!document.hidden&&document.hasFocus())this.resume();};
    this.input.onBackground=()=>{if(this.phase==='playing')this.pause();};
    this.input.onAction=a=>this.action(a);
    this.bindActions(this.hud,button=>{if(button.id==='pause')this.pause();else this.action(button.id==='weapon'?'switch':button.id);});
    this.input.bindStick(this.el('move-pad'),'move');this.input.bindStick(this.el('aim-pad'),'aim');
    this.bindActions(this.overlay,button=>this.menuAction(button.dataset.action!,button.dataset.value),'button[data-action]');
    this.world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.phase==='playing')this.pause();this.overlay.innerHTML='<section class="panel"><h1>Graphics connection lost</h1><p>Your mission checkpoint is saved. Reload to reconnect.</p><button onclick="location.reload()">Reload game</button></section>';});
  }
  private bindActions(root:HTMLElement,run:(button:HTMLButtonElement)=>void,selector='button'){
    const presses=new Map<number,{button:HTMLButtonElement;x:number;y:number}>();let lastTouch=-Infinity;
    const buttonAt=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLButtonElement>(selector):null;
    root.addEventListener('pointerdown',e=>{const button=buttonAt(e.target);if(e.pointerType==='touch'&&button&&!button.disabled){presses.set(e.pointerId,{button,x:e.clientX,y:e.clientY});button.setPointerCapture(e.pointerId);}});
    root.addEventListener('pointercancel',e=>presses.delete(e.pointerId));
    root.addEventListener('pointerup',e=>{
      const press=presses.get(e.pointerId);presses.delete(e.pointerId);if(!press||press.button.disabled||!root.contains(press.button))return;
      const r=press.button.getBoundingClientRect();if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>12||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
      lastTouch=performance.now();e.preventDefault();run(press.button);
    });
    root.addEventListener('click',e=>{const button=buttonAt(e.target);if(!button||button.disabled||(e.detail!==0&&performance.now()-lastTouch<700))return;run(button);});
  }
  el(id:string){return document.getElementById(id)!;}
  async init(){
    await this.world.load();this.world.settings(this.save.low);this.prepare(this.save.mission);this.showMenu();this.el('loading').remove();
    this.last=performance.now();requestAnimationFrame(t=>this.frame(t));
    if(import.meta.env.DEV && new URLSearchParams(location.search).has('e2e'))(window as unknown as {__steel:Game}).__steel=this;
  }
  persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.save));}catch{this.saveWarning=true;}}
  setPhase(phase:Phase){this.phase=phase;document.body.dataset.phase=phase;this.hud.hidden=!['playing','paused'].includes(phase);this.input.active=phase==='playing';this.input.reset();this.overlay.hidden=phase==='playing';if(phase!=='playing')this.world.cursor.visible=false;}
  focusPrimary(){requestAnimationFrame(()=>this.overlay.querySelector<HTMLButtonElement>('.primary')?.focus({preventScroll:true}));}
  route(){const frontier=this.save.cleared.indexOf(false);return MISSIONS.map((m,i)=>`<button class="route-item ${i===this.mission?'selected':''}" data-action="mission" data-value="${i}" ${frontier>=0&&i>frontier?'disabled':''}><span class="route-index">${this.save.cleared[i]?'✓':String(i+1).padStart(2,'0')}</span><span><small>${m.kind.toUpperCase()}</small><strong>${m.name}</strong></span><span class="route-state">${frontier>=0&&i>frontier?'LOCKED':i===this.mission?'◂':'↗'}</span></button>`).join('');}
  settings(){return `<div class="settings"><button data-action="sound">SOUND <b>${this.save.sound?'ON':'OFF'}</b></button><button data-action="quality">GRAPHICS <b>${this.save.low?'LOW':'HIGH'}</b></button><a href="./legacy.html">Original 2D ↗</a></div>`;}
  controls(){return '<div class="control-guide"><span><kbd>W A S D</kbd> Drive</span><span><kbd>MOUSE</kbd> Aim + hold click to fire</span><span><kbd>1 2 3</kbd> Weapon</span><span><kbd>Q</kbd> Shield</span><span><kbd>E</kbd> Repair</span><span><kbd>R</kbd> Artillery</span><span><kbd>ESC</kbd> Pause</span><p class="touch-guide">On touch: left stick drives; right stick aims and fires. Tap weapon, strike, shield or repair.</p></div>';}
  showMenu(){
    this.setPhase('menu');this.world.target.copy(this.player.visual.root.position);const m=MISSIONS[this.mission];
    this.overlay.innerHTML=`<main class="command-screen"><header class="brand"><span class="brand-mark">◈</span><span>KESTREL DIVISION<small>MERIDIAN RECOVERY COMMAND</small></span><span class="build-label">3D CAMPAIGN / 01</span></header><section class="hero"><span class="eyebrow">MERIDIAN CAMPAIGN</span><h1>STEEL<br><em>FRONT</em><span>LAST SIGNAL</span></h1></section><aside class="briefing panel"><div class="panel-top"><span class="eyebrow">OPERATION ${String(this.mission+1).padStart(2,'0')} / ${MISSIONS.length}</span></div><h2>${m.name}</h2><div class="mission-task"><span>OBJECTIVE</span><strong>${m.objective}</strong></div><div class="difficulty" aria-label="Difficulty">${(['story','standard','veteran'] as Difficulty[]).map(d=>`<button data-action="difficulty" data-value="${d}" aria-pressed="${this.save.difficulty===d}" class="${this.save.difficulty===d?'active':''}">${d}</button>`).join('')}</div><button class="primary deploy" data-action="deploy">DEPLOY <span>→</span></button><details><summary>Briefing & controls</summary><p class="briefing-copy">${m.briefing}</p>${this.controls()}<p class="manual">Front armor absorbs damage. Flank for stronger hits. Red lines warn of incoming fire. Amber marks the objective. Red drums explode. Green pads repair. Blue caches give rockets and supplies. R calls artillery at your aim point.</p></details></aside><section class="campaign-route"><div class="route-heading"><span class="eyebrow">THE ROAD HOME</span><span>${this.save.cleared.filter(Boolean).length} / ${MISSIONS.length} COMPLETE</span></div><div class="route-list">${this.route()}</div></section><footer>${this.settings()}<button class="quiet" data-action="reset-prompt">Reset campaign</button></footer>${this.saveWarning?'<p class="storage-warning">Browser storage is unavailable. Progress will last only for this session.</p>':''}</main>`;
    this.focusPrimary();
  }
  pause(){if(this.phase!=='playing')return;this.setPhase('paused');this.renderPause();}
  renderPause(){this.overlay.innerHTML=`<section class="panel pause-panel"><span class="eyebrow">UPLINK ON HOLD</span><h1>Take a breath.</h1><p>Ready when you are.</p><button class="primary" data-action="resume">RESUME OPERATION →</button><button data-action="retry">Restart this operation</button><button data-action="menu">Return to command</button><details><summary>Controls</summary>${this.controls()}</details>${this.settings()}</section>`;this.focusPrimary();}
  resume(){if(this.phase!=='paused')return;this.setPhase('playing');this.overlay.innerHTML='';this.last=performance.now();this.accumulator=0;}
  menuAction(action:string,value?:string){
    if(action==='deploy')this.start(this.mission);
    if(action==='resume')this.resume();
    if(action==='retry')this.start(this.mission);
    if(action==='menu'){this.prepare(this.save.mission);this.showMenu();}
    if(action==='mission'){const i=Number(value),frontier=this.save.cleared.indexOf(false);if(Number.isInteger(i)&&i>=0&&i<MISSIONS.length&&(frontier<0||i<=frontier)){this.prepare(i);this.showMenu();}}
    if(action==='next'){this.prepare(this.save.mission);this.showMenu();}
    if(action==='difficulty'){this.save.difficulty=value as Difficulty;this.persist();this.showMenu();}
    if(action==='sound'){this.save.sound=!this.save.sound;this.persist();if(this.save.sound)this.tone(440,.08,.05);if(this.phase==='paused')this.renderPause();else this.showMenu();}
    if(action==='quality'){this.save.low=!this.save.low;this.world.settings(this.save.low);this.persist();if(this.phase==='paused')this.renderPause();else this.showMenu();}
    if(action==='buy'&&this.phase==='depot')this.buy(value as Upgrade);
    if(action==='reset-prompt'){this.overlay.innerHTML='<section class="panel pause-panel"><span class="eyebrow">NEW CAMPAIGN</span><h1>Start a new road?</h1><p>This clears unlocked operations, credits and upgrades saved in this browser.</p><button class="primary" data-action="menu">KEEP MY CAMPAIGN</button><button data-action="reset">Reset and start over</button></section>';this.focusPrimary();}
    if(action==='reset'){const {sound,low}=this.save;this.save={...freshSave(),sound,low};this.persist();this.prepare(0);this.showMenu();}
  }
  makeUnit(x:number,z:number,role:Unit['role']):Unit{
    const boss=role==='boss',player=role==='player';
    const radius=boss?2:1.25;
    const free=(px:number,pz:number)=>Math.abs(px)<BOUNDS.x-radius&&Math.abs(pz)<BOUNDS.z-radius&&!this.world.covers.some(c=>c.hp>0&&circleBox({x:px,z:pz},radius,c))&&!this.enemies.some(e=>!e.dead&&distance({x:px,z:pz},e.visual.root.position)<radius+2);
    if(!free(x,z)){const origin={x,z};search:for(let r=3;r<=30;r+=3)for(let a=0;a<16;a++){const px=origin.x+Math.cos(a*Math.PI/8)*r,pz=origin.z+Math.sin(a*Math.PI/8)*r;if(free(px,pz)){x=px;z=pz;break search;}}}
    const visual=this.world.tank(!player,boss);visual.root.position.set(x,0,z);
    const difficulty=this.save.difficulty==='story'?1.4:this.save.difficulty==='veteran'?.8:1;
    const hp=player?(240+this.save.upgrades.armor*65)*difficulty:boss?650:role==='heavy'?160:role==='sentry'?90:65;
    return {visual,hp,max:hp,heading:player?Math.PI:0,aim:player?Math.PI:0,cooldown:2+(this.enemies.length%3)*.8,role,dead:false};
  }
  prepare(index:number){
    this.fieldWeaponCount=1;this.artilleryCooldown=0;this.powerBoost=0;this.strikes=[];this.mission=index;this.world.build(index,MISSIONS[index].kind);this.shots=[];this.pickups=[];this.enemies=[];this.convoy=null;this.convoyBlocked=false;
    this.elapsed=0;this.capture=0;this.spawnTimer=0;this.kills=0;this.shotsFired=0;this.reload=0;this.weapon=0;this.shieldTime=0;this.shieldCooldown=0;this.repairs=1;this.relayHealth=300;this.convoyHealth=260;
    this.player=this.makeUnit(-4,22,'player');this.player.visual.hull.rotation.y=Math.PI;this.player.visual.turret.rotation.y=Math.PI;
    const points=[[-17,-17],[17,-21],[25,0],[-28,0],[8,-25],[-6,-23]];
    for(let i=0;i<MISSIONS[index].count;i++){const p=points[i];this.enemies.push(this.makeUnit(p[0]*(index>=4?1.7:1),p[1]*(index>=4?1.8:1),index===5&&i===0?'boss':index>=4&&i%2===0?'heavy':i%3===1?'sentry':'raider'));}
    if(MISSIONS[index].kind==='escort'){this.convoy=this.world.clone('transport');this.convoy.position.set(0,0,48);this.player.visual.root.position.set(-4,0,48);this.convoy.rotation.y=Math.PI;this.world.entities.add(this.convoy);}
    this.world.shield.visible=false;this.world.cursor.visible=false;
    this.syncVisual(this.player);this.enemies.forEach(e=>this.syncVisual(e));this.updateHud();
  }
  start(index:number){this.prepare(index);this.setPhase('playing');this.world.target.copy(this.player.visual.root.position);this.world.target.z+=this.world.camera.aspect<1?8:-8;this.world.update(0,this.player.visual.root.position);this.updateHud();this.overlay.innerHTML='';this.radioMessage(MISSIONS[index].radio,9);this.last=performance.now();this.accumulator=0;this.tone(360,.12,.05);}
  action(action:string){
    if(this.phase!=='playing')return;
    if(action==='artillery'&&this.artilleryCooldown<=0)this.callArtillery();
    if(action==='shield'&&this.shieldCooldown<=0){this.shieldTime=3;this.shieldCooldown=14;this.radioMessage('KESTREL / Protective field active. Three seconds of cover.',3);this.tone(620,.2,.04);}
    if(action==='repair'&&this.repairs>0&&this.player.hp<this.player.max){this.repairs--;this.player.hp=Math.min(this.player.max,this.player.hp+110);this.world.burst(this.player.visual.root.position,3);this.tone(720,.15,.05);}
    if(action==='switch')this.weapon=(this.weapon+1)%Math.max(this.fieldWeaponCount,weaponCount(this.save));
    if(['1','2','3'].includes(action)){const w=Number(action)-1;if(w<Math.max(this.fieldWeaponCount,weaponCount(this.save)))this.weapon=w;else this.radioMessage(`ARMORY / ${w===1?'Autocannon unlocks after First Light.':'Rockets unlock after Homeward.'}`,3);}
    this.updateHud();
  }
  weaponStats(){return [{damage:44,speed:48,reload:.85,splash:0},{damage:13,speed:58,reload:.19,splash:0},{damage:70,speed:30,reload:1.6,splash:4.5}][this.weapon];}
  reloadDuration(){return this.weaponStats().reload*(1-this.save.upgrades.reload*.13);}
  moveUnit(unit:Unit,dx:number,dz:number){
    const p=unit.visual.root.position,r=unit.role==='boss'?2:1.25;
    const traction=terrainSpeed(this.world.environment.biome,p.x,p.z);dx*=traction;dz*=traction;
    const blocked=(x:number,z:number)=>this.world.covers.some(c=>c.hp>0&&circleBox({x,z},r,c))||[this.player,...this.enemies].some(other=>other!==unit&&!other.dead&&distance({x,z},other.visual.root.position)<(other.role==='boss'?2:1.25)+r)||!!(this.convoy&&distance({x,z},this.convoy.position)<2.3);
    const x=clamp(p.x+dx,-BOUNDS.x,BOUNDS.x);if(!blocked(x,p.z))p.x=x;
    const z=clamp(p.z+dz,-BOUNDS.z,BOUNDS.z);if(!blocked(p.x,z))p.z=z;
  }
  syncVisual(unit:Unit){
    unit.visual.hull.rotation.y=unit.heading;unit.visual.turret.rotation.y=unit.aim;
    unit.visual.bar.scale.x=Math.max(.001,unit.hp/unit.max);unit.visual.bar.visible=!unit.dead;
    unit.visual.root.visible=!unit.dead;
  }
  shoot(unit:Unit,friendly:boolean){
    const stats=friendly?this.weaponStats():{damage:unit.role==='boss'?33:unit.role==='heavy'?24:15,speed:unit.role==='boss'?32:25,splash:0};
    const direction=new T.Vector3(Math.sin(unit.aim),0,Math.cos(unit.aim));
    const mesh=new T.Mesh(this.projectileGeometry,this.projectileMaterials[friendly?0:1]);
    mesh.rotation.y=unit.aim;const trail=new T.Mesh(this.trailGeometry,this.trailMaterial);trail.position.z=-1.6;mesh.add(trail);
    if(friendly&&this.weapon===2){mesh.scale.set(1.7,1.7,1.1);mesh.userData.rocket=true;}else if(friendly&&this.weapon===1)mesh.scale.set(.65,.65,1.4);
    unit.visual.root.updateMatrixWorld(true);unit.visual.muzzle.getWorldPosition(mesh.position);
    this.world.entities.add(mesh);
    const p=unit.visual.root.position;
    this.shots.push({mesh,p:{x:p.x,z:p.z},from:{x:p.x,z:p.z},dx:direction.x,dz:direction.z,speed:stats.speed,damage:stats.damage*(friendly?1+this.save.upgrades.power*.2+(this.powerBoost>0?.35:0):this.save.difficulty==='story'?.65:this.save.difficulty==='veteran'?1.2:1),life:2.5,friendly,splash:stats.splash});
    if(friendly){this.shotsFired++;this.reload=this.reloadDuration();this.tone(this.weapon===1?110:65,.1,.05);}
    unit.visual.turret.position.y=1.10;
    this.world.fx.muzzle(mesh.position,unit.aim,friendly&&this.weapon===2);
  }
  updatePlayer(dt:number){
    const movement=this.input.movement(),length=Math.hypot(movement.x,movement.z);
    if(length>.06){const dx=movement.x/Math.max(1,length),dz=movement.z/Math.max(1,length);this.moveUnit(this.player,dx*9*dt,dz*9*dt);this.player.heading=turnToward(this.player.heading,Math.atan2(dx,dz),dt*4.5);}
    const p=this.player.visual.root.position;
    if(this.input.touchAiming||this.input.hasTouchAim)this.aimPoint.set(p.x+this.input.aim.x*18,0,p.z+this.input.aim.z*18);
    else if(this.input.hasMouse){this.ray.setFromCamera(this.input.mouse,this.world.camera);this.ray.ray.intersectPlane(this.plane,this.aimPoint);}
    else this.aimPoint.set(p.x,0,p.z-15);
    this.player.aim=turnToward(this.player.aim,Math.atan2(this.aimPoint.x-p.x,this.aimPoint.z-p.z),dt*9);
    this.world.cursor.visible=true;this.world.cursor.position.set(this.aimPoint.x,.07,this.aimPoint.z);
    this.reload=Math.max(0,this.reload-dt);this.shieldTime=Math.max(0,this.shieldTime-dt);this.shieldCooldown=Math.max(0,this.shieldCooldown-dt);
    this.world.shield.visible=this.shieldTime>0;this.world.shield.position.copy(p).y=1;
    if((this.input.firing||this.input.touchFiring||this.input.keys.has('Space'))&&this.reload<=0){this.syncVisual(this.player);this.shoot(this.player,true);}
  }
  updateEnemies(dt:number){
    const m=MISSIONS[this.mission],playerPos=this.player.visual.root.position;
    for(let i=0;i<this.enemies.length;i++){
      const e=this.enemies[i];if(e.dead)continue;
      const p=e.visual.root.position;
      let target:Point=playerPos;
      if(m.kind==='defense'&&distance(p,{x:0,z:-13})<distance(p,playerPos)+5)target={x:0,z:-13};
      if(this.convoy&&distance(p,this.convoy.position)<distance(p,playerPos)+3)target=this.convoy.position;
      const dist=distance(p,target),desired=Math.atan2(target.x-p.x,target.z-p.z);
      e.aim=turnToward(e.aim,desired,dt*(e.role==='boss'?1.1:2));
      const obstruction=this.world.covers.some(c=>c.hp>0&&segmentBox(p,target,c)!==null);
      if(e.role!=='sentry'||dist>26||obstruction){
        const advance=dist>17||obstruction?1:dist<10?-.55:0;
        const side=e.role==='raider'?.5:obstruction?.7:0;
        const direction=desired+Math.sin(this.elapsed*.8+i)*.2;
        const speed=e.role==='boss'?2.1:e.role==='heavy'?2.9:4;
        const dx=(Math.sin(direction)*advance+Math.cos(direction)*side)*speed*dt,dz=(Math.cos(direction)*advance-Math.sin(direction)*side)*speed*dt;
        this.moveUnit(e,dx,dz);if(Math.abs(dx)+Math.abs(dz)>.001)e.heading=turnToward(e.heading,Math.atan2(dx,dz),dt*2);
      }
      if(dist<38)e.cooldown-=dt;else e.cooldown=Math.max(e.cooldown,.85);
      const beam=e.visual.beam;beam.visible=e.cooldown<.85&&dist<38;beam.scale.z=dist;beam.position.set(p.x+Math.sin(e.aim)*dist/2,.12,p.z+Math.cos(e.aim)*dist/2);beam.rotation.y=e.aim;
      this.syncVisual(e);
      if(e.cooldown<=0&&dist<38){this.shoot(e,false);e.cooldown=e.role==='boss'?(e.hp<e.max*.5?1.05:1.9):e.role==='sentry'?2.6:3.1;}
    }
  }
  damageUnit(unit:Unit,damage:number,source:Point){
    if(unit.dead||unit===this.player&&this.shieldTime>0)return;
    const multiplier=armorMultiplier(unit.visual.root.position,unit.heading,source);
    unit.hp-=damage*multiplier;
    const impact=unit.visual.root.position.clone();impact.y=1.4;this.world.fx.impact(impact);
    if(unit===this.player){this.hurtTimer=.2;this.tone(45,.07,.03);}
    if(unit.hp<=0){unit.hp=0;unit.dead=true;unit.visual.beam.visible=false;this.world.destroyTank(unit.visual);this.tone(45,.22,.06);
      if(unit!==this.player){this.kills++;if(this.kills%3===0){const mesh=new T.Mesh(new T.OctahedronGeometry(.65),new T.MeshStandardMaterial({color:0x7bf6c3,emissive:0x20805c,emissiveIntensity:.5}));mesh.userData.owned=true;mesh.position.copy(unit.visual.root.position).y=1;this.world.entities.add(mesh);this.pickups.push({mesh,life:30});}}
      this.syncVisual(unit);
    }
  }
  hitCover(cover:Cover,damage:number){
    if(cover.hp<=0)return;cover.hp-=damage;this.world.burst(cover.mesh.position,2,5);
    if(cover.hp<=0){cover.mesh.visible=false;
      if(cover.kind==='house'){
        const mesh=new T.Mesh(new T.OctahedronGeometry(.65),new T.MeshStandardMaterial({color:0x7bf6c3,emissive:0x20805c,emissiveIntensity:.5}));mesh.userData.owned=true;mesh.position.copy(cover.mesh.position).y=1;this.world.entities.add(mesh);this.pickups.push({mesh,life:60});this.radioMessage('IVO / Medical supplies exposed in the ruins.',3);
      }
      if(['house','stonewall','pine'].includes(cover.kind))this.world.fx.impact(cover.mesh.position.clone().setY(1),true);
if(cover.kind==='barrel'){this.world.fx.impact(cover.mesh.position.clone().setY(1),true);this.explode(cover,5,65);}}
  }
  explode(p:Point,radius:number,damage:number){
    for(const unit of [this.player,...this.enemies])if(!unit.dead&&distance(p,unit.visual.root.position)<radius)this.damageUnit(unit,damage*(1-distance(p,unit.visual.root.position)/radius*.6),p);
    for(const cover of this.world.covers)if(cover.hp>0&&Number.isFinite(cover.hp)&&distance(p,cover)<radius)this.hitCover(cover,damage);
    if(this.convoy&&distance(p,this.convoy.position)<radius)this.convoyHealth-=damage*.5;
  }
  updateShots(dt:number){
    for(let i=this.shots.length-1;i>=0;i--){
      const s=this.shots[i];s.life-=dt;
      const b={x:s.mesh.position.x+s.dx*s.speed*dt,z:s.mesh.position.z+s.dz*s.speed*dt};
      let first=Infinity,hit:(()=>void)|null=null;
      for(const c of this.world.covers){if(c.hp<=0)continue;const t=segmentBox(s.p,b,c,.12);if(t!==null&&t<first){first=t;hit=()=>this.hitCover(c,s.damage);}}
      for(const unit of s.friendly?this.enemies:[this.player]){if(unit.dead)continue;const t=segmentCircle(s.p,b,unit.visual.root.position,unit.role==='boss'?2:1.3);if(t!==null&&t<first){first=t;hit=()=>this.damageUnit(unit,s.damage,s.from);}}
      if(!s.friendly){
        if(this.convoy){const t=segmentCircle(s.p,b,this.convoy.position,1.9);if(t!==null&&t<first){first=t;hit=()=>{this.convoyHealth-=s.damage;this.world.burst(this.convoy!.position,1,5);};}}
        if(MISSIONS[this.mission].kind==='defense'){const t=segmentCircle(s.p,b,{x:0,z:-13},1.4);if(t!==null&&t<first){first=t;hit=()=>{this.relayHealth-=s.damage;};}}
      }
      if(hit){const impact={x:s.p.x+(b.x-s.p.x)*first,z:s.p.z+(b.z-s.p.z)*first};hit();this.world.fx.impact(new T.Vector3(impact.x,1.2,impact.z),s.splash>0);if(s.splash)this.explode(impact,s.splash,s.damage*.55);s.life=0;}
      s.p=b;s.mesh.position.set(b.x,1.4,b.z);if(s.mesh.userData.rocket&&this.trailClock<=0)this.world.fx.smoke(s.mesh.position,.7,0xa39b88);
      if(s.life<=0||Math.abs(b.x)>BOUNDS.x+8||Math.abs(b.z)>BOUNDS.z+8){s.mesh.removeFromParent();this.shots.splice(i,1);}
    }
  }
  callArtillery(){
    const p=this.player.visual.root.position;
    const delta=this.aimPoint.clone().sub(p);delta.y=0;if(delta.length()>34)delta.setLength(34);
    const target=p.clone().add(delta);target.x=clamp(target.x,-BOUNDS.x,BOUNDS.x);target.z=clamp(target.z,-BOUNDS.z,BOUNDS.z);
    this.artilleryCooldown=28;
    for(let i=0;i<3;i++){
      const x=clamp(target.x+(i-1)*3,-BOUNDS.x,BOUNDS.x),z=clamp(target.z+(i%2)*3,-BOUNDS.z,BOUNDS.z);
      const marker=new T.Mesh(new T.RingGeometry(4.6,4.9,48),new T.MeshBasicMaterial({color:0xffb458,side:T.DoubleSide,transparent:true,opacity:.8}));marker.rotation.x=-Math.PI/2;marker.position.set(x,.1,z);marker.userData.owned=true;this.world.entities.add(marker);
      this.strikes.push({x,z,time:1.1+i*.3,marker});
    }
    this.radioMessage('IVO / Strike inbound. Clear the amber circles.',3);
  }
  updateActivities(dt:number){
    if(this.player.dead)return;
    this.artilleryCooldown=Math.max(0,this.artilleryCooldown-dt);this.powerBoost=Math.max(0,this.powerBoost-dt);
    const p=this.player.visual.root.position;
    this.dustClock-=dt;
    if(this.dustClock<=0){
      this.dustClock=this.world.low?.3:.12;
      const movement=this.input.movement();
      if(Math.hypot(movement.x,movement.z)>.2){const dust=p.clone();dust.y=.15;dust.x-=Math.sin(this.player.heading)*1.8;dust.z-=Math.cos(this.player.heading)*1.8;this.world.fx.smoke(dust,.85,0xb5a17c);}
      for(const unit of [this.player,...this.enemies])if(!unit.dead&&unit.hp<unit.max*.35)this.world.fx.smoke(unit.visual.root.position.clone().setY(1.6),.8);
    }
    for(const activity of this.world.activities){
      if(activity.spent)continue;
      const near=distance(p,activity);
      if(activity.kind==='repair'&&!this.player.dead&&near<3&&this.player.hp<this.player.max){
        const heal=Math.min(32*dt,this.player.max-this.player.hp,activity.remaining);this.player.hp+=heal;activity.remaining-=heal;
        if(this.trailClock<=0)this.world.fx.emit(p.clone().setY(1),'flash',0x81ffbf,2,.25);
        if(activity.remaining<=0){activity.spent=true;activity.mesh.visible=false;}
      }
      if(activity.kind==='supply'&&near<2.5){activity.spent=true;activity.mesh.visible=false;this.repairs=Math.min(3,this.repairs+1);this.powerBoost=25;this.fieldWeaponCount=3;this.weapon=2;this.artilleryCooldown=0;this.world.burst(p,3);this.radioMessage('SUPPLY / Rockets, repair kit, strike ready. Damage boost: 25s.',4);}
      if(activity.kind==='mine'&&[this.player,...this.enemies].some(u=>!u.dead&&distance(u.visual.root.position,activity)<1.5)){
        activity.spent=true;activity.mesh.visible=false;this.world.fx.impact(new T.Vector3(activity.x,.4,activity.z),true);this.explode(activity,4.5,85);
      }
    }
    for(let i=this.strikes.length-1;i>=0;i--){
      const strike=this.strikes[i];strike.time-=dt;strike.marker.scale.setScalar(1+Math.sin(this.elapsed*18)*.035);
      if(strike.time<.35&&strike.time>0&&this.trailClock<=0)this.world.fx.emit(new T.Vector3(strike.x,Math.max(1,strike.time*55),strike.z),'flash',0xffd494,1.8,.12,new T.Vector3(0,-40,0));
      if(strike.time<=0){this.world.fx.impact(new T.Vector3(strike.x,.8,strike.z),true);this.explode(strike,7,110);this.tone(38,.3,.08);strike.marker.removeFromParent();strike.marker.geometry.dispose();(strike.marker.material as T.Material).dispose();this.strikes.splice(i,1);}
    }
  }
  objectiveProgress(){const m=MISSIONS[this.mission];if(m.kind==='capture')return this.capture/m.duration;if(m.kind==='defense')return this.elapsed/m.duration;if(m.kind==='escort')return this.convoy?(48-this.convoy.position.z)/98:0;if(m.kind==='boss'){const b=this.enemies.find(e=>e.role==='boss');return b?1-b.hp/b.max:0;}return this.kills/m.count;}
  step(dt:number){
    if(this.phase!=='playing')return;
    this.trailClock-=dt;this.elapsed+=dt;this.updatePlayer(dt);this.updateEnemies(dt);this.updateShots(dt);this.updateActivities(dt);if(this.trailClock<=0)this.trailClock=.06;
    for(const unit of [this.player,...this.enemies])unit.visual.turret.position.y+=(1.17-unit.visual.turret.position.y)*Math.min(1,dt*12);
    this.syncVisual(this.player);
    const m=MISSIONS[this.mission],p=this.player.visual.root.position;
    if(m.kind==='capture'&&distance(p,{x:0,z:-13})<6.7&&!this.enemies.some(e=>!e.dead&&distance(e.visual.root.position,{x:0,z:-13})<6.7))this.capture+=dt;
    this.convoyBlocked=false;
    if(this.convoy&&distance(p,this.convoy.position)<12){
      const next={x:this.convoy.position.x,z:Math.max(-50,this.convoy.position.z-dt*3.4)};
      this.convoyBlocked=[this.player,...this.enemies].some(u=>!u.dead&&distance(next,u.visual.root.position)<2.6&&distance(next,u.visual.root.position)<distance(this.convoy!.position,u.visual.root.position));
      if(!this.convoyBlocked)this.convoy.position.z=next.z;
    }
    if(['capture','defense'].includes(m.kind)){
      this.spawnTimer+=dt;
      if(this.spawnTimer>12&&this.enemies.filter(e=>!e.dead).length<7){this.spawnTimer=0;this.enemies.push(this.makeUnit(this.enemies.length%2?30:-30,-24,'raider'));this.radioMessage('IVO / New hostile signature on the perimeter.',3);}
    }
    for(let i=this.pickups.length-1;i>=0;i--){const pickup=this.pickups[i];pickup.life-=dt;pickup.mesh.rotation.y+=dt;if(distance(p,pickup.mesh.position)<2.4){this.player.hp=Math.min(this.player.max,this.player.hp+45);pickup.life=0;this.tone(800,.12,.03);}if(pickup.life<=0){pickup.mesh.removeFromParent();pickup.mesh.geometry.dispose();(pickup.mesh.material as T.Material).dispose();this.pickups.splice(i,1);}}
    if(this.player.dead||this.player.hp<=0||this.convoyHealth<=0||this.relayHealth<=0){this.fail();return;}
    if(this.objectiveProgress()>=1){this.complete();return;}
    this.hudTimer+=dt;if(this.hudTimer>.1){this.hudTimer=0;this.updateHud();}
    this.radioTimer-=dt;this.radio.classList.toggle('visible',this.radioTimer>0);
  }
  radioMessage(text:string,duration=5){this.radio.textContent=text;this.radioTimer=duration;this.radio.classList.add('visible');}
  updateHud(){
    if(!this.player)return;
    const m=MISSIONS[this.mission];this.el('mission-number').textContent=`OP ${String(this.mission+1).padStart(2,'0')} / ${m.sector}`;this.el('mission-name').textContent=m.name;
    let objective=m.objective;
    if(m.kind==='assault')objective=`${this.kills} / ${m.count} hostiles eliminated`;
    if(m.kind==='capture')objective=`UPLINK ${Math.min(18,Math.floor(this.capture))} / 18s · ${this.enemies.some(e=>!e.dead&&distance(e.visual.root.position,{x:0,z:-13})<6.7)?'CONTESTED':'HOLD THE AMBER RING'}`;
    if(m.kind==='defense')objective=`${Math.max(0,Math.ceil(m.duration-this.elapsed))}s remaining · RELAY ${Math.max(0,Math.ceil(this.relayHealth/3))}%`;
    if(m.kind==='escort')objective=`TRANSPORT ${Math.max(0,Math.ceil(this.convoyHealth/2.6))}% · ${this.convoy&&distance(this.player.visual.root.position,this.convoy.position)<12?(this.convoyBlocked?'CLEAR THE ROAD':'MOVING TO EXTRACTION'):'MOVE CLOSER TO ESCORT'}`;
    if(m.kind==='boss'){const b=this.enemies.find(e=>e.role==='boss');objective=`WARDEN ${Math.max(0,Math.ceil((b?.hp||0)/(b?.max||1)*100))}% · ${b&&b.hp<b.max*.5?'OVERDRIVE — KEEP MOVING':'WATCH THE TARGETING LINE'}`;}
    this.el('objective').textContent=objective;this.radio.style.top=(this.el('mission-name').parentElement!.getBoundingClientRect().bottom+8)+'px';this.el('objective-fill').style.width=`${clamp(this.objectiveProgress()*100,0,100)}%`;
    this.el('health-label').textContent=`${Math.ceil(this.player.hp)} / ${Math.ceil(this.player.max)}`;this.el('health-fill').style.width=`${this.player.hp/this.player.max*100}%`;
    this.el('status-line').textContent=this.shieldTime>0?'PROTECTIVE FIELD ACTIVE':this.player.hp<this.player.max*.3?'HULL CRITICAL — SEEK COVER':terrainSpeed(this.world.environment.biome,this.player.visual.root.position.x,this.player.visual.root.position.z)<1?'ROUGH GROUND · REDUCED SPEED':'FRONT ARMOR ONLINE';
    this.el('weapon-label').textContent=weaponNames[this.weapon];this.el('reload-label').textContent=this.reload>0?`${this.reload.toFixed(1)}s`:'READY';this.el('reload-fill').style.width=`${(1-clamp(this.reload/this.reloadDuration(),0,1))*100}%`;
    this.el('shield-label').textContent=this.shieldCooldown>0?`SHIELD ${Math.ceil(this.shieldCooldown)}s`:'SHIELD';this.el('repair-label').textContent=`REPAIR ×${this.repairs}`;
    (this.el('shield') as HTMLButtonElement).disabled=this.shieldCooldown>0;(this.el('repair') as HTMLButtonElement).disabled=this.repairs===0||this.player.hp>=this.player.max;
    this.el('artillery-label').textContent=this.artilleryCooldown>0?`STRIKE ${Math.ceil(this.artilleryCooldown)}s`:'STRIKE';(this.el('artillery') as HTMLButtonElement).disabled=this.artilleryCooldown>0;
    const ctx=this.mini.getContext('2d')!;ctx.fillStyle='#142328';ctx.fillRect(0,0,176,132);ctx.strokeStyle='#3b5557';ctx.strokeRect(5,5,166,122);
    const map=(point:Point)=>({x:point.x/(BOUNDS.x*2)*166+88,y:point.z/(BOUNDS.z*2)*122+66});
    if(this.world.environment.biome==='river'){const q=map({x:0,z:28});ctx.fillStyle='#398d9f';ctx.fillRect(5,q.y,166,8/120*122);for(const x of [-35,0,35]){const b=map({x,z:26});ctx.fillStyle='#baac82';ctx.fillRect(b.x-5,b.y,10,12/120*122);}}
    for(const c of this.world.covers){if(c.hp<=0)continue;const q=map(c);ctx.fillStyle=c.kind==='pine'?'#51845b':c.kind==='house'?'#ac7858':'#667770';ctx.fillRect(q.x-2,q.y-2,4,4);}
    if(this.world.ring.visible){const q=map(this.world.ring.position);ctx.strokeStyle='#ffbd70';ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.stroke();}
    for(const a of this.world.activities){if(a.spent)continue;const q=map(a);ctx.fillStyle=a.kind==='repair'?'#75ffbd':a.kind==='supply'?'#70d9ff':'#ff7055';ctx.fillRect(q.x-2,q.y-2,4,4);}
    for(const u of [this.player,...this.enemies]){if(u.dead)continue;const q=map(u.visual.root.position);ctx.fillStyle=u===this.player?'#a4ffe0':'#ff7a5d';ctx.beginPath();ctx.arc(q.x,q.y,u===this.player?3:2,0,Math.PI*2);ctx.fill();}
    if(this.convoy){const q=map(this.convoy.position);ctx.fillStyle='#ffcb84';ctx.fillRect(q.x-3,q.y-3,6,6);}
  }
  complete(){if(this.phase!=='playing')return;this.lastReward=rewardClear(this.save,this.mission);this.persist();this.setPhase((this.mission===5||this.mission===MISSIONS.length-1)?'victory':'depot');this.tone(660,.22,.06);if(this.mission===5||this.mission===MISSIONS.length-1)this.showVictory();else this.showDepot();}
  showDepot(){
    const upgradeInfo:Record<Upgrade,[string,string]>={armor:['Reactive armor','+65 base hull per level'],power:['Shaped charges','+20% weapon damage per level'],reload:['Autoloader','−13% base reload per level']};
    this.overlay.innerHTML=`<section class="panel depot-panel"><span class="eyebrow">OPERATION ${String(this.mission+1).padStart(2,'0')} / COMPLETE</span><div class="debrief-title"><h1>A road reclaimed.</h1><span class="credit-total">${this.save.credits}<small>SUPPLY CREDITS</small></span></div><p>${MISSIONS[this.mission].debrief}</p><div class="result-stats"><span><strong>${this.kills}</strong>ELIMINATED</span><span><strong>${Math.ceil(this.elapsed)}s</strong>TIME</span><span><strong>+${this.lastReward}</strong>${this.lastReward?'REWARD':'REPLAY · NO NEW REWARD'}</span></div><div class="depot-heading"><h2>Field workshop</h2><span>HULL RESTORED</span></div><div class="upgrade-grid">${(['armor','power','reload'] as Upgrade[]).map(id=>{const level=this.save.upgrades[id],cost=upgradeCost(level);return `<article class="upgrade-card"><span class="eyebrow">LEVEL ${level} / 3</span><h3>${upgradeInfo[id][0]}</h3><p>${upgradeInfo[id][1]}</p><button data-action="buy" data-value="${id}" ${level>=3||this.save.credits<cost?'disabled':''}>${level>=3?'MAX LEVEL':`UPGRADE · ${cost} CR`}</button></article>`;}).join('')}</div>${this.mission===0?'<p class="unlock">ARMORY UNLOCK / 30 mm autocannon — press 2 in combat.</p>':this.mission===2?'<p class="unlock">ARMORY UNLOCK / Siege rockets — press 3 in combat.</p>':''}<button class="primary" data-action="next">NEXT BRIEFING →</button><button class="quiet" data-action="menu">Return to command</button>${this.saveWarning?'<p>Storage is unavailable; keep this tab open to retain progress.</p>':''}</section>`;this.focusPrimary();
  }
  buy(id:Upgrade){if(!['armor','power','reload'].includes(id))return;const result=purchase(this.save.credits,this.save.upgrades[id]);if(!result)return;this.save.credits=result.credits;this.save.upgrades[id]=result.level;this.persist();this.tone(560,.08,.03);this.showDepot();}
  fail(){this.setPhase('failed');this.overlay.innerHTML=`<section class="panel pause-panel"><span class="eyebrow">OPERATION INTERRUPTED</span><h1>We go again.</h1><p>${this.convoyHealth<=0?'The rescue transport was lost. Stay close and intercept the ambushers.':this.relayHealth<=0?'The uplink was destroyed. Intercept enemies before they reach the relay.':'Kestrel is disabled. Use hard cover, keep your front toward incoming fire, and activate your shield before crossing a firing lane.'}</p><button class="primary" data-action="retry">RETRY ${MISSIONS[this.mission].name.toUpperCase()} →</button><button data-action="menu">Return to command</button><small>Your purchased upgrades and unlocked operations are safe.</small></section>`;this.focusPrimary();}
  showVictory(){this.overlay.innerHTML=`<section class="panel victory-panel"><span class="eyebrow">MERIDIAN / SIGNAL RESTORED</span><div class="victory-symbol">◈</div><h1>Everyone<br>comes home.</h1><p>${MISSIONS[this.mission].debrief}</p><blockquote>“Kestrel, this is the last transport.<br>We made it. We all made it.”</blockquote><span class="eyebrow">${this.mission===5?'VALLEY SECURED · THREE RECOVERY OPERATIONS UNLOCKED':'NINE OPERATIONS · MERIDIAN RECLAIMED'}</span><button class="primary" data-action="menu">RETURN TO COMMAND →</button><small>Choose unlocked operations from the command route.</small></section>`;this.focusPrimary();}
  tone(frequency:number,duration:number,volume:number){
    if(!this.save.sound)return;
    try{this.audio??=new AudioContext();void this.audio.resume();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(frequency,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(frequency*.4,this.audio.currentTime+duration);gain.gain.setValueAtTime(volume,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);}catch{/* Audio is optional. */}
  }
  frame(now:number){
    const dt=Math.min((now-this.last)/1000,.1);this.last=now;
    if(this.phase==='playing'){this.accumulator+=dt;let steps=0;while(this.accumulator>=1/60&&steps++<6){this.step(1/60);this.accumulator-=1/60;}}
    else {this.accumulator=0;if(this.phase==='menu')this.player.visual.turret.rotation.y=Math.PI+Math.sin(now*.0003)*.45;}
    this.hurtTimer=Math.max(0,this.hurtTimer-dt);document.body.classList.toggle('hurt',this.hurtTimer>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.world.update(this.phase!=='paused'?dt:0,this.player.visual.root.position,this.phase==='menu');
    requestAnimationFrame(t=>this.frame(t));
  }
}
