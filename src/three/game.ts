import {grantBackgroundStrikes} from './strike-bank';
import {AutoMissiles,buyAutoPack} from './auto-missiles';
import {ammoCapacity} from './skins';
import {coin} from './shop-icons';
import {Flamethrower,FLAME} from './flamethrower';
import {enemyHealth} from './unit-health';
import {GuidedBarrage} from './barrage';
import {ESCORT,escortStartClear,escortEncounterMeters} from './escort';
import {WEAPONS,weaponLevel,weaponDamage,barrels,powerMultiplier,reloadSeconds,engineMultiplier,shieldBonus,shieldCooldown as upgradedShieldCooldown} from './armory';
import {workshop} from './workshop';
import {UPGRADES} from './rules';
import {AirSupport} from './air-support';
import {MINE_TRIGGER_RADIUS,AIM_WARNING_SECONDS} from './combat-ranges';
import {assignPatrol,updatePatrol} from './patrols';
import type {PatrolOrder} from './patrols';
import {DROP_CHANCE,ammoCaps,salvageReward} from './loot';
import {ROUTE_LABELS} from './route-patterns';
import {RouteEncounters,clearSight,seesTarget} from './encounters';
import {guardPost} from './enemy-posts';
import type {EncounterOrder} from './encounters';
import {GroundNavigation} from './navigation';
import {alongRoute,routeSample,projectRoute,ENCOUNTER_FRACTIONS} from './stage-layout';
import {DIFFICULTIES,MODES,mode,normalizeDifficulty} from './difficulty';
import type {BossKind} from './bosses';
import {BiomeHazards} from './hazards';
import {terrainAt,terrainLabel,terrainRegions,tractionMotion} from './terrain';
import { rocketTarget } from './rocket-target';
import { SKINS, getSkin, buySkin } from './skins';
import * as T from 'three';
import { BossCombat, BOSS, bossKind } from './bosses';
import { SpecialWeapons,isConcrete } from './special-weapons';
import { World } from './world';
import type { Cover, TankVisual } from './world';
import { Input } from './input';
import { BOUNDS, createActivity } from './activities';
import { awardStage } from './results';
import type { StageResult } from './results';
import { MISSIONS, LEVEL_NAMES, levelMission, unlockedLevel, encounterSize, freshSave, parseSave, SAVE_KEY, weaponCount, ownsWeapon, buyWeapon, upgradeWeapon } from './campaign';
import type { Save } from './campaign';
import { armorMultiplier, clamp, circleBox, distance, purchase, segmentBox, segmentCircle, turnToward } from './rules';
import type { Point, Upgrade } from './rules';
type Phase='menu'|'finishing'|'playing'|'paused'|'depot'|'failed'|'victory';
export interface Unit { patrol?:PatrolOrder; burstLeft?:number; lastSeen?:Point; searchUntil?:number; encounter?:EncounterOrder; bossKind?:BossKind; mudTime?:number; velocity:Point; visual:TankVisual; hp:number; max:number; heading:number; aim:number; cooldown:number; role:'player'|'raider'|'sentry'|'heavy'|'boss'|'rifleman'|'rocketeer'|'jeep'; dead:boolean; }
interface Shot { height?:{start:number;range:number;traveled:number}; mesh:T.Mesh; p:Point; from:Point; dx:number; dz:number; speed:number; damage:number; life:number; friendly:boolean; splash:number; }
export class Game {
  root:HTMLElement; world:World; input:Input; save:Save=freshSave(); phase:Phase='menu'; mission=0;level=0;armoredGoal=0;
  player!:Unit; enemies:Unit[]=[]; shots:Shot[]=[];
  finishDelay=0;finishDeadline=0;stageResult:StageResult|null=null;
  elapsed=0; capture=0; kills=0; shotsFired=0; lastReward=0;
  bosses=new BossCombat();hazards=new BiomeHazards();encounters=new RouteEncounters();salvageDrops=0;lootRandom=()=>Math.random();
  flame=new Flamethrower();special=new SpecialWeapons();specialAmmo=[0,0,0,0];infantryKills=0;
  weaponPickerOpen=false;auto=new AutoMissiles();airSupport=new AirSupport();
  qualityChanging=false;qualityError=false;
  navigation=new GroundNavigation();convoyDistance=0;convoyReverse:boolean|null=null;
  weapon=0; reload=0; shieldTime=0; shieldCooldown=0; relayHealth=300; convoyHealth=ESCORT.health; convoy:T.Group|null=null;convoyBlocked=false;
  overlay:HTMLElement; hud:HTMLElement; radio:HTMLElement; mini:HTMLCanvasElement;
  radioTimer=0; hudTimer=0; last=0; accumulator=0; hurtTimer=0;
  ray=new T.Raycaster(); plane=new T.Plane(new T.Vector3(0,1,0),0); aimPoint=new T.Vector3(0,0,-15);
  audio:AudioContext|null=null; saveWarning=false;
  fieldWeaponCount=1;artilleryCooldown=0;powerBoost=0;trailClock=0;dustClock=0;
  guided=new GuidedBarrage();escortDeploying=false;
  get strikes(){return this.guided.strikes;}
  projectileGeometry=new T.CylinderGeometry(.10,.16,1.6,8).rotateX(Math.PI/2);
  trailGeometry=new T.ConeGeometry(.22,2.8,8).rotateX(-Math.PI/2);
  trailMaterial=new T.MeshBasicMaterial({color:0xffa147,transparent:true,opacity:.4,blending:T.AdditiveBlending,depthWrite:false});
  projectileMaterials=[new T.MeshBasicMaterial({color:0xffe7a2}),new T.MeshBasicMaterial({color:0xff7552}),new T.MeshBasicMaterial({color:0x82faff}),new T.MeshBasicMaterial({color:0xff9538})];
  constructor(root:HTMLElement){
    this.root=root;
    try{this.save=parseSave(localStorage.getItem(SAVE_KEY));}catch{this.saveWarning=true;}
    root.innerHTML=`<div id="battlefield"></div><div class="vignette"></div><div id="hud" hidden>
      <div class="mission-hud"><span class="eyebrow" id="mission-number"></span><h2 id="mission-name"></h2><span id="mission-compact"></span><p id="objective"></p><p id="objective-compact"></p><div id="boss-readout" hidden></div><div id="boss-compact" hidden></div><div class="objective-track"><i id="objective-fill"></i></div></div>
      <div class="top-actions"><button id="pause" aria-label="Pause game">Ⅱ <span>PAUSE</span></button><canvas id="minimap" width="176" height="132" aria-label="Tactical map"></canvas></div>
      <div class="bottom-hud"><div id="weapon-shortcuts" role="group" aria-label="Weapon shortcuts"></div><div class="hull-block"><div><span>HULL</span><strong id="health-label"></strong></div><div class="hull-track"><i id="health-fill"></i></div><small id="status-line">ARMOR ONLINE</small></div>
      <button class="weapon-block" id="weapon"><span id="weapon-label"></span><strong id="reload-label"></strong><div class="reload-track"><i id="reload-fill"></i></div><small class="switch-gun-label">SWITCH GUN <span>· C / 1–9</span> ▴</small></button>
      <div class="abilities"><button id="fire" class="pc-fire"><kbd>SPACE / F</kbd>FIRE</button><div class="support-pair"><button id="artillery" data-support="support-strike" aria-label="Strike: guided missiles (R)"><kbd>R</kbd><span id="artillery-label">STRIKE</span></button><button id="drop" data-support="support-drop" aria-label="Drop: supply crate (T)"><kbd>T</kbd><span id="drop-label">DROP</span></button></div><button id="shield"><kbd>Q</kbd><span id="shield-label">SHIELD</span></button><button id="auto" aria-label="Auto: guided vehicle missile (E)"><kbd>E</kbd><span id="auto-label">AUTO 0</span></button></div></div>
      <div class="touch-pad move-pad" id="move-pad" aria-label="Drive joystick"><span class="stick-nub"></span><small>DRIVE</small></div><div class="touch-pad aim-pad" id="aim-pad" aria-label="Aim and fire joystick"><span class="stick-nub"></span><small>AIM / FIRE</small></div>
      <div id="weapon-picker" class="weapon-picker" hidden role="group" aria-label="Choose weapon"></div><div class="radio" id="radio" role="status"></div><div class="desktop-hint">WASD <span>drive</span> · IJKL / MOUSE <span>aim</span> · SPACE / F <span>fire</span> · C / 1–9 <span>guns</span> · R / T <span>strike / drop</span> · Q <span>shield</span> · E <span>auto missile</span></div>
    </div><div id="overlay"></div><div class="loading" id="loading"><span class="eyebrow">KESTREL // CONNECTING</span><h1>Establishing uplink<span class="blink">_</span></h1><p>Loading the valley and armored units.</p></div>`;
    this.overlay=this.el('overlay');this.hud=this.el('hud');this.radio=this.el('radio');this.mini=this.el('minimap') as HTMLCanvasElement;
    this.world=new World(this.el('battlefield'));this.input=new Input(this.world.renderer.domElement);
    this.input.onPause=()=>{if(this.phase==='playing')this.pause();else if(this.phase==='paused'&&!document.hidden&&document.hasFocus())this.resume();};
    this.input.onBackground=()=>{if(this.phase==='playing')this.pause();};
    this.input.onAction=a=>this.action(a);
    this.bindActions(this.hud,button=>{if(button.id==='pause')this.pause();else this.action(button.dataset.support??button.dataset.quickWeapon??button.dataset.weapon??(button.id==='weapon'?'switch':button.id));});
    this.input.bindStick(this.el('move-pad'),'move');this.input.bindStick(this.el('aim-pad'),'aim');
    this.bindActions(this.overlay,button=>this.menuAction(button.dataset.action!,button.dataset.value),'button[data-action]');
    this.world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.phase==='playing')this.pause();this.overlay.innerHTML='<section class="panel"><h1>Graphics connection lost</h1><p>Your mission checkpoint is saved. Reload to reconnect.</p><button onclick="location.reload()">Reload game</button></section>';});
  }
  private bindActions(root:HTMLElement,run:(button:HTMLButtonElement)=>void,selector='button'){
    const presses=new Map<number,{button:HTMLButtonElement;x:number;y:number}>();let pendingTouchClick=false;
    const buttonAt=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLButtonElement>(selector):null;
    root.addEventListener('pointerdown',e=>{pendingTouchClick=false;const button=buttonAt(e.target);if(e.pointerType==='touch'&&button&&!button.disabled){presses.set(e.pointerId,{button,x:e.clientX,y:e.clientY});button.setPointerCapture(e.pointerId);}});
    root.addEventListener('pointercancel',e=>presses.delete(e.pointerId));
    root.addEventListener('pointerup',e=>{
      const press=presses.get(e.pointerId);presses.delete(e.pointerId);if(!press||press.button.disabled||!root.contains(press.button))return;
      const r=press.button.getBoundingClientRect();if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>12||e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
      pendingTouchClick=true;e.preventDefault();run(press.button);
    });
    // A handled touch can replace its button with a link before the browser sends its compatibility click.
    root.addEventListener('click',e=>{if(pendingTouchClick&&e.detail!==0){pendingTouchClick=false;e.preventDefault();e.stopPropagation();return;}const button=buttonAt(e.target);if(!button||button.disabled)return;run(button);});
  }
  el(id:string){return document.getElementById(id)!;}
  async init(){
    await this.world.load(this.save.low);this.world.settings(this.save.low);this.prepare(this.save.mission);this.showMenu();this.el('loading').remove();
    this.last=performance.now();requestAnimationFrame(t=>this.frame(t));
    if(import.meta.env.DEV && new URLSearchParams(location.search).has('e2e'))(window as unknown as {__steel:Game}).__steel=this;
  }
  persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.save));}catch{this.saveWarning=true;}}
  setPhase(phase:Phase){if(!['playing','paused'].includes(phase)){this.clearBarrage();this.auto.clear();}this.phase=phase;document.body.dataset.phase=phase;this.hud.hidden=!['playing','paused','finishing'].includes(phase);this.input.active=phase==='playing';this.input.reset();this.weaponPickerOpen=false;this.el('weapon-picker').hidden=true;this.overlay.hidden=phase==='playing'||phase==='finishing';if(phase!=='playing')this.world.cursor.visible=false;}
  focusPrimary(){requestAnimationFrame(()=>this.overlay.querySelector<HTMLButtonElement>('.primary')?.focus({preventScroll:true}));}
  missionData(){return levelMission(this.mission,this.level);}
  route(){const frontier=this.save.cleared.indexOf(false);return MISSIONS.map((m,i)=>`<button class="route-item ${i===this.mission?'selected':''}" data-action="mission" data-value="${i}" ${frontier>=0&&i>frontier?'disabled':''}><span class="route-index">${this.save.cleared[i]?'✓':String(i+1).padStart(2,'0')}</span><span><small>${m.kind.toUpperCase()} · ${this.save.cleared[i]?3:i===this.save.mission?this.save.level:0}/3</small><strong>${m.name}</strong></span><span class="route-state">${frontier>=0&&i>frontier?'LOCKED':i===this.mission?'◂':'↗'}</span></button>`).join('');}
  settings(){return `<div class="settings"><button data-action="sound">SOUND <b>${this.save.sound?'ON':'OFF'}</b></button><button data-action="quality" aria-pressed="${this.save.low}" aria-describedby="graphics-help" ${this.qualityChanging?'disabled':''}>GRAPHICS <b>${this.qualityChanging?'LOADING…':this.save.low?'LOW DETAIL':'DETAILED'}</b></button><a href="./legacy.html">Original 2D ↗</a><small id="graphics-help" role="status">${this.qualityError?'Could not load graphics. Tap to retry.':'Low detail: simpler models · lower resolution'}</small></div>`;}
  controls(){return '<div class="control-guide"><span><kbd>W A S D</kbd> Drive</span><span><kbd>I J K L / MOUSE</kbd> Aim</span><span><kbd>SPACE / F / CLICK</kbd> Fire</span><span><kbd>C / 1–9</kbd> Switch gun</span><span><kbd>Q</kbd> Shield</span><span><kbd>E</kbd> Auto vehicle missile</span><span><kbd>R / T</kbd> Strike / Drop</span><span><kbd>ESC</kbd> Pause</span><p class="touch-guide">On touch: left stick drives; right stick aims and fires. Tap Switch Gun to choose a gun. Strike, Drop, Shield and Auto have separate buttons.</p></div>';}
  showMenu(){
    this.setPhase('menu');this.world.target.copy(this.player.visual.root.position);const m=this.missionData();
    this.overlay.innerHTML=`<main class="command-screen"><header class="brand"><span class="brand-mark">◈</span><span>KESTREL DIVISION<small>MERIDIAN RECOVERY COMMAND</small></span><span class="build-label">3D CAMPAIGN / 01</span></header><section class="hero"><span class="eyebrow">MERIDIAN CAMPAIGN</span><h1>STEEL<br><em>FRONT</em><span>LAST SIGNAL</span></h1></section><aside class="briefing panel"><div class="panel-top"><span class="eyebrow">STAGE ${String(this.mission+1).padStart(2,'0')} / ${MISSIONS.length}</span></div><h2>${m.name}</h2><div class="mission-task"><span>OBJECTIVE</span><strong>${m.objective}${this.level===2?` · ${mode(this.save.difficulty).bosses} boss${mode(this.save.difficulty).bosses>1?'es':''}`:''}</strong></div><div class="difficulty" aria-label="Difficulty">${DIFFICULTIES.map(d=>`<button data-action="difficulty" data-value="${d}" aria-pressed="${this.save.difficulty===d}" class="${this.save.difficulty===d?'active':''}">${MODES[d].label}</button>`).join('')}</div><small class="mode-hint">${mode(this.save.difficulty).hint}</small><div class="level-select" aria-label="Stage level">${LEVEL_NAMES.map((name,i)=>`<button data-action="level" data-value="${i}" aria-pressed="${i===this.level}" ${i>unlockedLevel(this.save,this.mission)?'disabled':''}>${i+1} · ${name}</button>`).join('')}</div><button class="primary deploy" data-action="deploy">DEPLOY <span>→</span></button><button class="hangar-button" data-action="hangar"><img src="${import.meta.env.BASE_URL}skins/${this.save.skin}.png" alt=""/><span>SKIN · ${getSkin(this.save.skin).name}<small>${getSkin(this.save.skin).bonus} · Change →</small></span></button><details><summary>Briefing & controls</summary><p class="briefing-copy">${m.briefing} ${m.kind==='defense'?'A repair stop sits off the relay approach.':`${this.world.layout.closed?'O loop: circle either way and return to the gate. The convoy follows your first branch.':`${this.world.layout.points.length===2?'Direct marked path':ROUTE_LABELS[this.world.layout.shape]} · follow the amber chevrons ${this.world.layout.direction} to the exit.`}`}</p>${this.controls()}<p class="manual">Tanks guard buildings and fuel; infantry watch from trees. Some squads patrol, with wider sweeps for tanks farther from the marked route. Solid cover blocks their view. Nearby squads react when they spot you or take a hit. Break sight to stop aimed fire. Front armor absorbs damage. Flank for stronger hits. Driving at speed can run down hostile infantry; a stationary tank cannot. Red lines warn of incoming fire. Amber marks the objective. Red mine circles show their 2.7 m trigger radius; ground units on either side set them off. Helicopters fly over cover and land to expose their core; use laser or arc rockets while they are airborne. Spiders climb cover and rest between attacks. Laser bosses warn before their beam burst. Vanguard fires four arm guns; Marshal and Atlas warn before paired missiles. Every boss keeps firing its light machine gun while its special weapon cycles; use cover to break its line of sight. Red drums and gasoline crates explode and can chain-react. Destroyed tanks have a 1-in-3 chance to leave medical, shield or weapon crates nearby, up to the mission loot limit. Later levels and harder modes have smaller drops. Most maps have one fixed repair stop. Riflemen and scout jeeps use light bullets; rocketeers remain dangerous. Green repair centers provide more healing. Repair pads remain marked with green crosses on the minimap. Cannon is available immediately; clear First Light for autocannon and Homeward for rockets. Tap Switch Gun to choose. Cyan and purple crates refill special ammo, normally capped at 12 laser shots or 6 arc rockets (Quartermaster: 15 / 8). Laser pierces enemies and one concrete barrier; the second stops it. Laser does not damage concrete. Four base cannon hits break one concrete section. Every weapon and tank system can be upgraded to level 20. The machine gun fires two rounds together, or four at weapon level 10. Micro missiles are smaller and faster. Triple Arc launches three rockets over cover, with only three volleys per mission. Ordinary arc crates do not refill Triple Arc. Flamethrower fires a 70° cone up to 12 m, with a two-second burn and 200 bursts per mission (Quartermaster: 250); solid cover blocks it. Buy it in the shop and select key 9 or Switch Gun. Later routes are longer. Breach two or three concrete rows for shortcuts. The remaining hills and volcanic rocks cannot be destroyed; drive around them. Clearing every hostile, including reserves, finishes any mission after the effects delay; the transport must survive. Otherwise, assault and boss stages can finish at the marked exit after their armor objective. Relay defense uses four finite waves from the perimeter; defeat them all. Escort the 1,040 HP transport home along the signs. Q shields both vehicles; shield pickups protect both too. Ambushes wait beyond the clear deployment area. Arc rockets fly over cover and blast both sides. Keys 1–9 (including the number pad) select weapons. Empty weapons select the next usable advanced slot to the right, then the nearest usable slot to the left if none remain. R calls Strike: up to six guided missiles, 90 base damage each, against hostiles within 64 m. Two Strike charges arrive on first deployment into each new background. Unused charges carry over; retries and revisits do not refill them. T calls a nearby supply drop. E fires one purchased Auto missile at a jeep, tank or boss within 42 m. A 40-credit pack holds six missiles for one deployment; unused rounds expire on sortie end or restart. Quartermaster adds 25% finite ammo, rounded up. Storm Kite uses four rotors and a warned three-missile pincer, then lands to expose its core. Missiles fly over cover and track moving targets, assigning at most two missiles per enemy. Direct support blasts spare Kestrel and the transport; fuel can still chain-react. No targets means no cooldown is spent. Every mission allows supply drops: two on Easy or Crazy, one on Normal or Hard. Drops share the 28-second missile cooldown and deliver a small medical, ammo or shield crate based on your needs.</p></details></aside><section class="campaign-route"><div class="route-heading"><span class="eyebrow">THE ROAD HOME</span><span>${this.save.cleared.filter(Boolean).length} / ${MISSIONS.length} COMPLETE</span></div><div class="route-list">${this.route()}</div></section><footer><button data-action="shop">SHOP · ${this.save.credits} CR</button>${this.settings()}<button class="quiet" data-action="reset-prompt">Reset campaign</button></footer>${this.saveWarning?'<p class="storage-warning">Browser storage is unavailable. Progress will last only for this session.</p>':''}</main>`;
    this.focusPrimary();
  }
  pause(){if(this.phase!=='playing')return;this.setPhase('paused');this.renderPause();}
  renderPause(){this.overlay.innerHTML=`<section class="panel pause-panel"><span class="eyebrow">UPLINK ON HOLD</span><h1>Take a breath.</h1><p>Ready when you are.</p><button class="primary" data-action="resume">RESUME OPERATION →</button><button data-action="retry">Restart this operation</button><button data-action="menu">Return to command</button><details><summary>Controls</summary>${this.controls()}</details>${this.settings()}</section>`;this.focusPrimary();}
  resume(){if(this.phase!=='paused'||this.qualityChanging)return;this.setPhase('playing');this.overlay.innerHTML='';this.last=performance.now();this.accumulator=0;}
  shopTab:'equipment'|'skins'='equipment';
  shopReturn:Phase='depot';
  async changeQuality(){
    if(this.qualityChanging||!['menu','paused'].includes(this.phase))return;
    this.qualityChanging=true;this.qualityError=false;
    const low=!this.save.low;
    const render=()=>{if(this.phase==='paused')this.renderPause();else this.showMenu();};
    render();this.overlay.querySelectorAll('button').forEach(button=>button.disabled=true);
    try{await this.world.load(low);this.world.settings(low);this.flame.render(this,0);this.world.update(0,this.player.visual.root.position,this.phase==='menu');this.save.low=low;this.persist();}
    catch{this.qualityError=true;}
    finally{this.qualityChanging=false;render();this.overlay.querySelector<HTMLButtonElement>('[data-action="quality"]')?.focus({preventScroll:true});}
  }
  menuAction(action:string,value?:string){
    if(this.qualityChanging)return;
    if(action==='hangar'&&this.phase==='menu'){this.shopReturn='menu';this.shopTab='skins';this.showShop();}
    if(action==='shop-tab'&&this.phase==='depot'&&(value==='skins'||value==='equipment')){this.shopTab=value;this.overlay.scrollTop=0;this.showShop();}
    if(action==='skin-buy'&&this.phase==='depot'&&buySkin(this.save,value??'')){this.persist();this.world.applySkin(this.player.visual.root,this.save.skin);this.showShop();}
    if(action==='skin-equip'&&this.phase==='depot'&&this.save.skins.includes(value??'')){this.save.skin=value!;this.persist();this.world.applySkin(this.player.visual.root,this.save.skin);this.showShop();}

    if(action==='shop'&&['menu','depot','victory'].includes(this.phase)){this.shopReturn=this.phase;this.shopTab='equipment';this.showShop();}
    if(action==='shop-back'&&this.phase==='depot'){if(this.shopReturn==='victory'){this.setPhase('victory');this.showVictory();}else if(this.shopReturn==='menu')this.showMenu();else this.showDepot();}
    if(action==='buy-auto'&&this.phase==='depot'&&buyAutoPack(this.save)){this.persist();this.tone(560,.08,.03);this.showShop();}
    if(action==='buy-weapon'&&this.phase==='depot'&&buyWeapon(this.save,Number(value))){this.persist();this.tone(560,.08,.03);this.showShop();}
    if(action==='upgrade-weapon'&&this.phase==='depot'&&upgradeWeapon(this.save,Number(value))){this.persist();this.tone(560,.08,.03);this.showShop();}
    if(action==='deploy')this.start(this.mission,this.level);
    if(action==='resume')this.resume();
    if(action==='retry')this.start(this.mission,this.level);
    if(action==='menu'){this.prepare(this.save.mission);this.showMenu();}
    if(action==='mission'){const i=Number(value),frontier=this.save.cleared.indexOf(false);if(Number.isInteger(i)&&i>=0&&i<MISSIONS.length&&(frontier<0||i<=frontier)){this.prepare(i);this.showMenu();}}
    if(action==='next'){this.prepare(this.save.mission);this.showMenu();}
    if(action==='level'&&this.phase==='menu'){const level=Number(value);if(Number.isInteger(level)&&level>=0&&level<=unlockedLevel(this.save,this.mission)){this.prepare(this.mission,level);this.showMenu();}}
    if(action==='difficulty'&&this.phase==='menu'){const selected=normalizeDifficulty(value);if(selected){this.save.difficulty=selected;this.persist();this.prepare(this.mission,this.level);this.showMenu();}}
    if(action==='sound'){this.save.sound=!this.save.sound;this.persist();if(this.save.sound)this.tone(440,.08,.05);if(this.phase==='paused')this.renderPause();else this.showMenu();}
    if(action==='quality')void this.changeQuality();
    if(action==='buy'&&this.phase==='depot')this.buy(value as Upgrade);
    if(action==='reset-prompt'){this.overlay.innerHTML='<section class="panel pause-panel"><span class="eyebrow">NEW CAMPAIGN</span><h1>Start a new road?</h1><p>This clears unlocked operations, credits and upgrades saved in this browser.</p><button class="primary" data-action="menu">KEEP MY CAMPAIGN</button><button data-action="reset">Reset and start over</button></section>';this.focusPrimary();}
    if(action==='reset'){const {sound,low}=this.save;this.save={...freshSave(),sound,low};this.persist();this.prepare(0);this.showMenu();}
  }
  canSpawnUnit(x:number,z:number,role:Unit['role'],kind:BossKind=bossKind(this.mission)){
    const player=role==='player',radius=role==='rifleman'||role==='rocketeer'?.55:role==='boss'?BOSS[kind].radius:1.25;
    return (!this.escortDeploying||player||escortStartClear(this.world.layout,{x,z}))&&Math.abs(x)<BOUNDS.x-radius&&Math.abs(z)<BOUNDS.z-radius&&!this.world.covers.some(c=>c.hp>0&&circleBox({x,z},radius,c))&&!this.world.activities.some(a=>a.kind==='mine'&&!a.spent&&distance({x,z},a)<MINE_TRIGGER_RADIUS+radius+.6)&&!this.enemies.some(e=>!e.dead&&!this.airborne(e)&&distance({x,z},e.visual.root.position)<radius+this.unitRadius(e)+.25)&&(!this.convoy||distance({x,z},this.convoy.position)>radius+2.3)&&(player||!this.player||this.navigation.next(this.world,{x,z},this.player.visual.root.position)!==null)&&(player||!this.player||distance({x,z},this.player.visual.root.position)>radius+3);
  }
  makeUnit(x:number,z:number,role:Unit['role'],kind:BossKind=bossKind(this.mission)):Unit{
    const boss=role==='boss',player=role==='player',infantry=role==='rifleman'||role==='rocketeer';
    const free=(px:number,pz:number)=>this.canSpawnUnit(px,pz,role,kind);
    if(!free(x,z)){const origin={x,z};search:for(let r=3;r<=120;r+=3)for(let a=0;a<16;a++){const px=origin.x+Math.cos(a*Math.PI/8)*r,pz=origin.z+Math.sin(a*Math.PI/8)*r;if(free(px,pz)){x=px;z=pz;break search;}}}
    const visual=this.world.tank(!player,boss,infantry?role:role==='jeep'?'scout-jeep':boss?'boss-'+kind:'tank');visual.root.position.set(x,0,z);if(boss){const core=visual.root.getObjectByName('Core');if(core)core.visible=false;}
    const difficulty=mode(this.save.difficulty).health;
    const hp=player?(240+this.save.upgrades.armor*65)*difficulty:boss?BOSS[kind].health:enemyHealth(role,this.mission,this.level);
    if(!free(x,z))throw new Error(`No free spawn for ${role}`);
    return {bossKind:boss?kind:undefined,velocity:{x:0,z:0},visual,hp,max:hp,heading:player?Math.PI:0,aim:player?Math.PI:0,cooldown:2+(this.enemies.length%3)*.8,role,dead:false};
  }
  defenseSpawn(i:number,role:Unit['role'],kind?:BossKind){const corners=[[-66,-52],[66,52],[66,-52],[-66,52]];const [x,z]=corners[i%4];return this.makeUnit(x,z,role,kind);}
  prepare(index:number,level=unlockedLevel(this.save,index)){
    this.level=clamp(level,0,2);const m=levelMission(index,this.level);
    this.finishDelay=0;this.finishDeadline=0;this.stageResult=null;
    this.airSupport.clear();this.hazards.reset(index);this.bosses.clear();this.flame.clear();this.special.clear();this.auto.clear();this.specialAmmo=ammoCaps(this.save.skin).map((cap,i)=>this.save.weapons.includes(WEAPONS.findIndex(w=>w.ammoSlot===i))?cap:0);this.infantryKills=0;this.fieldWeaponCount=1;this.artilleryCooldown=0;this.powerBoost=0;this.clearBarrage();this.mission=index;this.world.build(index,m.kind,this.level,this.save.difficulty);this.encounters.reset();this.salvageDrops=0;this.shots=[];this.enemies=[];this.convoy=null;this.convoyBlocked=false;this.convoyDistance=0;this.convoyReverse=null;this.world.loopReverse=false;
    this.elapsed=0;this.capture=0;this.kills=0;this.shotsFired=0;this.reload=0;this.weapon=this.save.equippedWeapon;this.shieldTime=0;this.shieldCooldown=0;this.relayHealth=300;this.convoyHealth=ESCORT.health;this.escortDeploying=false;
    const route=this.world.layout;this.player=this.makeUnit(route.spawn.x,route.spawn.z,'player');this.player.heading=this.player.aim=route.heading;this.world.applySkin(this.player.visual.root,this.save.skin);
    if(m.kind==='escort'){this.convoy=this.world.clone('transport');this.convoy.position.set(route.points[0].x,0,route.points[0].z);this.convoy.rotation.y=route.heading;this.world.entities.add(this.convoy);const field=this.world.shield.clone();field.name='ConvoyShield';field.position.set(0,1.1,0);field.scale.set(1.2,.9,1.6);field.visible=false;this.convoy.add(field);}
    const encounter=encounterSize(index,this.level,this.save.difficulty),count=encounter.armor,bosses=encounter.bosses;this.armoredGoal=count+bosses+encounter.jeeps;
    const escortMeters=m.kind==='escort'?escortEncounterMeters(route):null;this.escortDeploying=!!escortMeters;
    const deploy=(i:number,total:number,role:Unit['role'],kind?:BossKind)=>{
      const boss=role==='boss',group=boss?4:Math.round(i*3/Math.max(1,total-1)),fraction=boss?Math.max(.9,1-14/route.length):ENCOUNTER_FRACTIONS[group],meters=escortMeters?escortMeters[group]:route.length*fraction,p=routeSample(route.points,meters);
      const lateral=(i%2?1:-1)*(boss?6:4+Math.floor(i/8)%3*2.8),forward=boss?Math.floor(i/2)*7:(i%3-1)*4;
      const fallback={x:p.x+p.dz*lateral+p.dx*forward,z:p.z-p.dx*lateral+p.dz*forward},post=boss||m.kind==='defense'?fallback:guardPost(this,p,fallback,role,i,group);
      const unit=m.kind==='defense'?this.defenseSpawn(i+(boss?count+encounter.infantry:role==='rifleman'||role==='rocketeer'?count:0),role,kind):this.makeUnit(post.x,post.z,role,kind);
      const facing=m.kind==='defense'?{x:-unit.visual.root.position.x,z:-13-unit.visual.root.position.z}:{x:-p.dx,z:-p.dz};unit.heading=unit.aim=Math.atan2(facing.x,facing.z);
      unit.encounter={group,anchor:{x:p.x,z:p.z},meters,active:false,...(m.kind==='defense'?{wakeAt:Math.min(3,group)*4}:{})};this.enemies.push(unit);
    };
    for(let i=0;i<count;i++)deploy(i,count,index>=4&&i%2===0?'heavy':i%3===1?'sentry':'raider');
    const primary=bossKind(index),reinforcements:BossKind[]=index>=10?['quadcopter','quad-mech','siege-mech','missile-truck','helicopter','spider','laser']:['helicopter','spider','laser'];const kinds:BossKind[]=[primary,...(index>=10?reinforcements.filter(kind=>kind!==primary):reinforcements)];for(let i=0;i<bosses;i++)deploy(i,bosses,'boss',kinds[i]);
    for(let i=0;i<encounter.riflemen;i++)deploy(i,encounter.riflemen,'rifleman');
    for(let i=0;i<encounter.rocketeers;i++)deploy(i,encounter.rocketeers,'rocketeer');
    for(let i=0;i<encounter.jeeps;i++)deploy(i,encounter.jeeps,'jeep');
    this.escortDeploying=false;this.enemies.forEach((u,i)=>assignPatrol(this,u,i));
    this.world.shield.visible=false;this.world.cursor.visible=false;
    this.syncVisual(this.player);this.enemies.forEach(e=>this.syncVisual(e));this.updateHud();
  }
  start(index:number,level=unlockedLevel(this.save,index)){this.prepare(index,level);grantBackgroundStrikes(this.save,index);this.auto.ammo=ammoCapacity(this.save.skin,this.save.autoPack);this.save.autoPack=0;this.persist();this.setPhase('playing');this.world.target.copy(this.player.visual.root.position);const offset=this.world.cameraOffset(this.player.visual.root.position);this.world.target.x+=offset.x;this.world.target.z+=offset.z;this.world.update(0,this.player.visual.root.position);this.updateHud();this.overlay.innerHTML='';this.radioMessage(index===0?'IVO / Tap SWITCH GUN or press C. Tank wrecks may refill special weapons.':this.missionData().radio,9);this.last=performance.now();this.accumulator=0;this.tone(360,.12,.05);}
  action(action:string){
    if(this.phase!=='playing')return;
    if(action==='fire'&&this.reload<=0){this.input.pendingFire=false;this.syncVisual(this.player);this.shoot(this.player,true);}
    if((action==='support-strike'||action==='artillery')&&this.artilleryCooldown<=0){this.callArtillery();}
    if(action==='support-drop')this.airSupport.request(this);
    if(action==='shield'&&this.shieldCooldown<=0){this.shieldTime=Math.max(this.shieldTime,getSkin(this.save.skin).shield+shieldBonus(this.save));this.shieldCooldown=upgradedShieldCooldown(this.save);this.radioMessage(`KESTREL / ${this.convoy?'Both vehicles shielded':'Protective field active'} · ${this.shieldTime.toFixed(1)}s of cover.`,3);this.tone(620,.2,.04);}
    if(action==='auto')this.auto.fire(this);
    if(action==='switch'){this.weaponPickerOpen=!this.weaponPickerOpen;}
    if(/^[1-9]$/.test(action)){const w=Number(action)-1;if(this.weaponAvailable(w)){this.weapon=w;this.weaponPickerOpen=false;if(ownsWeapon(this.save,w)){this.save.equippedWeapon=w;this.persist();}}else if(w>=3)this.radioMessage(w===8?'ARMORY / Flamethrower fuel refills next mission. Buy in the shop.':w===7?'ARMORY / Triple arc: buy in the shop. Three volleys refill next mission.':ownsWeapon(this.save,w)?'ARMORY / Ammo empty. Collect a map cache or resupply next mission.':w>=5?'ARMORY / Buy this weapon in the shop.':'ARMORY / Buy in the shop or collect a map cache.',3);else this.radioMessage(`ARMORY / ${w===1?'Autocannon unlocks after First Light.':'Rockets unlock after Homeward.'}`,3);}
    this.updateHud();
  }
  isInfantry(unit:Unit){return unit.role==='rifleman'||unit.role==='rocketeer';}
  unitRadius(unit:Unit){return this.isInfantry(unit)?.55:unit.role==='boss'?BOSS[unit.bossKind??bossKind(this.mission)].radius:1.25;}
  weaponAvailable(w:number){const info=WEAPONS[w];if(!info)return false;if(info.ammoSlot!==undefined)return (this.specialAmmo[info.ammoSlot]??0)>0;return w<3?w<Math.max(this.fieldWeaponCount,weaponCount(this.save)):ownsWeapon(this.save,w);}
  playerDamageMultiplier(w=this.weapon){return (powerMultiplier(this.save)+(this.powerBoost>0?.35:0))*getSkin(this.save.skin).damage*weaponDamage(this.save,w);}
  weaponStats(){return WEAPONS[this.weapon];}
  reloadDuration(){return reloadSeconds(this.save,this.weapon);}
  moveUnit(unit:Unit,dx:number,dz:number,dt=1/60){
    if(unit.dead||dt<=0)return;
    if(this.hazards.quaking&&!this.isInfantry(unit)){unit.velocity.x=unit.velocity.z=0;unit.visual.root.userData.walking=false;return;}
    const p=unit.visual.root.position,r=this.unitRadius(unit),previous=p.clone();
    const mud=this.world.terrainKind(p)==='mud';unit.mudTime=mud?(unit.mudTime??0)+dt:0;
    const recovery=mud&&(unit.mudTime??0)%4>2.8;
    const motion=tractionMotion(this.world.firmRoad(p)?'grove':this.world.environment.biome,p,unit.velocity,dx,dz,dt,recovery);
    if(!this.isInfantry(unit))p.y+=((mud&&!recovery?-.45:0)-p.y)*Math.min(1,dt*4);
    // Short accepted segments preserve wall sliding and prevent contact through cover.
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(motion.x),Math.abs(motion.z))/.35)),sx=motion.x/steps,sz=motion.z/steps,stepTime=dt/steps;
    const candidateCrush=unit===this.player&&this.phase==='playing'&&Math.hypot(motion.x,motion.z)/dt>=3;
    const blocked=(x:number,z:number,ignoreInfantry:boolean)=>this.world.covers.some(c=>c.hp>0&&circleBox({x,z},r,c))||[this.player,...this.enemies].some(other=>other!==unit&&!other.dead&&!this.airborne(other)&&!(ignoreInfantry&&this.isInfantry(other))&&distance({x,z},other.visual.root.position)<this.unitRadius(other)+r)||!!(this.convoy&&distance({x,z},this.convoy.position)<2.3);
    for(let i=0;i<steps;i++){
      const from={x:p.x,z:p.z};
      const resolve=(ignoreInfantry:boolean)=>{let x=clamp(from.x+sx,-BOUNDS.x,BOUNDS.x),z=clamp(from.z+sz,-BOUNDS.z,BOUNDS.z);if(blocked(x,from.z,ignoreInfantry))x=from.x;if(blocked(x,z,ignoreInfantry))z=from.z;return {x,z};};
      let to=resolve(candidateCrush);const crushing=candidateCrush&&distance(from,to)/stepTime>=3;
      if(candidateCrush&&!crushing)to=resolve(false);
      p.set(to.x,p.y,to.z);
      if(to.x!==from.x+sx)unit.velocity.x=0;if(to.z!==from.z+sz)unit.velocity.z=0;
      if(crushing){const corner={x:to.x,z:from.z};for(const other of this.enemies){if(other.dead||!this.isInfantry(other))continue;
        const radius=r+this.unitRadius(other)*.7,target=other.visual.root.position;
        if(segmentCircle(from,corner,target,radius)!==null||segmentCircle(corner,to,target,radius)!==null){this.damageUnit(other,other.hp+1,from);this.radioMessage('TRACK CONTACT / Hostile infantry neutralized.',2);}
      }}
    }
    unit.visual.root.userData.walking=p.distanceToSquared(previous)>.000001;
  }
  syncVisual(unit:Unit){
    if(this.isInfantry(unit)){const swing=unit.visual.root.userData.walking?Math.sin(this.elapsed*9)*.5:0;for(const [name,sign] of [['LeftLeg',1],['RightLeg',-1]] as const){const leg=unit.visual.root.getObjectByName(name);if(leg)leg.rotation.x=swing*sign;}}
    if(unit.role==='jeep'&&unit.visual.root.userData.walking)for(const name of ['WheelFL','WheelFR','WheelRL','WheelRR']){const wheel=unit.visual.root.getObjectByName(name);if(wheel)wheel.rotation.x=-this.elapsed*7;}
    unit.visual.hull.rotation.y=unit.heading;unit.visual.turret.rotation.y=unit.aim;
    unit.visual.bar.scale.x=Math.max(.001,unit.hp/unit.max);unit.visual.bar.visible=!unit.dead;
    unit.visual.root.visible=!unit.dead;
  }
  private selectFallbackWeapon(){
    // Automatic fallback must not replace the preferred loadout for the next mission.
    // Prefer the next available advanced slot, then the nearest usable lower slot.
    let next=this.weapon+1;while(next<WEAPONS.length&&!this.weaponAvailable(next))next++;
    if(next===WEAPONS.length){next=this.weapon-1;while(next>0&&!this.weaponAvailable(next))next--;}
    this.weapon=Math.max(0,next);
    this.radioMessage(`ARMORY / Ammo empty. ${WEAPONS[this.weapon].name} selected.`,3);
  }
  shoot(unit:Unit,friendly:boolean){
    const info=WEAPONS[this.weapon],ammo=info.ammoSlot;
    if(friendly&&ammo!==undefined){
      if(!this.weaponAvailable(this.weapon)){this.selectFallbackWeapon();this.updateHud();return;}
      this.specialAmmo[ammo]--;this.reload=this.reloadDuration();if(info.flame)this.flame.fire(this);else this.special.fire(this,this.weapon);this.shotsFired++;
      if(this.specialAmmo[ammo]===0)this.selectFallbackWeapon();this.updateHud();return;
    }
    const stats=friendly?info:{damage:unit.role==='rifleman'||unit.role==='jeep'?3:unit.role==='rocketeer'?24:unit.role==='boss'?33:unit.role==='heavy'?24:15,speed:unit.role==='rifleman'||unit.role==='jeep'?44:unit.role==='boss'?32:25,splash:unit.role==='rocketeer'?2.5:0};
    const rocket=friendly?info.rocket:unit.role==='rocketeer',count=friendly?barrels(this.save,this.weapon):1;
    unit.visual.root.updateMatrixWorld(true);const p=unit.visual.root.position;
    for(let i=0;i<count;i++){
      const offset=(i-(count-1)/2)*.36,heading=unit.aim+(count>1?(i-(count-1)/2)*.016:0),direction=new T.Vector3(Math.sin(heading),0,Math.cos(heading));
      const mesh=rocket?this.world.rocket():new T.Mesh(this.projectileGeometry,this.projectileMaterials[friendly?([1,5].includes(this.weapon)?2:0):1]);mesh.rotation.y=heading;
      if(!rocket){const trail=new T.Mesh(this.trailGeometry,this.trailMaterial);trail.position.z=-1.6;mesh.add(trail);}
      if(friendly&&[1,5].includes(this.weapon))mesh.scale.set(this.weapon===5?.32:.5,this.weapon===5?.32:.5,.6);
      if(unit.role==='rifleman'||unit.role==='jeep')mesh.scale.set(.35,.35,.5);if(rocket)mesh.scale.setScalar(friendly?(this.weapon===6?.65:1.2):.85);
      unit.visual.muzzle.getWorldPosition(mesh.position);mesh.position.x+=Math.cos(unit.aim)*offset;mesh.position.z-=Math.sin(unit.aim)*offset;this.world.entities.add(mesh);
      this.shots.push({mesh,p:{x:p.x,z:p.z},from:{x:p.x,z:p.z},dx:direction.x,dz:direction.z,speed:stats.speed,damage:stats.damage*(friendly?this.playerDamageMultiplier():1),life:unit.role==='rifleman'||unit.role==='jeep'?.9:2.5,friendly,splash:stats.splash});
      if(unit.role==='rifleman'||unit.role==='jeep'||friendly&&this.weapon===5)this.world.fx.emit(mesh.position.clone(),'flash',0xffd494,.3,.07);else this.world.fx.muzzle(mesh.position,heading,!!rocket);
    }
    if(friendly){this.shotsFired++;this.reload=this.reloadDuration();this.tone([1,5].includes(this.weapon)?110:65,.1,.05);}
    unit.visual.turret.position.y=this.isInfantry(unit)?1.2:unit.role==='jeep'?1.635:1.10;
  }
  bossRound(unit:Unit,heading:number,damage:number,muzzleName='LightMuzzle',speed=38){
    if(unit.dead||this.phase!=='playing')return;
    const muzzle=unit.visual.root.getObjectByName(muzzleName);if(!muzzle)return;
    unit.visual.root.updateMatrixWorld(true);const mesh=new T.Mesh(this.projectileGeometry,this.projectileMaterials[1]);muzzle.getWorldPosition(mesh.position);mesh.rotation.y=heading;mesh.scale.set(.45,.45,.65);this.world.entities.add(mesh);
    const p={x:mesh.position.x,z:mesh.position.z},center=unit.visual.root.position,aimRange=Math.max(5,distance(center,this.player.visual.root.position)),target={x:center.x+Math.sin(heading)*aimRange,z:center.z+Math.cos(heading)*aimRange},range=Math.max(5,distance(p,target)),shotHeading=Math.atan2(target.x-p.x,target.z-p.z);mesh.rotation.y=shotHeading;
    this.shots.push({mesh,p,from:{...p},dx:Math.sin(shotHeading),dz:Math.cos(shotHeading),damage,speed,life:42/speed,friendly:false,splash:0,height:{start:mesh.position.y,range,traveled:0}});if(muzzleName==='LightMuzzle')this.world.fx.emit(mesh.position.clone(),'flash',0xffd494,.3,.07);else this.world.fx.muzzle(mesh.position,shotHeading,false);
  }
  updatePlayer(dt:number){
    const movement=this.input.movement(),length=Math.hypot(movement.x,movement.z);
    if(this.world.layout.closed&&length>.2){const route=routeSample(this.world.layout.points,projectRoute(this.world.layout.points,this.player.visual.root.position).progress);const dot=movement.x*route.dx+movement.z*route.dz;if(Math.abs(dot)>.2)this.world.loopReverse=dot<0;}
    if(length>.06){const dx=movement.x/Math.max(1,length),dz=movement.z/Math.max(1,length);this.moveUnit(this.player,dx*9*getSkin(this.save.skin).speed*engineMultiplier(this.save)*dt,dz*9*getSkin(this.save.skin).speed*engineMultiplier(this.save)*dt,dt);this.player.heading=turnToward(this.player.heading,Math.atan2(dx,dz),dt*4.5);}else this.moveUnit(this.player,0,0,dt);
    const p=this.player.visual.root.position;
    const aimX=Number(this.input.keys.has('KeyL'))-Number(this.input.keys.has('KeyJ')),aimZ=Number(this.input.keys.has('KeyK'))-Number(this.input.keys.has('KeyI'));
    if(aimX||aimZ){const length=Math.hypot(aimX,aimZ);this.input.aim={x:aimX/length,z:aimZ/length};this.input.hasTouchAim=true;}
    if(this.input.touchAiming||this.input.hasTouchAim)this.aimPoint.set(p.x+this.input.aim.x*28,0,p.z+this.input.aim.z*28);
    else if(this.input.hasMouse){this.ray.setFromCamera(this.input.mouse,this.world.camera);this.ray.ray.intersectPlane(this.plane,this.aimPoint);}
    else this.aimPoint.set(p.x+Math.sin(this.player.heading)*15,0,p.z+Math.cos(this.player.heading)*15);
    if(WEAPONS[this.weapon].arc){const target=rocketTarget(p,this.aimPoint,this.enemies.filter(e=>!e.dead).map(e=>e.visual.root.position),this.input.touchAiming||this.input.hasTouchAim);this.aimPoint.set(target.x,0,target.z);}
    if(WEAPONS[this.weapon].flame){const dx=this.aimPoint.x-p.x,dz=this.aimPoint.z-p.z,r=Math.hypot(dx,dz);if(r>FLAME.range)this.aimPoint.set(p.x+dx/r*FLAME.range,0,p.z+dz/r*FLAME.range);}
    this.player.aim=turnToward(this.player.aim,Math.atan2(this.aimPoint.x-p.x,this.aimPoint.z-p.z),dt*9);
    const blast=WEAPONS[this.weapon].splash;this.world.cursor.scale.setScalar(blast?blast/.78:1);(this.world.cursor.material as T.MeshBasicMaterial).color.setHex(WEAPONS[this.weapon].flame?0xff8b35:WEAPONS[this.weapon].arc?0xc392ff:blast?0xffbb78:0xc0ffdf);
    this.world.cursor.visible=true;this.world.cursor.position.set(this.aimPoint.x,.07,this.aimPoint.z);
    this.reload=Math.max(0,this.reload-dt);this.shieldTime=Math.max(0,this.shieldTime-dt);this.shieldCooldown=Math.max(0,this.shieldCooldown-dt);
    this.world.shield.visible=this.shieldTime>0;this.world.shield.position.copy(p).y=1;const convoyShield=this.convoy?.getObjectByName('ConvoyShield');if(convoyShield)convoyShield.visible=this.shieldTime>0;
    if((this.input.pendingFire||this.input.firing||this.input.touchFiring||this.input.keys.has('Space')||this.input.keys.has('KeyF'))&&this.reload<=0){this.input.pendingFire=false;this.syncVisual(this.player);this.shoot(this.player,true);}
  }
  updateEnemies(dt:number){
    const m=this.missionData(),playerPos=this.player.visual.root.position;
    this.encounters.update(this);
    for(let i=0;i<this.enemies.length;i++){
      const e=this.enemies[i];if(e.dead)continue;if(e.encounter&&!e.encounter.active){updatePatrol(this,e,dt);continue;}if(e.role==='boss'){this.bosses.update(this,e,dt);continue;}
      const p=e.visual.root.position;e.visual.root.userData.walking=false;
      const playerVisible=seesTarget(this,e,playerPos),convoyVisible=!!this.convoy&&seesTarget(this,e,this.convoy.position);
      let target:Point|undefined,objectiveTarget=false;
      if(playerVisible)target=playerPos;
      if(convoyVisible&&(!target||distance(p,this.convoy!.position)<distance(p,target)+3))target=this.convoy!.position;
      if(target){e.lastSeen={x:target.x,z:target.z};e.searchUntil=this.elapsed+6;}
      else if(m.kind==='defense'||m.kind==='capture'){target={x:0,z:-13};objectiveTarget=true;}
      else if(e.lastSeen&&(e.searchUntil??0)>this.elapsed&&distance(p,e.lastSeen)>2)target=e.lastSeen;
      if(!target){e.cooldown=Math.max(e.cooldown,AIM_WARNING_SECONDS);if(e.patrol&&e.encounter){e.encounter.active=false;e.patrol.index=0;e.patrol.returning=true;e.patrol.wait=.6;e.patrol.waypoint=undefined;}e.visual.beam.visible=false;this.moveUnit(e,0,0,dt);this.syncVisual(e);continue;}
      const investigating=target===e.lastSeen,capturing=objectiveTarget&&m.kind==='capture';
      const dist=distance(p,target),desired=Math.atan2(target.x-p.x,target.z-p.z);
      e.aim=turnToward(e.aim,desired,dt*2);
      const obstruction=this.world.covers.some(c=>c.hp>0&&segmentBox(p,target,c,this.unitRadius(e)+.2)!==null);
      if(e.role!=='sentry'||dist>26||obstruction){
        const advance=dist>(investigating?2:capturing?4:17)||obstruction?1:dist<10&&!investigating&&!capturing?-.55:0;
        const side=investigating||capturing?0:e.role==='raider'?.5:obstruction?.7:0;
        const detour=obstruction?this.navigation.next(this.world,p,target):null;
        const direction=detour?Math.atan2(detour.x-p.x,detour.z-p.z):desired+Math.sin(this.elapsed*.8+i)*.2;
        const speed=this.isInfantry(e)?2.4:e.role==='heavy'?2.9:e.role==='jeep'?4.8:4;
        const dx=(Math.sin(direction)*advance+Math.cos(direction)*(detour?0:side))*speed*dt,dz=(Math.cos(direction)*advance-Math.sin(direction)*(detour?0:side))*speed*dt;
        this.moveUnit(e,dx,dz,dt);if(Math.abs(dx)+Math.abs(dz)>.001)e.heading=turnToward(e.heading,Math.atan2(dx,dz),dt*2);
      }
      if(e.role==='sentry'&&dist<=26&&!obstruction&&terrainAt(this.world.environment.biome,p)==='ice')this.moveUnit(e,0,0,dt);
      const canFire=(target===playerPos||target===this.convoy?.position||objectiveTarget&&!capturing)&&clearSight(this,p,target);
      const range=objectiveTarget?24:38;
      if(dist<range&&canFire)e.cooldown-=dt;else e.cooldown=Math.max(e.cooldown,AIM_WARNING_SECONDS);
      const beam=e.visual.beam;beam.visible=canFire&&e.cooldown<AIM_WARNING_SECONDS&&dist<range;beam.scale.z=dist;beam.position.set(p.x+Math.sin(e.aim)*dist/2,.12,p.z+Math.cos(e.aim)*dist/2);beam.rotation.y=e.aim;
      this.syncVisual(e);
      if(e.cooldown<=0&&dist<range&&canFire){this.shoot(e,false);e.cooldown=e.role==='jeep'?((e.burstLeft=(e.burstLeft??3)-1)>0?.16:(e.burstLeft=3,1.4)):e.role==='rifleman'?1.1:e.role==='rocketeer'?3.5:e.role==='sentry'?2.6:3.1;}
    }
  }
  airborne(unit:Unit){return (unit.bossKind==='helicopter'||unit.bossKind==='quadcopter')&&unit.visual.root.position.y>2;}
  damageUnit(unit:Unit,damage:number,source:Point,antiAir=false,hitEffect=true){
    if(this.airborne(unit)&&!antiAir)return;
    if(unit.dead||unit===this.player&&this.shieldTime>0)return;
    if(unit!==this.player&&damage>0)this.encounters.alert(this,unit,source);
    const multiplier=this.isInfantry(unit)||unit.role==='jeep'?1:armorMultiplier(unit.visual.root.position,unit.heading,source);
    unit.hp-=damage*multiplier*(unit.role==='boss'?this.bosses.multiplier(unit):1);
    const impact=unit.visual.root.position.clone();impact.y+=1.4;if(hitEffect)this.world.fx.impact(impact);
    if(unit===this.player){this.hurtTimer=.2;this.tone(45,.07,.03);}
    if(unit.hp<=0){unit.hp=0;unit.dead=true;if(unit.role==='boss')this.bosses.cancel(unit);unit.visual.beam.visible=false;if(this.isInfantry(unit)){this.infantryKills++;this.world.burst(unit.visual.root.position,2,5);}else this.world.destroyTank(unit.visual);this.tone(45,.22,.06);
      if(unit!==this.player&&!this.isInfantry(unit)){this.kills++;if(unit.role!=='jeep')this.dropSalvage(unit.visual.root.position);
      }
      this.syncVisual(unit);
    }
  }
  dropSalvage(source:Point){
    if(this.salvageDrops>=mode(this.save.difficulty).salvageLimit||this.lootRandom()>=DROP_CHANCE)return;
    const reward=salvageReward(this.lootRandom(),this.save.difficulty,this.level);
    for(const radius of [0,2,4,6,8])for(let i=0;i<(radius?12:1);i++){
      const p={x:source.x+Math.cos(i*Math.PI/6)*radius,z:source.z+Math.sin(i*Math.PI/6)*radius};
      if(Math.abs(p.x)>68||Math.abs(p.z)>56||this.world.covers.some(c=>c.hp>0&&(circleBox(p,2.85,c)||segmentBox(source,p,c,1.3)!==null))||this.world.activities.some(a=>!a.spent&&distance(a,p)<(a.kind==='mine'?6:3.5))||this.navigation.next(this.world,p,this.player.visual.root.position)===null)continue;
      this.salvageDrops++;this.world.activities.push(createActivity(this.world.arena,reward.kind,p.x,p.z,reward.amount));this.world.fx.emit(new T.Vector3(p.x,.7,p.z),'flash',0x8fffd4,1,.3);this.radioMessage(`SALVAGE / ${reward.kind==='arc'?'Arc rockets':reward.kind==='laser'?'Laser ammo':reward.kind==='health'?'Medical case':'Shield'} beside the wreck.`,3);return;
    }
  }
  hitCover(cover:Cover,damage:number,laser=false,hitEffect=true){
    if(cover.hp<=0||laser&&isConcrete(cover))return;
    cover.hp-=damage;this.world.updateConcrete(cover);
    const surface=cover.kind==='barrel'||cover.kind==='fuelcrate'?'fuel':['pine','white-pine','palm','jungle-tree','house','crate'].includes(cover.kind)?'wood':['barricade','stonewall','hill','glacier','volcano','volcanic-rock','cityblock'].includes(cover.kind)?'stone':'metal';
    if(hitEffect||cover.hp<=0)this.world.fx.surface(cover.mesh.position.clone().setY(.7),surface,cover.hp<=0);
    if(cover.hp<=0){cover.mesh.visible=false;this.world.navigationRevision++;
if(cover.kind==='barrel'||cover.kind==='fuelcrate'){this.explode(cover,cover.kind==='fuelcrate'?7:5,cover.kind==='fuelcrate'?110:65);}}
  }
  damageConvoy(damage:number){
    if(!this.convoy||this.convoyHealth<=0||this.shieldTime>0||damage<=0)return;
    this.convoyHealth=Math.max(0,this.convoyHealth-damage);this.world.burst(this.convoy.position,1,5);
  }
  explode(p:Point,radius:number,damage:number,antiAir=false,alliedSafe=false){
    for(const unit of alliedSafe?this.enemies:[this.player,...this.enemies])if(!unit.dead&&distance(p,unit.visual.root.position)<radius)this.damageUnit(unit,damage*(1-distance(p,unit.visual.root.position)/radius*.6),p,antiAir);
    for(const cover of this.world.covers)if(cover.hp>0&&Number.isFinite(cover.hp)&&circleBox(p,radius,cover))this.hitCover(cover,damage);
    if(!alliedSafe&&this.convoy&&distance(p,this.convoy.position)<radius)this.damageConvoy(damage*.5);
  }
  updateShots(dt:number){
    for(let i=this.shots.length-1;i>=0;i--){
      const s=this.shots[i];s.life-=dt;
      const b={x:s.mesh.position.x+s.dx*s.speed*dt,z:s.mesh.position.z+s.dz*s.speed*dt};
      let first=Infinity,hit:(()=>void)|null=null;
      for(const c of this.world.covers){if(c.hp<=0)continue;const t=segmentBox(s.p,b,c,.12);if(t!==null&&t<first){first=t;hit=()=>this.hitCover(c,s.damage);}}
      for(const unit of s.friendly?this.enemies:[this.player]){if(unit.dead||this.airborne(unit))continue;const t=segmentCircle(s.p,b,unit.visual.root.position,this.unitRadius(unit));if(t!==null&&t<first){first=t;hit=()=>this.damageUnit(unit,s.damage,s.from);}}
      if(!s.friendly){
        if(this.convoy){const t=segmentCircle(s.p,b,this.convoy.position,1.9);if(t!==null&&t<first){first=t;hit=()=>{this.damageConvoy(s.damage);};}}
        if(this.missionData().kind==='defense'){const t=segmentCircle(s.p,b,{x:0,z:-13},1.4);if(t!==null&&t<first){first=t;hit=()=>{this.relayHealth-=s.damage;};}}
      }
      if(hit){const impact={x:s.p.x+(b.x-s.p.x)*first,z:s.p.z+(b.z-s.p.z)*first};hit();this.world.fx.impact(new T.Vector3(impact.x,1.2,impact.z),s.splash>0);if(s.splash)this.explode(impact,s.splash,s.damage*(s.friendly?.7:.55));s.life=0;}
      if(s.height)s.height.traveled+=s.speed*dt;const height=s.height?s.height.start+(1.4-s.height.start)*clamp(s.height.traveled/s.height.range,0,1):1.4;
      s.p=b;s.mesh.position.set(b.x,height,b.z);if(s.mesh.userData.rocket&&this.trailClock<=0)this.world.rocketTrail(s.mesh);
      if(s.life<=0||Math.abs(b.x)>BOUNDS.x+8||Math.abs(b.z)>BOUNDS.z+8){s.mesh.removeFromParent();this.shots.splice(i,1);}
    }
  }
  clearBarrage(){this.guided.clear();}
  callArtillery(){return this.guided.call(this);}
  updateActivities(dt:number){
    if(this.player.dead)return;
    this.artilleryCooldown=Math.max(0,this.artilleryCooldown-dt);this.powerBoost=Math.max(0,this.powerBoost-dt);this.airSupport.update(this,dt);this.auto.update(this,dt);
    const p=this.player.visual.root.position;
    this.dustClock-=dt;
    if(this.dustClock<=0){
      this.dustClock=this.world.low?.3:.12;
      const movement=this.input.movement();
      if(Math.hypot(movement.x,movement.z)>.2){const dust=p.clone();dust.y=.15;dust.x-=Math.sin(this.player.heading)*1.8;dust.z-=Math.cos(this.player.heading)*1.8;this.world.fx.smoke(dust,.85,0xb5a17c);}
      for(const unit of [this.player,...this.enemies])if(!unit.dead&&unit.hp<unit.max*.35)this.world.fx.smoke(unit.visual.root.position.clone().setY(unit.visual.root.position.y+1.6),.8);
    }
    for(const activity of this.world.activities){
      if(activity.spent||activity.airborne)continue;
      const near=distance(p,activity);
      if(activity.kind==='repair'&&!this.player.dead&&near<3&&this.player.hp<this.player.max){
        const heal=Math.min(32*dt,this.player.max-this.player.hp,activity.remaining);this.player.hp+=heal;activity.remaining-=heal;
        if(this.trailClock<=0)this.world.fx.emit(p.clone().setY(1),'flash',0x81ffbf,2,.25);
        if(activity.remaining<=0){activity.spent=true;activity.mesh.visible=false;}
      }
      if(activity.kind==='health'&&near<2.5&&this.player.hp<this.player.max){const healed=Math.min(activity.amount,this.player.max-this.player.hp);this.player.hp+=healed;activity.spent=true;activity.mesh.visible=false;this.world.burst(p,3,8);this.radioMessage(`MEDICAL / Hull restored +${Math.ceil(healed)}.`,3);}
      if(activity.kind==='shield'&&near<2.5){this.shieldTime=Math.max(this.shieldTime,activity.amount);activity.spent=true;activity.mesh.visible=false;this.world.burst(p,3,8);this.radioMessage(`SHIELD / Field active ${activity.amount}s.`,3);}
      if((activity.kind==='laser'||activity.kind==='arc')&&near<2.5&&this.specialAmmo[activity.kind==='laser'?0:1]<ammoCaps(this.save.skin)[activity.kind==='laser'?0:1]){activity.spent=true;activity.mesh.visible=false;const w=activity.kind==='laser'?3:4;const added=Math.min(activity.amount,ammoCaps(this.save.skin)[w-3]-this.specialAmmo[w-3]);this.specialAmmo[w-3]+=added;this.weapon=w;this.reload=0;this.world.burst(p,3);this.radioMessage(`ARMORY / +${added} ${w===3?'laser shots':'arc rockets'}. ${w===3?'Pierces 1 concrete.':'Flies over cover.'}`,4);}
      if(activity.kind==='supply'&&near<2.5){activity.spent=true;activity.mesh.visible=false;this.powerBoost=25;this.fieldWeaponCount=3;this.weapon=2;this.artilleryCooldown=0;this.world.burst(p,3);this.radioMessage('SUPPLY / Rockets ready. Radio cooldown cleared. Damage boost: 25s.',4);}
      if(activity.kind==='mine'&&[this.player,...this.enemies].some(u=>!u.dead&&u.visual.root.position.y<2&&distance(u.visual.root.position,activity)<MINE_TRIGGER_RADIUS)){
        activity.spent=true;activity.mesh.visible=false;this.world.fx.impact(new T.Vector3(activity.x,.4,activity.z),true);this.explode(activity,4.5,85);
      }
    }
    this.guided.update(this,dt);
  }
  convoyPath(){return this.convoyReverse?[...this.world.layout.points].reverse():this.world.layout.points;}
  updateConvoy(dt:number){
    if(!this.convoy||this.hazards.quaking||distance(this.player.visual.root.position,this.convoy.position)>=12)return;
    if(this.world.layout.closed&&this.convoyReverse===null){const start=this.world.layout.points[0],player=this.player.visual.root.position;if(Math.abs(player.x-start.x)<3||Math.abs(player.z-start.z)>9)return;this.convoyReverse=player.x<start.x;this.radioMessage(this.convoyReverse?'CONVOY / Taking the left branch.':'CONVOY / Taking the right branch.',3);}
    const points=this.convoyPath();
    let travel=Math.min(dt*3.4*this.world.groundSpeed(this.convoy.position),this.world.layout.length-this.convoyDistance);
    // Swept short steps cannot cut corners, tunnel through cover, or skip blocked units.
    while(travel>1e-6){
      let boundary=0;for(let i=1;i<points.length;i++){boundary+=distance(points[i-1],points[i]);if(boundary>this.convoyDistance+1e-6)break;}
      const step=Math.min(.25,travel,boundary-this.convoyDistance),next=alongRoute(points,this.convoyDistance+step),p=this.convoy.position;
      this.convoyBlocked=this.world.covers.some(c=>c.hp>0&&segmentBox(p,next,c,2.3)!==null)||[this.player,...this.enemies].some(u=>!u.dead&&!this.airborne(u)&&distance(next,u.visual.root.position)<2.6&&distance(next,u.visual.root.position)<distance(p,u.visual.root.position));
      if(this.convoyBlocked||step<=0)break;
      this.convoy.rotation.y=turnToward(this.convoy.rotation.y,Math.atan2(next.x-p.x,next.z-p.z),dt*4);
      p.set(next.x,0,next.z);this.convoyDistance+=step;travel-=step;
      if(distance(this.player.visual.root.position,p)>=12)break;
    }
  }
  battlefieldClear(){return this.enemies.length>0&&this.enemies.every(e=>e.dead);}
  objectiveProgress(){const m=this.missionData();if(this.battlefieldClear())return 1;let progress=0;
    if(m.kind==='capture')progress=this.capture/m.duration;
    else if(m.kind==='defense')progress=this.enemies.length?this.enemies.filter(e=>e.dead).length/this.enemies.length:0;
    else if(m.kind==='escort')progress=this.convoy?this.convoyDistance/this.world.layout.length:0;
    else if(m.kind==='boss'){const bosses=this.enemies.filter(e=>e.role==='boss');progress=bosses.length?bosses.reduce((sum,b)=>sum+1-b.hp/b.max,0)/bosses.length:0;}
    else progress=this.kills/Math.max(1,this.armoredGoal);
    if(['assault','boss'].includes(m.kind)&&distance(this.player.visual.root.position,this.world.layout.points.at(-1)!)>7)progress=Math.min(.98,progress);
    return this.level===2&&this.enemies.some(e=>e.role==='boss'&&!e.dead)?Math.min(.98,progress):progress;
  }
  step(dt:number){
    if(this.phase==='finishing'){this.finishDelay=Math.max(0,this.finishDelay-dt);if(this.finishDelay<1e-6){if(this.level===2&&(this.mission===5||this.mission===8||this.mission===MISSIONS.length-1)){this.setPhase('victory');this.showVictory();}else this.showDepot();}return;}
    if(this.phase!=='playing')return;
    this.trailClock-=dt;this.elapsed+=dt;this.hazards.update(this,dt);if(this.player.dead){this.fail();return;}this.updatePlayer(dt);this.updateEnemies(dt);this.updateShots(dt);this.updateActivities(dt);this.special.update(this,dt);this.flame.update(this,dt);if(this.trailClock<=0)this.trailClock=.06;
    for(const unit of [this.player,...this.enemies])if(!this.isInfantry(unit))unit.visual.turret.position.y+=((unit.role==='jeep'?1.64:1.17)-unit.visual.turret.position.y)*Math.min(1,dt*12);
    this.syncVisual(this.player);
    const m=this.missionData(),p=this.player.visual.root.position;
    if(m.kind==='capture'&&distance(p,{x:0,z:-13})<6.7&&!this.enemies.some(e=>!e.dead&&distance(e.visual.root.position,{x:0,z:-13})<6.7))this.capture+=dt;
    this.convoyBlocked=false;
    this.updateConvoy(dt);
    if(this.player.dead||this.player.hp<=0||this.convoyHealth<=0||this.relayHealth<=0){this.fail();return;}
    if(this.objectiveProgress()>=1){this.complete();return;}
    this.hudTimer+=dt;if(this.hudTimer>.1){this.hudTimer=0;this.updateHud();}
    this.radioTimer-=dt;this.radio.classList.toggle('visible',this.radioTimer>0);
  }
  radioMessage(text:string,duration=5){this.radio.textContent=text;this.radioTimer=duration;this.radio.classList.add('visible');}
  updateHud(){
    if(!this.player)return;
    const m=this.missionData();this.el('mission-number').textContent=`STAGE ${String(this.mission+1).padStart(2,'0')} · LEVEL ${this.level+1}/3 · ${MODES[normalizeDifficulty(this.save.difficulty)??'normal'].label.toUpperCase()}`;this.el('mission-name').textContent=m.name;
    let objective=m.objective;
    if(m.kind==='assault')objective=this.kills>=this.armoredGoal?`PATROL CLEAR · REACH EXIT ${Math.ceil(distance(this.player.visual.root.position,this.world.layout.points.at(-1)!))} m`:`${this.kills} / ${this.armoredGoal} vehicles · ${this.enemies.filter(e=>!e.dead&&e.encounter&&!e.encounter.active).length} waiting ahead`;
    if(m.kind==='capture')objective=`UPLINK ${Math.min(m.duration,Math.floor(this.capture))} / ${m.duration}s · ${this.enemies.some(e=>!e.dead&&distance(e.visual.root.position,{x:0,z:-13})<6.7)?'CONTESTED':'HOLD THE AMBER RING'}`;
    if(m.kind==='defense')objective=`WAVE ${Math.min(4,Math.floor(this.elapsed/4)+1)} / 4 · ${this.enemies.filter(e=>!e.dead).length} hostiles · RELAY ${Math.max(0,Math.ceil(this.relayHealth/3))}%`;
    if(m.kind==='escort')objective=`TRANSPORT ${Math.max(0,Math.ceil(this.convoyHealth/ESCORT.health*100))}%${this.shieldTime>0?' · SHIELDED':''} · ${this.convoy&&distance(this.player.visual.root.position,this.convoy.position)<12?(this.world.layout.closed&&this.convoyReverse===null?'CHOOSE LEFT OR RIGHT':this.convoyBlocked?'CLEAR THE MARKED PATH':'MOVING TO EXTRACTION'):'MOVE CLOSER TO ESCORT'}`;
    if(m.kind==='boss')objective='DEFEAT COMMAND GUARD · REACH EXIT';
    if(m.kind==='boss'&&!this.enemies.some(u=>u.role==='boss'&&!u.dead))objective='COMMAND DOWN · REACH THE MARKED EXIT';
    if(this.battlefieldClear())objective='AREA SECURED';
    const boss=this.enemies.find(u=>u.role==='boss'&&!u.dead),readout=this.el('boss-readout');readout.hidden=!boss;if(boss)readout.textContent=`${this.enemies.filter(e=>e.role==='boss'&&!e.dead).length} BOSS · ${BOSS[boss.bossKind??bossKind(this.mission)].name} ${Math.ceil(boss.hp/boss.max*100)}% · ${boss.encounter&&!boss.encounter.active?(m.kind==='defense'?'REINFORCEMENTS':'GUARDING THE EXIT'):this.bosses.status(boss)}`;this.el('objective').textContent=objective;this.el('objective-fill').style.width=`${clamp(this.objectiveProgress()*100,0,100)}%`;
    const hostile=this.enemies.filter(e=>!e.dead).length,compact=this.el('objective-compact');
    let short=`${hostile} hostiles`;
    if(m.kind==='escort')short=`Transport ${Math.max(0,Math.ceil(this.convoyHealth/ESCORT.health*100))}%${this.shieldTime>0?' ◇':''} · ${hostile} left`;
    else if(m.kind==='defense')short=`Relay ${Math.max(0,Math.ceil(this.relayHealth/3))}% · ${hostile} left`;
    else if(m.kind==='capture')short=`Uplink ${Math.min(m.duration,Math.floor(this.capture))}/${m.duration}s · ${hostile} left`;
    else if(m.kind==='assault'&&this.kills>=this.armoredGoal)short=`Exit ${Math.ceil(distance(this.player.visual.root.position,this.world.layout.points.at(-1)!))} m · ${hostile} left`;
    if(this.battlefieldClear())short='Area secured';
    compact.textContent=short;compact.setAttribute('aria-label',objective);
    const badge=this.el('mission-compact');badge.textContent=`${this.mission+1}.${this.level+1}`;badge.setAttribute('aria-label',this.el('mission-number').textContent!);
    const bossCompact=this.el('boss-compact');bossCompact.hidden=!boss;
    if(boss){bossCompact.textContent=`${this.enemies.filter(e=>e.role==='boss'&&!e.dead).length} boss · ${Math.ceil(boss.hp/boss.max*100)}% · ${boss.encounter&&!boss.encounter.active?'AHEAD':this.bosses.status(boss)}`;bossCompact.setAttribute('aria-label',readout.textContent!);}
    this.radio.style.top=(this.el('mission-name').parentElement!.getBoundingClientRect().bottom+8)+'px';
    this.el('health-label').textContent=`${Math.ceil(this.player.hp)} / ${Math.ceil(this.player.max)}`;this.el('health-fill').style.width=`${this.player.hp/this.player.max*100}%`;
    this.el('status-line').textContent=this.shieldTime>0?'PROTECTIVE FIELD ACTIVE':this.hazards.quaking?'EARTHQUAKE · TRACKS LOCKED':this.hazards.quakeWarning?'TREMOR WARNING · TAKE COVER':this.player.hp<this.player.max*.3?'HULL CRITICAL — SEEK COVER':this.hazards.danger(this.player.visual.root.position)?'ROCKFALL · LEAVE THE RED CIRCLE':this.world.firmRoad(this.player.visual.root.position)?(this.world.layout.closed?'FIRM TRACK · EITHER WAY':'FIRM TRACK · FOLLOW THE CHEVRONS'):terrainLabel(this.world.environment.biome,this.player.visual.root.position);
    const available=Math.max(this.fieldWeaponCount,weaponCount(this.save));
    this.el('weapon').setAttribute('aria-expanded',String(this.weaponPickerOpen));
    const picker=this.el('weapon-picker');picker.hidden=!this.weaponPickerOpen;
    // Rebuild only when selection/unlocks change so held touch buttons retain pointer ownership.
    const state=`${available}:${this.weapon}:${this.specialAmmo.join()}:${this.save.weapons.join()}:${this.save.weaponLevels.join()}`;
    if(picker.dataset.state!==state){picker.dataset.state=state;this.el('weapon-shortcuts').innerHTML=WEAPONS.map((w,i)=>`<button data-quick-weapon="${i+1}" aria-label="Weapon ${i+1}: ${w.name}" title="${i+1} · ${w.name}" aria-pressed="${this.weapon===i}" ${!this.weaponAvailable(i)?'disabled':''}>${i+1}</button>`).join('');picker.innerHTML=WEAPONS.map((info,i)=>{const ammo=info.ammoSlot,available=this.weaponAvailable(i),owned=ownsWeapon(this.save,i),level=weaponLevel(this.save,i);return `<button data-weapon="${i+1}" aria-pressed="${this.weapon===i}" ${!available?'disabled':''}><strong>${i+1} · ${info.label}</strong><small>${ammo!==undefined?available?`${this.specialAmmo[ammo]} ${i===7?'volleys':i===8?'bursts':'shots'}`:owned?'Empty · next mission':i>=7?'Buy in shop':'Shop / map cache':available?i===5?`${barrels(this.save,i)} rounds together`:`LEVEL ${level} / 20`:i===1?'Clear First Light':i===2?'Clear Homeward':'Buy in shop'}</small></button>`;}).join('');}
    const info=WEAPONS[this.weapon],ammo=info.ammoSlot;
    this.el('weapon-label').textContent=(this.weapon===5?(barrels(this.save,5)===4?'Quad machine gun':'Twin machine gun'):info.name)+(ammo!==undefined?' · '+this.specialAmmo[ammo]+(this.weapon===7?' volleys':this.weapon===8?' fuel':''):'')+' ▴';this.el('weapon').setAttribute('aria-label','Choose weapon: '+info.name);this.el('reload-label').textContent=this.reload>0?`${this.reload.toFixed(1)}s`:'READY';this.el('reload-fill').style.width=`${(1-clamp(this.reload/this.reloadDuration(),0,1))*100}%`;
    this.el('shield-label').textContent=this.shieldCooldown>0?`SHIELD ${Math.ceil(this.shieldCooldown)}s`:'SHIELD';
    (this.el('shield') as HTMLButtonElement).disabled=this.shieldCooldown>0;
    this.el('auto-label').textContent=`AUTO ${this.auto.ammo}${this.auto.cooldown>0?' · '+this.auto.cooldown.toFixed(1)+'s':''}`;
    (this.el('auto') as HTMLButtonElement).disabled=this.auto.ammo===0||this.auto.cooldown>0;
    const remaining=this.airSupport.remaining(this),waiting=this.artilleryCooldown>0,seconds=Math.ceil(this.artilleryCooldown);
    this.el('artillery-label').textContent=waiting?`STRIKE ${seconds}s`:`STRIKE ${this.save.strikeCharges}`;
    this.el('drop-label').textContent=waiting?`DROP ${seconds}s`:`DROP ${remaining}`;
    (this.el('artillery') as HTMLButtonElement).disabled=waiting||this.save.strikeCharges===0;
    this.el('artillery').setAttribute('aria-label',`Strike: ${this.save.strikeCharges} charges${waiting?`, ready in ${seconds} seconds`:''}`);
    (this.el('drop') as HTMLButtonElement).disabled=waiting||remaining===0;
    const ctx=this.mini.getContext('2d')!;ctx.fillStyle='#142328';ctx.fillRect(0,0,176,132);ctx.strokeStyle='#3b5557';ctx.strokeRect(5,5,166,122);
    const map=(point:Point)=>({x:point.x/(BOUNDS.x*2)*166+88,y:point.z/(BOUNDS.z*2)*122+66});
    if(this.world.environment.biome==='river'){const q=map({x:0,z:28});ctx.fillStyle='#398d9f';ctx.fillRect(5,q.y,166,8/120*122);for(const x of [-35,0,35]){const b=map({x,z:26});ctx.fillStyle='#baac82';ctx.fillRect(b.x-5,b.y,10,12/120*122);}}
    for(const r of terrainRegions(this.world.environment.biome)){const q=map(r);ctx.fillStyle=r.kind==='ice'?'#72bad0':'#936d3d';ctx.beginPath();ctx.ellipse(q.x,q.y,r.rx/144*166,r.rz/120*122,0,0,Math.PI*2);ctx.fill();}
    for(const r of this.hazards.rocks){const q=map(r);ctx.strokeStyle='#ff6544';ctx.beginPath();ctx.arc(q.x,q.y,5,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle='#c7ac70';ctx.lineWidth=1.5;ctx.beginPath();for(const [i,p] of this.world.layout.points.entries()){const q=map(p);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}ctx.stroke();ctx.lineWidth=1;
    for(const c of this.world.covers){if(c.hp<=0)continue;const q=map(c);ctx.fillStyle=['pine','white-pine','palm','jungle-tree'].includes(c.kind)?'#51845b':['house','cityblock'].includes(c.kind)?'#ac7858':c.kind==='fuelcrate'?'#ff8955':'#667770';const w=Math.max(3,c.w/144*166),h=Math.max(3,c.d/120*122);ctx.fillRect(q.x-w/2,q.y-h/2,w,h);}
    if(this.world.ring.visible){const q=map(this.world.ring.position);ctx.strokeStyle='#ffbd70';ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.stroke();}
    for(const a of this.world.activities){if(a.spent)continue;const q=map(a);ctx.fillStyle=a.kind==='repair'||a.kind==='health'?'#75ffbd':a.kind==='shield'?'#55aaff':a.kind==='supply'?'#70d9ff':a.kind==='laser'?'#8bffff':a.kind==='arc'?'#c392ff':'#ff7055';if(a.kind==='repair'||a.kind==='health'){ctx.fillRect(q.x-3,q.y-1,6,2);ctx.fillRect(q.x-1,q.y-3,2,6);}else if(a.kind==='shield'){ctx.beginPath();ctx.moveTo(q.x-3,q.y-3);ctx.lineTo(q.x+3,q.y-3);ctx.lineTo(q.x+2,q.y+2);ctx.lineTo(q.x,q.y+4);ctx.lineTo(q.x-2,q.y+2);ctx.closePath();ctx.fill();}else ctx.fillRect(q.x-2,q.y-2,4,4);}
    for(const u of [this.player,...this.enemies]){if(u.dead)continue;const q=map(u.visual.root.position);ctx.fillStyle=u===this.player?'#a4ffe0':u.encounter&&!u.encounter.active?'#87685e':'#ff7a5d';ctx.beginPath();ctx.arc(q.x,q.y,u===this.player?3:this.isInfantry(u)?1.2:2,0,Math.PI*2);ctx.fill();}
    if(this.convoy){const q=map(this.convoy.position);ctx.fillStyle='#ffcb84';ctx.fillRect(q.x-3,q.y-3,6,6);}
  }
  complete(){
    if(this.phase!=='playing')return;
    this.hazards.clear();
    this.stageResult={...awardStage(this.save,this.mission,this.elapsed,this.player.hp,this.player.max,this.level),tanks:this.kills,infantry:this.infantryKills};
    this.lastReward=this.stageResult.total;this.persist();this.finishDelay=.8;this.finishDeadline=performance.now()+800;this.setPhase('finishing');this.updateHud();
    for(const enemy of this.enemies)enemy.visual.beam.visible=false;
    this.tone(660,.22,.06);
  }
  resultSummary(){const r=this.stageResult;if(!r)return '';const seconds=Math.ceil(r.time),time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    return `<section class="stage-summary" aria-label="Stage results"><div class="stage-metrics"><span>TIME<strong>${time}</strong></span><span>HULL<strong>${r.healthPercent}%</strong></span><span>TANKS<strong>${r.tanks}</strong></span><span>SOLDIERS<strong>${r.infantry}</strong></span></div><dl class="stage-rewards"><div><dt>Stage reward</dt><dd>${r.base} CR</dd></div><div><dt>Time bonus ${r.target?`<small>target ${r.target}s</small>`:'<small>fixed timer</small>'}</dt><dd>+${r.timeBonus} CR</dd></div><div><dt>Hull bonus</dt><dd>+${r.healthBonus} CR</dd></div><div class="stage-total"><dt>Total earned</dt><dd>+${r.total} CR</dd></div></dl><p class="reward-note">${r.replay?'Replay · rewards already claimed.':'First-clear bonuses: up to 25% each for speed and remaining hull.'}</p></section>`;
  }
  showDepot(){
    this.setPhase('depot');this.overlay.innerHTML=`<section class="panel pause-panel"><span class="eyebrow">LEVEL ${this.level+1} / 3 COMPLETE</span><h1>Mission accomplished</h1><p>${this.level<2?`Next: ${LEVEL_NAMES[this.level+1]} in ${MISSIONS[this.mission].name}.`:MISSIONS[this.mission].debrief}</p>${this.resultSummary()}<p>Balance ${this.save.credits} CR</p><button class="primary" data-action="shop">SHOP · UPGRADES & WEAPONS →</button><button data-action="next">NEXT BRIEFING →</button><button class="quiet" data-action="menu">Return to command</button></section>`;this.focusPrimary();
  }
  showShop(){
    const focus=this.overlay.querySelector<HTMLButtonElement>(':focus'),action=focus?.dataset.action,value=focus?.dataset.value;
    const scroll=this.overlay.querySelector('.depot-panel')?this.overlay.scrollTop:0;
    requestAnimationFrame(()=>{const target=action&&action!=='shop-tab'?this.overlay.querySelector<HTMLButtonElement>(`[data-action="${action}"]${value?`[data-value="${value}"]`:''}`):null;(target&&!target.disabled?target:this.overlay.querySelector<HTMLButtonElement>('.shop-tabs button'))?.focus({preventScroll:true});this.overlay.scrollTop=scroll;});
    this.setPhase('depot');
    if(this.shopTab==='skins'){this.showSkins();return;}
    this.overlay.innerHTML=`<section class="panel depot-panel"><span class="eyebrow">SUPPLY DEPOT</span><div class="debrief-title"><h1>Field shop</h1><span class="credit-total">${this.save.credits}<small>CREDITS</small></span></div><nav class="shop-tabs"><button data-action="shop-tab" data-value="equipment" aria-pressed="true">UPGRADES & WEAPONS</button><button data-action="shop-tab" data-value="skins">TANK SKINS</button></nav>${workshop(this.save)}<button data-action="shop-back">← BACK</button><button class="primary" data-action="next">NEXT BRIEFING →</button><button class="quiet" data-action="menu">Return to command</button>${this.saveWarning?'<p>Storage is unavailable; keep this tab open to retain progress.</p>':''}</section>`;
  }
  showSkins(){
    this.overlay.innerHTML=`<section class="panel depot-panel"><div class="debrief-title"><h1>Tank skins</h1><span class="credit-total">${this.save.credits}<small>CREDITS</small></span></div><nav class="shop-tabs"><button data-action="shop-tab" data-value="equipment">UPGRADES & WEAPONS</button><button data-action="shop-tab" data-value="skins" aria-pressed="true">TANK SKINS</button></nav><p>Buy once. Equip one skin. Bonuses apply next mission.</p><div class="skin-grid">${SKINS.map(skin=>{const owned=this.save.skins.includes(skin.id),selected=this.save.skin===skin.id;return `<article class="skin-card ${selected?'selected':''}"><img src="${import.meta.env.BASE_URL}skins/${skin.id}.png" alt="${skin.name} tank paint"/><h2>${skin.name}</h2>${'stars' in skin?`<span style="color:${'starColor' in skin?skin.starColor:'#ffe588'}" class="skin-stars" aria-label="${skin.stars} stars">${'★'.repeat(skin.stars)}</span>`:''}<p>${skin.bonus}</p><button data-action="${owned?'skin-equip':'skin-buy'}" data-value="${skin.id}" aria-label="${selected?'Equipped':owned?'Equip':'Buy and equip'} ${skin.name}${owned?'':` for ${skin.price} credits`}" ${selected||!owned&&this.save.credits<skin.price?'disabled':''}>${selected?'EQUIPPED':owned?'EQUIP':coin(skin.price)}</button></article>`;}).join('')}</div><button class="primary" data-action="shop-back">DONE →</button></section>`;
  }
  buy(id:Upgrade){if(!UPGRADES.includes(id))return;const result=purchase(this.save.credits,this.save.upgrades[id]);if(!result)return;this.save.credits=result.credits;this.save.upgrades[id]=result.level;this.persist();this.tone(560,.08,.03);this.showShop();}
  fail(){this.hazards.clear();this.setPhase('failed');this.overlay.innerHTML=`<section class="panel pause-panel"><span class="eyebrow">OPERATION INTERRUPTED</span><h1>We go again.</h1><p>${this.convoyHealth<=0?'The rescue transport was lost. Stay close and intercept the ambushers.':this.relayHealth<=0?'The uplink was destroyed. Intercept enemies before they reach the relay.':'Kestrel is disabled. Use hard cover, keep your front toward incoming fire, and activate your shield before crossing a firing lane.'}</p><button class="primary" data-action="retry">RETRY ${MISSIONS[this.mission].name.toUpperCase()} →</button><button data-action="menu">Return to command</button><small>Your purchased upgrades and unlocked operations are safe.</small></section>`;this.focusPrimary();}
  showVictory(){this.overlay.innerHTML=`<section class="panel victory-panel"><span class="eyebrow">MERIDIAN / SIGNAL RESTORED</span><div class="victory-symbol">◈</div><h1>Everyone<br>comes home.</h1><p>${MISSIONS[this.mission].debrief}</p>${this.resultSummary()}<span class="eyebrow">${this.mission===5?'VALLEY SECURED · RECOVERY ROUTE OPEN':this.mission===8?'MERIDIAN CONNECTED · FRONTIER CAMPAIGN UNLOCKED':`${MISSIONS.length} STAGES · ${MISSIONS.length*3} LEVELS · EVERY SIGNAL CONNECTED`}</span><button class="primary" data-action="shop">SHOP · UPGRADES & WEAPONS →</button><button data-action="menu">${this.mission<MISSIONS.length-1?'CONTINUE CAMPAIGN →':'RETURN TO COMMAND →'}</button><small>Choose unlocked operations from the command route.</small></section>`;this.focusPrimary();}
  tone(frequency:number,duration:number,volume:number){
    if(!this.save.sound)return;
    try{this.audio??=new AudioContext();void this.audio.resume();const osc=this.audio.createOscillator(),gain=this.audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(frequency,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(frequency*.4,this.audio.currentTime+duration);gain.gain.setValueAtTime(volume,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);osc.connect(gain);gain.connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);}catch{/* Audio is optional. */}
  }
  frame(now:number){
    // A queued RAF timestamp can predate start/resume after a slow render.
    const frameTime=Math.max(now,this.last),dt=Math.min((frameTime-this.last)/1000,.1);this.last=frameTime;
    if(this.phase==='finishing'){this.accumulator=0;if(now>=this.finishDeadline)this.step(this.finishDelay);}
    else if(this.phase==='playing'){this.accumulator+=dt;let steps=0;while(this.phase==='playing'&&this.accumulator>=1/60&&steps++<6){this.step(1/60);this.accumulator-=1/60;}}
    else {this.accumulator=0;if(this.phase==='menu')this.player.visual.turret.rotation.y=Math.PI+Math.sin(now*.0003)*.45;}
    this.hurtTimer=Math.max(0,this.hurtTimer-dt);document.body.classList.toggle('hurt',this.hurtTimer>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.flame.render(this,this.phase!=='paused'?dt:0);
    this.world.update(this.phase!=='paused'?dt:0,this.player.visual.root.position,this.phase==='menu');
    requestAnimationFrame(t=>this.frame(t));
  }
}
