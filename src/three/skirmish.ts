import type {Game,Unit} from './game';
import type {Mission} from './campaign';
import {MISSIONS} from './campaign';
import type {Point} from './rules';
import {clamp,distance,segmentBox,turnToward} from './rules';

/** Skirmish series: custom battles on campaign backgrounds against coordinated AI teams. */
export const SKIRMISH_KEY='steel-front-3d-skirmish';
export const AI_SPEEDS=[{label:'Slow',pace:.75},{label:'Normal',pace:1},{label:'Fast',pace:1.3},{label:'Blitz',pace:1.6}] as const;
export const TEAM_SIZES=[
 {label:'Squad',roles:['raider','sentry','jeep','rifleman','rifleman','rocketeer']},
 {label:'Platoon',roles:['raider','heavy','sentry','jeep','rifleman','rifleman','rifleman','rocketeer']},
 {label:'Company',roles:['raider','raider','heavy','heavy','sentry','jeep','jeep','rifleman','rifleman','rifleman','rifleman','rocketeer','rocketeer']},
] as const;
/** Team 0 matches the campaign's enemy paint, so single-team battles look familiar. */
export const TEAMS=[
 {name:'Crimson',css:'#ff7a5d',armor:0x744b41,trim:0xc08a68,signal:0xff573e},
 {name:'Amber',css:'#ffc857',armor:0x86662a,trim:0xd8b25a,signal:0xffc53d},
 {name:'Violet',css:'#c38bff',armor:0x5a4377,trim:0xa98ad0,signal:0xc47dff},
 {name:'Obsidian',css:'#e9eef2',armor:0x383c42,trim:0x9aa3ab,signal:0xf2f5f7},
] as const;
export const STRATEGIES=[
 {name:'Spearhead',brief:'One team drives at you while its raiders and jeeps swing wide onto both flanks.'},
 {name:'Hammer & anvil',brief:'One team pins your front from range while the other circles behind you and charges once it is in position.'},
 {name:'Pincer & reserve',brief:'Two teams close from opposite flanks at the same moment; the third waits in reserve and commits when you weaken or a flank breaks.'},
 {name:'Encirclement',brief:'Four teams surround you. Opposite pairs take turns: two assault while the other two hold the ring and fire.'},
] as const;

export interface SkirmishConfig {maps:number[];speed:number;teams:number;size:number;}
export const defaultSkirmish=():SkirmishConfig=>({maps:[0,1,2],speed:1,teams:2,size:1});
export function normalizeSkirmish(raw:unknown):SkirmishConfig{
 const d=defaultSkirmish(),c=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const pick=(v:unknown,n:number,f:number)=>Number.isInteger(v)&&(v as number)>=0&&(v as number)<n?v as number:f;
 const maps=Array.isArray(c.maps)?[...new Set(c.maps.filter((i):i is number=>Number.isInteger(i)&&i>=0&&i<MISSIONS.length))].sort((a,b)=>a-b):[];
 const teams=pick(c.teams,5,0);
 return {maps:maps.length?maps:d.maps,speed:pick(c.speed,AI_SPEEDS.length,d.speed),teams:teams>=1?teams:d.teams,size:pick(c.size,TEAM_SIZES.length,d.size)};
}
export function loadSkirmish(){try{return normalizeSkirmish(JSON.parse(localStorage.getItem(SKIRMISH_KEY)??'null'));}catch{return defaultSkirmish();}}
export function storeSkirmish(c:SkirmishConfig){try{localStorage.setItem(SKIRMISH_KEY,JSON.stringify(c));}catch{/* settings stay in memory */}}

type Role='spearhead'|'anvil'|'hammer'|'pincer'|'reserve'|'ring';
interface Order {charge:boolean;bearing:number;radius:number;}
/** `at` is the live bearing from the player to the team; `target` is the bearing it holds or circles to. */
export interface Team {id:number;units:Unit[];role:Role;base:number;target:number;at:number;phase:'move'|'hold'|'assault';since:number;seen:number;shiftAt:number;shifts:number;staged:boolean;follow?:number;order:Order;}
/** Bounded search pattern around a holding team's base bearing (radians). */
const LANE_SEARCH=[0,.45,-.45,.9,-.9];
export interface BattleRecord {map:number;seconds:number;hull:number;tanks:number;infantry:number;}

