import * as T from 'three';
import { World } from './world';
import type { Cover, TankVisual } from './world';
import { Input } from './input';
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
  weapon=0; reload=0; shieldTime=0; shieldCooldown=0; repairs=1; relayHealth=300; convoyHealth=260; convoy:T.Group|null=null;
  overlay:HTMLElement; hud:HTMLElement; radio:HTMLElement; mini:HTMLCanvasElement;
  radioTimer=0; hudTimer=0; last=0; accumulator=0; hurtTimer=0;
  ray=new T.Raycaster(); plane=new T.Plane(new T.Vector3(0,1,0),0); aimPoint=new T.Vector3(0,0,-15);
  audio:AudioContext|null=null; saveWarning=false;
  projectileGeometry=new T.SphereGeometry(.16,6,4);
  projectileMaterials=[new T.MeshBasicMaterial({color:0xffe7a2}),new T.MeshBasicMaterial({color:0xff7552})];
  constructor(root:HTMLElement){
    this.root=root;
    try{this.save=parseSave(localStorage.getItem(SAVE_KEY));}catch{this.saveWarning=true;}
    root.innerHTML=`<div id="battlefield"></div><div class="vignette"></div><div id="hud" hidden>
      <div class="mission-hud"><span class="eyebrow" id="mission-number"></span><h2 id="mission-name"></h2><p id="objective"></p><div class="objective-track"><i id="objective-fill"></i></div></div>
      <div class="top-actions"><button id="pause" aria-label="Pause game">Ⅱ <span>PAUSE</span></button><canvas id="minimap" width="176" height="132" aria-label="Tactical map"></canvas></div>
      <div class="bottom-hud"><div class="hull-block"><div><span>HULL</span><strong id="health-label"></strong></div><div class="hull-track"><i id="health-fill"></i></div><small id="status-line">ARMOR ONLINE</small></div>
      <button class="weapon-block" id="weapon"><span id="weapon-label"></span><strong id="reload-label"></strong><div class="reload-track"><i id="reload-fill"></i></div><small>1 / 2 / 3 · SWITCH</small></button>
      <div class="abilities"><button id="shield"><kbd>Q</kbd><span id="shield-label">SHIELD</span></button><button id="repair"><kbd>E</kbd><span id="repair-label">REPAIR ×1</span></button></div></div>
      <div class="touch-pad move-pad" id="move-pad" aria-label="Drive joystick"><span class="stick-nub"></span><small>DRIVE</small></div><div class="touch-pad aim-pad" id="aim-pad" aria-label="Aim and fire joystick"><span class="stick-nub"></span><small>AIM / FIRE</small></div>
      <div class="radio" id="radio" role="status"></div><div class="desktop-hint">WASD <span>drive</span> · MOUSE <span>aim</span> · HOLD CLICK <span>fire</span></div>
    </div><div id="overlay"></div><div class="loading" id="loading"><span class="eyebrow">KESTREL // CONNECTING</span><h1>Establishing uplink<span class="blink">_</span></h1><p>Loading the valley and armored units.</p></div>`;
    this.overlay=this.el('overlay');this.hud=this.el('hud');this.radio=this.el('radio');this.mini=this.el('minimap') as HTMLCanvasElement;
    this.world=new World(this.el('battlefield'));this.input=new Input(this.world.renderer.domElement);
    this.input.onPause=()=>{if(this.phase==='playing')this.pause();else if(this.phase==='paused'&&!document.hidden&&document.hasFocus())this.resume();};
    this.input.onAction=a=>this.action(a);
    this.el('pause').onclick=()=>this.pause();this.el('weapon').onclick=()=>this.action('switch');this.el('shield').onclick=()=>this.action('shield');this.el('repair').onclick=()=>this.action('repair');
    this.input.bindStick(this.el('move-pad'),'move');this.input.bindStick(this.el('aim-pad'),'aim');
    this.overlay.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');if(button&&!button.disabled)this.menuAction(button.dataset.action!,button.dataset.value);});
    this.world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.phase==='playing')this.pause();this.overlay.innerHTML='<section class="panel"><h1>Graphics connection lost</h1><p>Your mission checkpoint is saved. Reload to reconnect.</p><button onclick="location.reload()">Reload game</button></section>';});
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
  controls(){return '<div class="control-guide"><span><kbd>W A S D</kbd> Drive</span><span><kbd>MOUSE</kbd> Aim + hold click to fire</span><span><kbd>1 2 3</kbd> Weapon</span><span><kbd>Q</kbd> Shield</span><span><kbd>E</kbd> Repair</span><span><kbd>ESC</kbd> Pause</span><p class="touch-guide">On touch: left stick drives; right stick aims and fires. Tap the weapon, shield and repair buttons for actions.</p></div>';}
  showMenu(){
    this.setPhase('menu');this.world.target.copy(this.player.visual.root.position);const m=MISSIONS[this.mission];
    this.overlay.innerHTML=`<main class="command-screen"><header class="brand"><span class="brand-mark">◈</span><span>KESTREL DIVISION<small>MERIDIAN RECOVERY COMMAND</small></span><span class="build-label">3D CAMPAIGN / 01</span></header><section class="hero"><span class="eyebrow">MERIDIAN CAMPAIGN</span><h1>STEEL<br><em>FRONT</em><span>LAST SIGNAL</span></h1></section><aside class="briefing panel"><div class="panel-top"><span class="eyebrow">OPERATION ${String(this.mission+1).padStart(2,'0')} / 06</span></div><h2>${m.name}</h2><div class="mission-task"><span>OBJECTIVE</span><strong>${m.objective}</strong></div><div class="difficulty" aria-label="Difficulty">${(['story','standard','veteran'] as Difficulty[]).map(d=>`<button data-action="difficulty" data-value="${d}" aria-pressed="${this.save.difficulty===d}" class="${this.save.difficulty===d?'active':''}">${d}</button>`).join('')}</div><button class="primary deploy" data-action="deploy">DEPLOY <span>→</span></button><details><summary>Briefing & controls</summary><p class="briefing-copy">${m.briefing}</p>${this.controls()}<p class="manual">Front armor absorbs damage. Flank for stronger hits. Red lines warn of incoming fire. Amber marks the objective. Destroy red fuel drums to damage nearby units.</p></details></aside><section class="campaign-route"><div class="route-heading"><span class="eyebrow">THE ROAD HOME</span><span>${this.save.cleared.filter(Boolean).length} / 6 COMPLETE</span></div><div class="route-list">${this.route()}</div></section><footer>${this.settings()}<button class="quiet" data-action="reset-prompt">Reset campaign</button></footer>${this.saveWarning?'<p class="storage-warning">Browser storage is unavailable. Progress will last only for this session.</p>':''}</main>`;
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
    if(action==='mission'){const i=Number(value),frontier=this.save.cleared.indexOf(false);if(Number.isInteger(i)&&i>=0&&i<6&&(frontier<0||i<=frontier)){this.prepare(i);this.showMenu();}}
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
    const visual=this.world.tank(!player,boss);visual.root.position.set(x,0,z);
    const difficulty=this.save.difficulty==='story'?1.4:this.save.difficulty==='veteran'?.8:1;
    const hp=player?(240+this.save.upgrades.armor*65)*difficulty:boss?650:role==='heavy'?160:role==='sentry'?90:65;
    return {visual,hp,max:hp,heading:player?Math.PI:0,aim:player?Math.PI:0,cooldown:2+(this.enemies.length%3)*.8,role,dead:false};
  }
  prepare(index:number){
    this.mission=index;this.world.build(index,MISSIONS[index].kind);this.shots=[];this.pickups=[];this.enemies=[];this.convoy=null;
    this.elapsed=0;this.capture=0;this.spawnTimer=0;this.kills=0;this.shotsFired=0;this.reload=0;this.weapon=0;this.shieldTime=0;this.shieldCooldown=0;this.repairs=1;this.relayHealth=300;this.convoyHealth=260;
    this.player=this.makeUnit(-4,22,'player');this.player.visual.hull.rotation.y=Math.PI;this.player.visual.turret.rotation.y=Math.PI;
    const points=[[-17,-17],[17,-21],[25,0],[-28,0],[8,-25],[-6,-23]];
    for(let i=0;i<MISSIONS[index].count;i++){const p=points[i];this.enemies.push(this.makeUnit(p[0],p[1],index===5&&i===0?'boss':index>=4&&i%2===0?'heavy':i%3===1?'sentry':'raider'));}
    if(MISSIONS[index].kind==='escort'){this.convoy=this.world.clone('transport');this.convoy.position.set(0,0,22);this.convoy.rotation.y=Math.PI;this.world.entities.add(this.convoy);}
    this.world.shield.visible=false;this.world.cursor.visible=false;
    this.syncVisual(this.player);this.enemies.forEach(e=>this.syncVisual(e));this.updateHud();
  }
  start(index:number){this.prepare(index);this.setPhase('playing');this.overlay.innerHTML='';this.radioMessage(MISSIONS[index].radio,9);this.last=performance.now();this.accumulator=0;this.tone(360,.12,.05);}
  action(action:string){
    if(this.phase!=='playing')return;
    if(action==='shield'&&this.shieldCooldown<=0){this.shieldTime=3;this.shieldCooldown=14;this.radioMessage('KESTREL / Protective field active. Three seconds of cover.',3);this.tone(620,.2,.04);}
    if(action==='repair'&&this.repairs>0&&this.player.hp<this.player.max){this.repairs--;this.player.hp=Math.min(this.player.max,this.player.hp+110);this.world.burst(this.player.visual.root.position,3);this.tone(720,.15,.05);}
    if(action==='switch')this.weapon=(this.weapon+1)%weaponCount(this.save);
    if(['1','2','3'].includes(action)){const w=Number(action)-1;if(w<weaponCount(this.save))this.weapon=w;else this.radioMessage(`ARMORY / ${w===1?'Autocannon unlocks after First Light.':'Rockets unlock after Homeward.'}`,3);}
    this.updateHud();
  }
  weaponStats(){return [{damage:44,speed:48,reload:.85,splash:0},{damage:13,speed:58,reload:.19,splash:0},{damage:70,speed:30,reload:1.6,splash:4.5}][this.weapon];}
  reloadDuration(){return this.weaponStats().reload*(1-this.save.upgrades.reload*.13);}
  moveUnit(unit:Unit,dx:number,dz:number){
    const p=unit.visual.root.position,r=unit.role==='boss'?2:1.25;
    const blocked=(x:number,z:number)=>this.world.covers.some(c=>c.hp>0&&circleBox({x,z},r,c))||[this.player,...this.enemies].some(other=>other!==unit&&!other.dead&&distance({x,z},other.visual.root.position)<(other.role==='boss'?2:1.25)+r)||!!(this.convoy&&distance({x,z},this.convoy.position)<2.3&&unit.role!=='player');
    const x=clamp(p.x+dx,-35,35);if(!blocked(x,p.z))p.x=x;
    const z=clamp(p.z+dz,-28,27);if(!blocked(p.x,z))p.z=z;
  }
  syncVisual(unit:Unit){
    unit.visual.hull.rotation.y=unit.heading;unit.visual.turret.rotation.y=unit.aim;
    unit.visual.bar.scale.x=Math.max(.001,unit.hp/unit.max);unit.visual.bar.visible=!unit.dead&&unit.role!=='player';
    unit.visual.root.visible=!unit.dead;
  }
  shoot(unit:Unit,friendly:boolean){
    const stats=friendly?this.weaponStats():{damage:unit.role==='boss'?33:unit.role==='heavy'?24:15,speed:unit.role==='boss'?32:25,splash:0};
    const direction=new T.Vector3(Math.sin(unit.aim),0,Math.cos(unit.aim));
    const mesh=new T.Mesh(this.projectileGeometry,this.projectileMaterials[friendly?0:1]);
    if(friendly&&this.weapon===2)mesh.scale.set(1.8,1.8,2.5);
    unit.visual.root.updateMatrixWorld(true);unit.visual.muzzle.getWorldPosition(mesh.position);
    this.world.entities.add(mesh);
    const p=unit.visual.root.position;
    this.shots.push({mesh,p:{x:p.x,z:p.z},from:{x:p.x,z:p.z},dx:direction.x,dz:direction.z,speed:stats.speed,damage:stats.damage*(friendly?1+this.save.upgrades.power*.2:this.save.difficulty==='story'?.65:this.save.difficulty==='veteran'?1.2:1),life:2.5,friendly,splash:stats.splash});
    if(friendly){this.shotsFired++;this.reload=this.reloadDuration();this.tone(this.weapon===1?110:65,.1,.05);}
    unit.visual.turret.position.y=1.10;
    this.world.burst(mesh.position,0,3);
  }
  updatePlayer(dt:number){
    const movement=this.input.movement(),length=Math.hypot(movement.x,movement.z);
    if(length>.06){const dx=movement.x/Math.max(1,length),dz=movement.z/Math.max(1,length);this.moveUnit(this.player,dx*9*dt,dz*9*dt);this.player.heading=turnToward(this.player.heading,Math.atan2(dx,dz),dt*4.5);}
    const p=this.player.visual.root.position;
    if(this.input.touchAiming)this.aimPoint.set(p.x+this.input.aim.x*18,0,p.z+this.input.aim.z*18);
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
      e.cooldown-=dt;
      const beam=e.visual.beam;beam.visible=e.cooldown<.85&&dist<38;beam.scale.z=dist;beam.position.set(p.x+Math.sin(e.aim)*dist/2,.12,p.z+Math.cos(e.aim)*dist/2);beam.rotation.y=e.aim;
      this.syncVisual(e);
      if(e.cooldown<=0&&dist<38){this.shoot(e,false);e.cooldown=e.role==='boss'?(e.hp<e.max*.5?1.05:1.9):e.role==='sentry'?2.6:3.1;}
    }
  }
  damageUnit(unit:Unit,damage:number,source:Point){
    if(unit.dead||unit===this.player&&this.shieldTime>0)return;
    const multiplier=armorMultiplier(unit.visual.root.position,unit.heading,source);
    unit.hp-=damage*multiplier;
    this.world.burst(unit.visual.root.position,unit===this.player?1:0,5);
    if(unit===this.player){this.hurtTimer=.2;this.tone(45,.07,.03);}
    if(unit.hp<=0){unit.hp=0;unit.dead=true;unit.visual.beam.visible=false;this.world.burst(unit.visual.root.position,1,20);this.tone(45,.22,.06);
      if(unit!==this.player){this.kills++;if(this.kills%3===0){const mesh=new T.Mesh(new T.OctahedronGeometry(.65),new T.MeshStandardMaterial({color:0x7bf6c3,emissive:0x20805c,emissiveIntensity:.5}));mesh.userData.owned=true;mesh.position.copy(unit.visual.root.position).y=1;this.world.entities.add(mesh);this.pickups.push({mesh,life:30});}}
      this.syncVisual(unit);
    }
  }
  hitCover(cover:Cover,damage:number){
    if(cover.hp<=0)return;cover.hp-=damage;this.world.burst(cover.mesh.position,2,5);
    if(cover.hp<=0){cover.mesh.visible=false;if(cover.kind==='barrel'){this.world.burst(cover.mesh.position,1,20);this.explode(cover,5,65);}}
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
      if(hit){const impact={x:s.p.x+(b.x-s.p.x)*first,z:s.p.z+(b.z-s.p.z)*first};hit();if(s.splash)this.explode(impact,s.splash,s.damage*.55);s.life=0;}
      s.p=b;s.mesh.position.set(b.x,1.4,b.z);
      if(s.life<=0||Math.abs(b.x)>45||Math.abs(b.z)>38){s.mesh.removeFromParent();this.shots.splice(i,1);}
    }
  }
  objectiveProgress(){const m=MISSIONS[this.mission];if(m.kind==='capture')return this.capture/m.duration;if(m.kind==='defense')return this.elapsed/m.duration;if(m.kind==='escort')return this.convoy?(22-this.convoy.position.z)/48:0;if(m.kind==='boss'){const b=this.enemies.find(e=>e.role==='boss');return b?1-b.hp/b.max:0;}return this.kills/m.count;}
  step(dt:number){
    if(this.phase!=='playing')return;
    this.elapsed+=dt;this.updatePlayer(dt);this.updateEnemies(dt);this.updateShots(dt);
    for(const unit of [this.player,...this.enemies])unit.visual.turret.position.y+=(1.17-unit.visual.turret.position.y)*Math.min(1,dt*12);
    this.syncVisual(this.player);
    const m=MISSIONS[this.mission],p=this.player.visual.root.position;
    if(m.kind==='capture'&&distance(p,{x:0,z:-13})<6.7&&!this.enemies.some(e=>!e.dead&&distance(e.visual.root.position,{x:0,z:-13})<6.7))this.capture+=dt;
    if(this.convoy&&distance(p,this.convoy.position)<12)this.convoy.position.z=Math.max(-26,this.convoy.position.z-dt*2.2);
    if(['capture','defense'].includes(m.kind)){
      this.spawnTimer+=dt;
      if(this.spawnTimer>12&&this.enemies.filter(e=>!e.dead).length<7){this.spawnTimer=0;this.enemies.push(this.makeUnit(this.enemies.length%2?30:-30,-24,'raider'));this.radioMessage('IVO / New hostile signature on the perimeter.',3);}
    }
    for(let i=this.pickups.length-1;i>=0;i--){const pickup=this.pickups[i];pickup.life-=dt;pickup.mesh.rotation.y+=dt;if(distance(p,pickup.mesh.position)<2.4){this.player.hp=Math.min(this.player.max,this.player.hp+45);pickup.life=0;this.tone(800,.12,.03);}if(pickup.life<=0){pickup.mesh.removeFromParent();pickup.mesh.geometry.dispose();(pickup.mesh.material as T.Material).dispose();this.pickups.splice(i,1);}}
    if(this.player.hp<=0||this.convoyHealth<=0||this.relayHealth<=0){this.fail();return;}
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
    if(m.kind==='escort')objective=`TRANSPORT ${Math.max(0,Math.ceil(this.convoyHealth/2.6))}% · ${this.convoy&&distance(this.player.visual.root.position,this.convoy.position)<12?'MOVING TO EXTRACTION':'MOVE CLOSER TO ESCORT'}`;
    if(m.kind==='boss'){const b=this.enemies.find(e=>e.role==='boss');objective=`WARDEN ${Math.max(0,Math.ceil((b?.hp||0)/(b?.max||1)*100))}% · ${b&&b.hp<b.max*.5?'OVERDRIVE — KEEP MOVING':'WATCH THE TARGETING LINE'}`;}
    this.el('objective').textContent=objective;this.el('objective-fill').style.width=`${clamp(this.objectiveProgress()*100,0,100)}%`;
    this.el('health-label').textContent=`${Math.ceil(this.player.hp)} / ${Math.ceil(this.player.max)}`;this.el('health-fill').style.width=`${this.player.hp/this.player.max*100}%`;
    this.el('status-line').textContent=this.shieldTime>0?'PROTECTIVE FIELD ACTIVE':this.player.hp<this.player.max*.3?'HULL CRITICAL — SEEK COVER':'FRONT ARMOR ONLINE';
    this.el('weapon-label').textContent=weaponNames[this.weapon];this.el('reload-label').textContent=this.reload>0?`${this.reload.toFixed(1)}s`:'READY';this.el('reload-fill').style.width=`${(1-clamp(this.reload/this.reloadDuration(),0,1))*100}%`;
    this.el('shield-label').textContent=this.shieldCooldown>0?`SHIELD ${Math.ceil(this.shieldCooldown)}s`:'SHIELD';this.el('repair-label').textContent=`REPAIR ×${this.repairs}`;
    (this.el('shield') as HTMLButtonElement).disabled=this.shieldCooldown>0;(this.el('repair') as HTMLButtonElement).disabled=this.repairs===0||this.player.hp>=this.player.max;
    const ctx=this.mini.getContext('2d')!;ctx.fillStyle='#142328';ctx.fillRect(0,0,176,132);ctx.strokeStyle='#3b5557';ctx.strokeRect(5,5,166,122);
    const map=(point:Point)=>({x:point.x/80*166+88,y:point.z/64*122+66});
    for(const c of this.world.covers){if(c.hp<=0)continue;const q=map(c);ctx.fillStyle='#667770';ctx.fillRect(q.x-2,q.y-2,4,4);}
    if(this.world.ring.visible){const q=map(this.world.ring.position);ctx.strokeStyle='#ffbd70';ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.stroke();}
    for(const u of [this.player,...this.enemies]){if(u.dead)continue;const q=map(u.visual.root.position);ctx.fillStyle=u===this.player?'#a4ffe0':'#ff7a5d';ctx.beginPath();ctx.arc(q.x,q.y,u===this.player?3:2,0,Math.PI*2);ctx.fill();}
    if(this.convoy){const q=map(this.convoy.position);ctx.fillStyle='#ffcb84';ctx.fillRect(q.x-3,q.y-3,6,6);}
  }
  complete(){if(this.phase!=='playing')return;this.lastReward=rewardClear(this.save,this.mission);this.persist();this.setPhase(this.mission===5?'victory':'depot');this.tone(660,.22,.06);if(this.mission===5)this.showVictory();else this.showDepot();}
  showDepot(){
    const upgradeInfo:Record<Upgrade,[string,string]>={armor:['Reactive armor','+65 base hull per level'],power:['Shaped charges','+20% weapon damage per level'],reload:['Autoloader','−13% base reload per level']};
    this.overlay.innerHTML=`<section class="panel depot-panel"><span class="eyebrow">OPERATION ${String(this.mission+1).padStart(2,'0')} / COMPLETE</span><div class="debrief-title"><h1>A road reclaimed.</h1><span class="credit-total">${this.save.credits}<small>SUPPLY CREDITS</small></span></div><p>${MISSIONS[this.mission].debrief}</p><div class="result-stats"><span><strong>${this.kills}</strong>ELIMINATED</span><span><strong>${Math.ceil(this.elapsed)}s</strong>TIME</span><span><strong>+${this.lastReward}</strong>${this.lastReward?'REWARD':'REPLAY · NO NEW REWARD'}</span></div><div class="depot-heading"><h2>Field workshop</h2><span>HULL RESTORED</span></div><div class="upgrade-grid">${(['armor','power','reload'] as Upgrade[]).map(id=>{const level=this.save.upgrades[id],cost=upgradeCost(level);return `<article class="upgrade-card"><span class="eyebrow">LEVEL ${level} / 3</span><h3>${upgradeInfo[id][0]}</h3><p>${upgradeInfo[id][1]}</p><button data-action="buy" data-value="${id}" ${level>=3||this.save.credits<cost?'disabled':''}>${level>=3?'MAX LEVEL':`UPGRADE · ${cost} CR`}</button></article>`;}).join('')}</div>${this.mission===0?'<p class="unlock">ARMORY UNLOCK / 30 mm autocannon — press 2 in combat.</p>':this.mission===2?'<p class="unlock">ARMORY UNLOCK / Siege rockets — press 3 in combat.</p>':''}<button class="primary" data-action="next">NEXT BRIEFING →</button><button class="quiet" data-action="menu">Return to command</button>${this.saveWarning?'<p>Storage is unavailable; keep this tab open to retain progress.</p>':''}</section>`;this.focusPrimary();
  }
  buy(id:Upgrade){if(!['armor','power','reload'].includes(id))return;const result=purchase(this.save.credits,this.save.upgrades[id]);if(!result)return;this.save.credits=result.credits;this.save.upgrades[id]=result.level;this.persist();this.tone(560,.08,.03);this.showDepot();}
  fail(){this.setPhase('failed');this.overlay.innerHTML=`<section class="panel pause-panel"><span class="eyebrow">OPERATION INTERRUPTED</span><h1>We go again.</h1><p>${this.convoyHealth<=0?'The rescue transport was lost. Stay close and intercept the ambushers.':this.relayHealth<=0?'The uplink was destroyed. Intercept enemies before they reach the relay.':'Kestrel is disabled. Use hard cover, keep your front toward incoming fire, and activate your shield before crossing a firing lane.'}</p><button class="primary" data-action="retry">RETRY ${MISSIONS[this.mission].name.toUpperCase()} →</button><button data-action="menu">Return to command</button><small>Your purchased upgrades and unlocked operations are safe.</small></section>`;this.focusPrimary();}
  showVictory(){this.overlay.innerHTML=`<section class="panel victory-panel"><span class="eyebrow">MERIDIAN / SIGNAL RESTORED</span><div class="victory-symbol">◈</div><h1>Everyone<br>comes home.</h1><p>${MISSIONS[5].debrief}</p><blockquote>“Kestrel, this is the last transport.<br>We made it. We all made it.”</blockquote><span class="eyebrow">SIX OPERATIONS · ONE WAY HOME</span><button class="primary" data-action="menu">RETURN TO COMMAND →</button><small>Campaign complete. Replay any operation from the route.</small></section>`;this.focusPrimary();}
  tone(frequency:number,duration:number,volume:number){
    if(!this.save.sound)return;
    try{this.audio??=new AudioContext();void this.audio.resume();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(frequency,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(frequency*.4,this.audio.currentTime+duration);gain.gain.setValueAtTime(volume,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);}catch{/* Audio is optional. */}
  }
  frame(now:number){
    const dt=Math.min((now-this.last)/1000,.1);this.last=now;
    if(this.phase==='playing'){this.accumulator+=dt;let steps=0;while(this.accumulator>=1/60&&steps++<6){this.step(1/60);this.accumulator-=1/60;}}
    else {this.accumulator=0;if(this.phase==='menu')this.player.visual.turret.rotation.y=Math.PI+Math.sin(now*.0003)*.45;}
    this.hurtTimer=Math.max(0,this.hurtTimer-dt);document.body.classList.toggle('hurt',this.hurtTimer>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.world.update(this.phase==='playing'||this.phase==='menu'?dt:0,this.player.visual.root.position,this.phase==='menu');
    requestAnimationFrame(t=>this.frame(t));
  }
}
