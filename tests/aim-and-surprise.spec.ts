import {expect,test} from '@playwright/test';

const ready=async(page:any)=>{await page.goto('/?e2e');await page.waitForSelector('[data-action=deploy]');await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};});};

test('aim mode: manual by default in scripted runs, assist settles on a near enemy, auto picks the nearest when idle, firing stays manual',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;const out:any={start:g.aimMode};g.save.difficulty='easy';g.start(0,1);g.clearOpening();
  for(const c of g.world.covers)c.hp=0;g.world.navigationRevision++;
  const p=g.player.visual.root.position;p.set(0,0,0);const live=g.enemies.filter((e:any)=>!e.dead&&!e.perch);const near=live[0];for(const e of live.slice(1)){e.dead=true;}
  near.visual.root.position.set(20,0,0);
  const gap=()=>Math.hypot(g.aimPoint.x-20,g.aimPoint.z);
  // a stick pointed 7 degrees off the enemy
  const off=7*Math.PI/180;g.input.touchAiming=true;g.input.aim={x:Math.cos(off),z:Math.sin(off)};g.input.hasTouchAim=true;
  g.aimMode='manual';g.updatePlayer(1/60);out.manual=gap();
  g.aimMode='assist';g.updatePlayer(1/60);out.assist=gap();
  // idle: no stick, no mouse
  g.input.touchAiming=false;g.input.hasTouchAim=false;g.input.hasMouse=false;g.input.keys.clear();
  g.aimMode='assist';g.updatePlayer(1/60);out.assistIdle=gap();
  g.aimMode='auto';g.updatePlayer(1/60);out.auto=gap();
  // out of range for auto
  near.visual.root.position.set(60,0,0);g.updatePlayer(1/60);out.autoFar=Math.hypot(g.aimPoint.x-60,g.aimPoint.z);
  out.shots=g.shots.length;return out;});
 expect(r.start).toBe('manual');
 expect(r.manual).toBeGreaterThan(2);expect(r.assist).toBeLessThan(.5);expect(r.assistIdle).toBeGreaterThan(5);expect(r.auto).toBeLessThan(.5);expect(r.autoFar).toBeGreaterThan(5);expect(r.shots).toBe(0);
});

test('aim mode is a Settings row and cycles manual, assist, auto',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const A=await import('/src/three/aim-mode.ts');g.showMenu();const manual=g.settings().includes('AIM <b>MANUAL</b>');g.aimMode='assist';const assist=g.settings().includes('AIM <b>ASSIST</b>');
  return {manual,assist,row:g.settings().includes('data-action="aim"'),cycle:[A.nextAimMode('manual'),A.nextAimMode('assist'),A.nextAimMode('auto')]};});
 expect(r.manual).toBe(true);expect(r.assist).toBe(true);expect(r.row).toBe(true);expect(r.cycle).toEqual(['assist','auto','manual']);
});

test('kite window: Easy and Normal tanks hold farther back and fire shorter; Hard, bosses, infantry, skirmish and training are unchanged',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const S=await import('/src/three/surprise.ts');const out:any={};
  const tank={role:'raider'},heavy={role:'heavy'},boss={role:'boss'},rifle={role:'rifleman'};
  for(const d of ['easy','normal','hard','crazy']){g.save.difficulty=d;out[d]=[S.holdDistance(g,tank,17),S.fireRange(g,tank,38),S.holdDistance(g,heavy,17),S.fireRange(g,boss,38),S.fireRange(g,rifle,38)];}
  g.save.difficulty='easy';g.training={};out.training=S.fireRange(g,tank,38);g.training=null;g.skirmish={};out.skirmish=S.fireRange(g,tank,38);g.skirmish=null;return out;});
 expect(r.easy).toEqual([24,32,24,38,38]);expect(r.normal).toEqual([26,35,26,38,38]);expect(r.hard).toEqual([17,38,17,38,38]);expect(r.crazy).toEqual([17,38,17,38,38]);
 expect(r.training).toBe(38);expect(r.skirmish).toBe(38);
});

test('a player who keeps 36 m from an Easy tank is never shot, while one at 28 m does hit',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.difficulty='easy';g.start(0,1);g.clearOpening();for(const c of g.world.covers)c.hp=0;g.world.navigationRevision++;
  const tank=g.enemies.find((e:any)=>!e.dead&&(e.role==='raider'||e.role==='heavy'));if(!tank)return null;for(const e of g.enemies)if(e!==tank)e.dead=true;
  g.player.hp=g.player.max=9999;const p=g.player.visual.root.position;p.set(0,0,0);tank.visual.root.position.set(36,0,0);tank.encounter&&(tank.encounter.active=true);tank.cooldown=0;
  // The tank stays put and reinforcements stay out: this checks the Easy fire range only. (Chasing pinned the
  // player against the map edge at 23 m, and level 2 sends reinforcements; it passed only while their shots missed.)
  g.enemySpeed=()=>0;
  const hold=(gap:number)=>{g.player.hp=9999;tank.cooldown=0;const hp0=g.player.hp;for(let i=0;i<600;i++){for(const e of g.enemies)if(e!==tank)e.dead=true;p.x=tank.visual.root.position.x-gap;p.z=0;g.step(1/60);}return hp0-g.player.hp;};
  return {far:hold(36),near:hold(28)};});
 expect(r).not.toBeNull();expect(r!.far).toBe(0);expect(r!.near).toBeGreaterThan(0);
});

test('calm opening: the first group sees the tank from closer on Easy and Normal, not on Hard',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const E=await import('/src/three/encounters.ts');const out:any={};
  for(const d of ['easy','normal','hard']){g.save.difficulty=d;g.start(4,0);g.clearOpening();for(const c of g.world.covers)c.hp=0;g.world.navigationRevision++;
   const e=g.enemies.find((x:any)=>x.encounter?.group===0&&(x.role==='raider'||x.role==='heavy'));const q=e.visual.root.position;
   out[d]=[40,36,30].map(k=>E.seesTarget(g,e,{x:q.x+k,z:q.z}));}
  return out;});
 expect(r.easy).toEqual([false,true,true]);expect(r.normal).toEqual([true,true,true]);expect(r.hard).toEqual([true,true,true]);
});

test('ambush: the first hit on an enemy that has not noticed the tank does 50% more, later hits and Hard do not',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;const out:any={};
  const hit=(difficulty:string)=>{g.save.difficulty=difficulty;g.start(4,0);g.clearOpening();const e=g.enemies.find((x:any)=>g.isInfantry(x)&&x.encounter&&!x.encounter.active&&!x.perch);if(!e)return null;
   e.hp=e.max=5000;const src=g.player.visual.root.position;g.damageUnit(e,10,{x:src.x,z:src.z});const first=5000-e.hp;g.damageUnit(e,10,{x:src.x,z:src.z});return {first,second:5000-e.hp-first,shown:g.hits.shown};};
  out.easy=hit('easy');out.normal=hit('normal');out.hard=hit('hard');return out;});
 expect(r.easy.first).toBeCloseTo(15,5);expect(r.easy.second).toBeCloseTo(10,5);
 expect(r.normal.first).toBeCloseTo(15,5);
 expect(r.hard.first).toBeCloseTo(10,5);
});