const angle=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export class SkirmishSession {
 round=0;records:BattleRecord[]=[];teams:Team[]=[];
 private tick=0;private wave=0;private waveAt=0;private called=new Set<string>();private sighted=-99;
 readonly config:SkirmishConfig;
 constructor(config:SkirmishConfig){this.config=config;}
 get pace(){return AI_SPEEDS[this.config.speed].pace;}
 get map(){return this.config.maps[this.round];}
 get battles(){return this.config.maps.length;}
 get strategy(){return STRATEGIES[this.config.teams-1];}
 get last(){return this.round>=this.battles-1;}
 teamLabel(n=this.config.teams){return `${n} team${n>1?'s':''}`;}
 mission(index:number):Mission{
  const m=MISSIONS[index],names=TEAMS.slice(0,this.config.teams).map(t=>t.name).join(', ');
  return {...m,sector:`SKIRMISH ${this.round+1}/${this.battles}`,kind:'assault',parTime:0,briefing:`${this.strategy.name}: ${this.strategy.brief}`,radio:`IVO / ${this.teamLabel()} inbound (${names}) · ${this.strategy.name}. Watch every approach.`,debrief:'',objective:`Defeat ${this.teamLabel()} · ${this.strategy.name}`,count:0,duration:0,reward:0};
 }

 /** Teams spawn on the open side of the map, spread around the player, each in its own colours. */
 deploy(g:Game){
  this.teams=[];this.tick=0;this.wave=0;this.waveAt=0;this.called.clear();this.sighted=g.elapsed;
  const p=g.player.visual.root.position,n=this.config.teams,centre=Math.atan2(-p.x,-p.z),roles=TEAM_SIZES[this.config.size].roles;
  const offsets=[[0],[-.5,.9],[-2.1,0,2.1],[-2.36,-.79,.79,2.36]][n-1];
  offsets.forEach((offset,t)=>{
   const bearing=centre+offset,spot=this.spawnPoint(g,p,bearing),units:Unit[]=[],facing=Math.atan2(p.x-spot.x,p.z-spot.z);
   roles.forEach((role,k)=>{
    const back=Math.floor(k/4)*4.5,lateral=(k%4-1.5)*4,x=spot.x-Math.sin(facing)*back+Math.cos(facing)*lateral,z=spot.z-Math.cos(facing)*back-Math.sin(facing)*lateral;
    const u=g.makeUnit(x,z,role);u.squad=t;u.heading=u.aim=facing;u.cooldown=1.6+(k%4)*.45;g.world.paintTeam(u.visual,t);units.push(u);g.enemies.push(u);
   });
   const at=Math.atan2(spot.x-p.x,spot.z-p.z);
   const role:Role=n===1?'spearhead':n===2?(t===0?'anvil':'hammer'):n===3?(t===1?'reserve':'pincer'):'ring';
   this.teams.push({id:t,units,role,base:at,target:at,at,phase:'move',since:g.elapsed,seen:g.elapsed,shiftAt:g.elapsed,shifts:0,staged:false,order:{charge:false,bearing:at,radius:34}});
  });
  // Encircling teams take four fixed compass slots around the player.
  if(n===4)this.teams.forEach((t,i)=>t.base=t.target=this.teams[0].at+i*Math.PI/2);
  g.armoredGoal=g.enemies.filter(u=>!g.isInfantry(u)).length;
  this.command(g);
 }
 private spawnPoint(g:Game,p:Point,bearing:number):Point{
  const bx=g.world.bounds.x-10,bz=g.world.bounds.z-10;
  for(let turn=0;turn<14;turn++){const b=bearing+(turn%2?1:-1)*Math.ceil(turn/2)*.26,q={x:clamp(p.x+Math.sin(b)*52,-bx,bx),z:clamp(p.z+Math.cos(b)*52,-bz,bz)};if(distance(q,p)>=34)return q;}
  return {x:clamp(-p.x,-bx,bx),z:clamp(-p.z,-bz,bz)};
 }
 alive(t:Team){return t.units.filter(u=>!u.dead).length;}
 strength(t:Team){return this.alive(t)/t.units.length;}
 liveTeams(){return this.teams.filter(t=>this.alive(t)>0);}
 private say(g:Game,key:string,text:string){if(this.called.has(key))return;this.called.add(key);g.radioMessage(`IVO / ${text}`,4);}

 update(g:Game,dt:number){this.tick-=dt;if(this.tick>0)return;this.tick=.2;this.command(g);}

 /** The team commander: turns the chosen strategy into a bearing, range and stance for every team. */
 command(g:Game){
  const player=g.player.visual.root.position,now=g.elapsed,live=this.liveTeams();if(!live.length)return;
  for(const t of live){const c=this.centroid(t);t.at=Math.atan2(c.x-player.x,c.z-player.z);this.sighted=Math.max(this.sighted,t.seen);}
  const name=(t:Team)=>TEAMS[t.id].name;
  const phase=(t:Team,next:Team['phase'])=>{if(t.phase!==next){t.phase=next;t.since=now;}};
  const hold=(t:Team,radius:number)=>{phase(t,'hold');t.order={charge:false,bearing:t.target,radius};};
  const assault=(t:Team)=>{phase(t,'assault');t.order={charge:true,bearing:t.at,radius:0};};
  // Circle toward a bearing on a ring instead of cutting straight through the player's fire.
  // Staged means on the bearing and actually at the ring, not merely lined up from afar.
  const circle=(t:Team,target:number,radius:number)=>{const turn=angle(target,t.at),bearing=t.at+clamp(turn,-1.2,1.2);phase(t,'move');t.order={charge:false,bearing,radius};t.staged=Math.abs(turn)<.55&&Math.abs(distance(this.centroid(t),player)-this.fit(g,player,target,radius))<8;return t.staged;};
  // A pinning team that cannot see the player tries nearby lanes around its base bearing,
  // never drifting more than about 50 degrees off its post.
  for(const t of live)if((t.role==='anvil'||t.role==='ring')&&t.phase==='hold'&&now-t.seen>6&&now-t.shiftAt>6){t.shifts++;t.target=t.base+LANE_SEARCH[t.shifts%LANE_SEARCH.length];t.shiftAt=now;}
  // Broken teams fold into the strongest survivor.
  const strongest=[...live].sort((a,b)=>this.strength(b)-this.strength(a))[0];
  for(const t of live)if(t!==strongest&&t.follow===undefined&&this.strength(t)<.3&&this.strength(strongest)>=.3){t.follow=strongest.id;this.say(g,`merge${t.id}`,`${name(t)} is broken; survivors are regrouping with ${name(strongest)}.`);}
  const leaders=live.filter(t=>t.follow===undefined||this.alive(this.teams[t.follow])===0);
  // Hunting only once every team has reached its post and the player has stayed hidden since.
  const hunting=now>20&&now-this.sighted>14&&leaders.every(t=>t.phase!=='move');
  if(hunting)this.say(g,`hunt${Math.floor(now/30)}`,'They lost you. Every team is sweeping in on your last position.');
  // Strategy timeouts count from the start of the battle (g.elapsed), so no team can stall forever.
  for(const t of leaders){
   if(hunting){assault(t);continue;}
   if(t.role==='spearhead'){
    if(t.phase==='assault'||distance(player,this.centroid(t))<36||now>10){assault(t);this.say(g,'spear',`${name(t)} is charging, with raiders and jeeps swinging onto both flanks.`);}else hold(t,30);
   }
   if(t.role==='anvil'){
    const hammer=this.teams.find(o=>o.role==='hammer');
    if(t.phase==='assault'||!hammer||this.alive(hammer)===0||hammer.phase==='assault')assault(t);
    else{hold(t,26);this.say(g,'anvil',`${name(t)} is pinning your front. ${name(hammer)} is circling behind you.`);}
   }
   if(t.role==='hammer'){
    const anvil=this.teams.find(o=>o.role==='anvil');
    // Aim for the anvil's post rather than its live centroid, so the rear target stays put.
    if(t.phase==='assault'||!anvil||this.alive(anvil)===0||circle(t,anvil.target+Math.PI,40)||now>30){assault(t);this.say(g,'hammer',`${name(t)} is charging your rear! Turn to meet it or break out.`);}
   }
   if(t.role==='pincer'){
    if(t.phase==='assault'){assault(t);continue;}
    const pincers=leaders.filter(o=>o.role==='pincer'),reserve=this.teams.find(o=>o.role==='reserve');
    circle(t,reserve&&this.alive(reserve)?reserve.at+(t.id===0?-1:1)*2.1:t.target,34);
    if(pincers.every(o=>o.staged||o.phase==='assault')||now>18){for(const o of pincers)assault(o);this.say(g,'pincer',`Pincer! ${pincers.map(name).join(' and ')} are closing from both flanks.`);}
   }
   if(t.role==='reserve'){
    const pincers=this.teams.filter(o=>o.role==='pincer'),struck=pincers.find(o=>o.phase==='assault');
    if(t.phase==='assault'||pincers.every(o=>this.alive(o)===0)||pincers.some(o=>this.strength(o)<.5)||g.player.hp<g.player.max*.5||!!struck&&now-struck.since>25){assault(t);this.say(g,'reserve',`${name(t)} reserve is committing.`);}
    else hold(t,40); // inside sight range but outside gun range: a visible threat that waits
   }
   if(t.role==='ring'){
    const ring=leaders.filter(o=>o.role==='ring'),total=this.teams.reduce((s,o)=>s+this.alive(o),0)/this.teams.reduce((s,o)=>s+o.units.length,0);
    if(!this.waveAt){circle(t,t.target,36);if(ring.every(o=>o.staged)||now>16){this.waveAt=now;this.wave=0;}else continue;}
    if(now-this.waveAt>12){this.waveAt=now;this.wave++;}
    if(total<.4||this.wave%2===t.id%2){assault(t);this.say(g,`wave${this.wave}`,total<.4?'The ring is collapsing: every team is closing in.':`${ring.filter(o=>o.id%2===this.wave%2).map(name).join(' and ')} assault; the others hold the ring.`);}
    else hold(t,26);
   }
  }
 }
 /** Team position for strategy decisions: its vehicles lead, infantry follow the same orders. */
 centroid(t:Team):Point{const units=t.units.filter(u=>!u.dead),lead=units.filter(u=>u.role!=='rifleman'&&u.role!=='rocketeer'),pick=lead.length?lead:units;let x=0,z=0;for(const u of pick){x+=u.visual.root.position.x;z+=u.visual.root.position.z;}return pick.length?{x:x/pick.length,z:z/pick.length}:{x:0,z:0};}
 /** Largest ring radius (up to `radius`) along a bearing that still lands inside the battlefield. */
 fit(g:Game,from:Point,bearing:number,radius:number){
  const bx=g.world.bounds.x-6,bz=g.world.bounds.z-6,dx=Math.sin(bearing),dz=Math.cos(bearing);
  const tx=dx>1e-6?(bx-from.x)/dx:dx<-1e-6?(-bx-from.x)/dx:Infinity,tz=dz>1e-6?(bz-from.z)/dz:dz<-1e-6?(-bz-from.z)/dz:Infinity;
  return clamp(Math.min(radius,tx,tz),12,radius);
 }

 /** Moves one unit along its team's order. Returns false for units outside the skirmish teams. */
 steer(g:Game,e:Unit,dt:number,sees:boolean):boolean{
  const team=e.squad===undefined?undefined:this.teams[e.squad];if(!team)return false;
  if(sees){team.seen=g.elapsed;this.sighted=g.elapsed;}
  const lead=team.follow!==undefined&&this.alive(this.teams[team.follow])?this.teams[team.follow]:team,order=lead.order;
  const p=e.visual.root.position,player=g.player.visual.root.position,k=team.units.indexOf(e),infantry=g.isInfantry(e);
  const flank=order.charge&&lead.role==='spearhead'&&(e.role==='raider'||e.role==='jeep')?(k%2?1:-1)*1.05:0;
  let goal:Point,stop:number;
  if(order.charge){goal=flank?{x:player.x+Math.sin(order.bearing+flank)*12,z:player.z+Math.cos(order.bearing+flank)*12}:player;stop=flank?3:infantry?16:e.role==='sentry'?20:e.role==='jeep'?9:12;}
  else{const lateral=(k-(team.units.length-1)/2)*3.2,b=order.bearing,r=this.fit(g,player,b,order.radius+(infantry?4:0));goal={x:player.x+Math.sin(b)*r+Math.cos(b)*lateral,z:player.z+Math.cos(b)*r-Math.sin(b)*lateral};stop=2.5;}
  goal={x:clamp(goal.x,-g.world.bounds.x+4,g.world.bounds.x-4),z:clamp(goal.z,-g.world.bounds.z+4,g.world.bounds.z-4)};
  // Charging units only stop once they actually have a shot.
  if(distance(p,goal)<=stop&&(!order.charge||sees||flank)){g.moveUnit(e,0,0,dt);return true;}
  const blocked=g.world.covers.some(c=>c.hp>0&&segmentBox(p,goal,c,g.unitRadius(e)+.2)!==null);
  const next=blocked?g.navigation.next(g.world,p,goal)??goal:goal,dir=Math.atan2(next.x-p.x,next.z-p.z),step=g.enemySpeed(e)*dt;
  g.moveUnit(e,Math.sin(dir)*step,Math.cos(dir)*step,dt);e.heading=turnToward(e.heading,dir,dt*2*this.pace);
  if(!sees)e.aim=turnToward(e.aim,dir,dt*2*this.pace);
  return true;
 }

 record(g:Game){this.records[this.round]={map:this.map,seconds:g.elapsed,hull:Math.round(clamp(g.player.hp/g.player.max,0,1)*100),tanks:g.kills,infantry:g.infantryKills};}
 objective(g:Game){const live=this.liveTeams().length,hostile=g.enemies.filter(e=>!e.dead).length;return {full:`BATTLE ${this.round+1}/${this.battles} · ${live}/${this.config.teams} TEAMS · ${hostile} HOSTILES · ${this.strategy.name.toUpperCase()}`,short:`${live}/${this.config.teams} teams · ${hostile} left`};}
}

const time=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const choice=(action:string,items:readonly string[],selected:number,label:string)=>`<div class="skirmish-choice" role="group" aria-label="${label}">${items.map((item,i)=>`<button data-action="${action}" data-value="${i}" aria-pressed="${i===selected}" class="${i===selected?'active':''}">${item}</button>`).join('')}</div>`;

export function skirmishSetup(c:SkirmishConfig,difficulty:string){
 const s=STRATEGIES[c.teams-1];
 return `<section class="panel pause-panel skirmish-panel"><span class="eyebrow">SKIRMISH SERIES</span><h1>Custom battle</h1><p>Pick the battlefields to play in order, then choose how the enemy fights. Your tank keeps its upgrades, weapons and skin; campaign progress, credits and Strike charges are untouched.</p>
<div class="setup-label">BATTLEFIELDS · ${c.maps.length} SELECTED</div><div class="skirmish-maps" role="group" aria-label="Battlefields">${MISSIONS.map((m,i)=>`<button data-action="sk-map" data-value="${i}" aria-pressed="${c.maps.includes(i)}" class="${c.maps.includes(i)?'active':''}"><b>${i+1}</b>${m.name}</button>`).join('')}</div>
<div class="setup-label">AI SPEED</div>${choice('sk-speed',AI_SPEEDS.map(v=>v.label),c.speed,'AI speed')}
<div class="setup-label">ENEMY TEAMS</div>${choice('sk-teams',['1','2','3','4'],c.teams-1,'Enemy teams')}
<p class="skirmish-strategy"><strong>${s.name}</strong> ${s.brief}</p>
<div class="setup-label">TEAM SIZE</div>${choice('sk-size',TEAM_SIZES.map(v=>`${v.label} · ${v.roles.length}`),c.size,'Team size')}
<small>Difficulty: ${difficulty} (set on the command screen) · ${c.teams*TEAM_SIZES[c.size].roles.length} hostiles per battle</small>
<button class="primary" data-action="sk-start">START SERIES · ${c.maps.length} BATTLE${c.maps.length>1?'S':''} →</button><button data-action="menu">Back to command</button></section>`;
}

export function skirmishResult(s:SkirmishSession){
 const r=s.records[s.round],m=MISSIONS[s.map];
 if(!s.last)return `<section class="panel pause-panel skirmish-panel"><span class="eyebrow">SKIRMISH · BATTLE ${s.round+1} / ${s.battles}</span><h1>Battle won</h1><p>${m.name} cleared in ${time(r.seconds)} · hull ${r.hull}% · ${r.tanks} vehicles, ${r.infantry} soldiers.</p><button class="primary" data-action="skirmish-next">NEXT · ${MISSIONS[s.config.maps[s.round+1]].name.toUpperCase()} →</button><button data-action="menu">End series</button></section>`;
 const total=s.records.reduce((a,b)=>({seconds:a.seconds+b.seconds,tanks:a.tanks+b.tanks,infantry:a.infantry+b.infantry}),{seconds:0,tanks:0,infantry:0});
 return `<section class="panel pause-panel skirmish-panel"><span class="eyebrow">SKIRMISH SERIES COMPLETE</span><h1>${s.battles} / ${s.battles} won</h1><ol class="skirmish-log">${s.records.map(b=>`<li><span>${MISSIONS[b.map].name}</span><span>${time(b.seconds)} · ${b.hull}% hull · ${b.tanks + b.infantry} kills</span></li>`).join('')}</ol><p>Total ${time(total.seconds)} · ${total.tanks} vehicles and ${total.infantry} soldiers against ${s.teamLabel()} (${s.strategy.name}, ${AI_SPEEDS[s.config.speed].label} AI).</p><button class="primary" data-action="skirmish-setup">NEW SERIES →</button><button data-action="menu">Return to command</button></section>`;
}

export function skirmishFailed(s:SkirmishSession){
 return `<section class="panel pause-panel skirmish-panel"><span class="eyebrow">SKIRMISH · BATTLE ${s.round+1} / ${s.battles}</span><h1>Kestrel is down.</h1><p>${s.strategy.name}: ${s.strategy.brief} Keep cover between you and the teams that are holding, and meet the charging team head-on.</p><button class="primary" data-action="retry">RETRY ${MISSIONS[s.map].name.toUpperCase()} →</button><button data-action="menu">End series</button></section>`;
}
