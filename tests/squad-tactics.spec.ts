import {test,expect,type Page} from '@playwright/test';

async function field(page:Page,difficulty='normal'){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(difficulty=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty=difficulty;g.start(0,0);g.clearOpening?.();g.enemies=[];g.world.covers=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,0);g.player.aim=0;g.shieldTime=999;},difficulty);
}
const squad=`const g=window.__steel;const make=(x,z)=>{const e=g.makeUnit(x,z,'raider');e.encounter={group:0,anchor:{x,z},meters:0,active:true};e.cooldown=99;return e;};`;

test('the first tank holds the line while the second swings round to the rear arc',async({page})=>{
 await field(page);
 const r=await page.evaluate(new Function(squad+`
  const a=make(-2,20),b=make(2,20);g.enemies=[a,b];
  const bearing=e=>{const p=e.visual.root.position,q=g.player.visual.root.position;return Math.abs(Math.atan2(p.x-q.x,p.z-q.z));};
  const before={a:bearing(a),b:bearing(b)};
  for(let i=0;i<60*14;i++){a.cooldown=b.cooldown=99;g.elapsed+=1/60;g.updateEnemies(1/60);}
  const p=b.visual.root.position,q=g.player.visual.root.position;
  return {before,a:bearing(a),b:bearing(b),range:Math.hypot(p.x-q.x,p.z-q.z),called:g.tacticCalls.flank===true};`) as any);
 expect(r.before.b).toBeLessThan(.2);
 expect(r.b).toBeGreaterThan(1.6);
 expect(r.range).toBeGreaterThan(8);expect(r.range).toBeLessThan(22);
 expect(r.called).toBe(true);
});

test('squad tactics: anvil and Easy keep the default, flankers stop once outside the gun arc, wounded raiders fall back',async({page})=>{
 await field(page);
 const r=await page.evaluate(new Function(squad+`
  return import('/src/three/squad-tactics.ts').then(({squadTactic})=>{
   const a=make(-2,20),b=make(2,20),behind=make(0,-16);g.enemies=[a,b,behind];
   const out={anvil:squadTactic(g,a,0,20),flanker:squadTactic(g,b,1,20),settled:squadTactic(g,behind,2,16)};
   b.hp=b.max*.3;out.hurt=squadTactic(g,b,1,15);out.hurtFar=squadTactic(g,b,1,30);
   const heavy=g.makeUnit(4,20,'heavy');heavy.encounter={group:0,anchor:{x:4,z:20},meters:0,active:true};heavy.hp=heavy.max*.2;g.enemies=[a,heavy];out.heavy=squadTactic(g,heavy,1,20);
   const rifle=g.makeUnit(6,20,'rifleman');out.rifle=squadTactic(g,rifle,1,20);
   g.save.difficulty='easy';b.hp=b.max;g.enemies=[a,b];out.easy=squadTactic(g,b,1,20);b.hp=b.max*.3;out.easyHurt=squadTactic(g,b,1,15);
   return out;});`) as any);
 expect(r.anvil).toBeNull();expect(r.rifle).toBeNull();expect(r.easy).toBeNull();
 expect(Math.abs(r.flanker.side)).toBeGreaterThan(.9);expect(r.flanker.advance).toBeGreaterThan(0);
 expect(r.settled.side).toBe(0);
 expect(r.hurt.advance).toBeLessThan(0);expect(r.hurtFar.advance).toBe(0);expect(r.easyHurt.advance).toBeLessThan(0);
 expect(Math.abs(r.heavy.side)).toBeGreaterThan(.9);
});

test('a boss comes on faster at two thirds and one third health, and says so once each',async({page})=>{
 await field(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.cleared=g.save.cleared.map(()=>true);g.start(5,2);g.clearOpening?.();
  const b=g.enemies.find((u:any)=>u.role==='boss');b.pending=false;g.player.visual.root.position.set(b.visual.root.position.x,0,b.visual.root.position.z+30);
  const tick=()=>{g.bosses.update(g,b,1/60);return g.bosses.states.get(b);};
  const s=tick(),start=s.stage??0;s.phase='tracking';s.time=50;tick();const calm=50-s.time;
  b.hp=b.max*.6;g.radio.textContent='';s.time=50;tick();const one=s.stage,said=g.radio.textContent.length>0,fast=50-s.time;
  g.radio.textContent='';s.time=50;tick();const quiet=g.radio.textContent==='';
  b.hp=b.max*.3;s.time=50;tick();const two=s.stage,faster=50-s.time;
  return {start,one,two,said,quiet,calm,fast,faster};});
 expect(r).toMatchObject({start:0,one:1,two:2,said:true,quiet:true});
 expect(r.fast).toBeGreaterThan(r.calm*1.15);expect(r.faster).toBeGreaterThan(r.fast*1.1);
});

test('level 2 brings a counterattack from behind at half strength; level 1 and a clean sweep do not',async({page})=>{
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='normal';g.save.cleared[0]=true;g.save.mission=1;
  const run=(level:number,kill:(living:any[])=>any[])=>{g.start(0,level);g.clearOpening?.();g.shieldTime=999;g.step(1/60);const before=g.enemies.length,state0=g.counter.state;
   for(const e of kill(g.enemies.filter((u:any)=>!u.dead)))g.damageUnit(e,99999,g.player.visual.root.position);g.shieldTime=999;g.step(1/60);
   const p=g.player.visual.root.position,added=g.counter.units;
   return {state0,state:g.counter.state,added:added.length,total:g.enemies.length-before,near:added.length?Math.min(...added.map((u:any)=>u.visual.root.position.distanceTo(p))):0,hunting:added.every((u:any)=>u.encounter.active&&!u.pending),banner:!document.getElementById('title-card')!.hidden&&document.getElementById('title-card')!.textContent};};
  const half=(l:any[])=>l.slice(0,Math.ceil(l.length/2)+1);
  const counter=run(1,half);
  for(let i=0;i<120;i++){g.shieldTime=999;g.step(1/60);}
  const u=g.counter.units[0],moved=u.lastSeen!==undefined||u.dead;
  return {counter,moved,first:run(0,half),sweep:run(1,l=>l),brief:[0,1].map(level=>g.levelBriefing?.(0,level))};});
 expect(r.counter).toMatchObject({state0:'waiting',state:'arrived',added:4,total:4,hunting:true});
 expect(r.counter.near).toBeGreaterThan(38);expect(r.counter.banner).toContain('COUNTERATTACK');expect(r.moved).toBe(true);
 expect(r.first).toMatchObject({state0:'off',state:'off',added:0});
 expect(r.sweep).toMatchObject({state:'skipped',added:0});
});

test('story: a stage opens with a scene once, radio beats follow, and the closing scene leads to the results',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
 try{await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
  await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.storyScenes=true;g.showMenu();});
  await page.locator('[data-action=deploy]').click();
  const panel=page.locator('.story-panel');await expect(panel).toBeVisible();await expect(panel.locator('.story-line')).toHaveCount(1);await expect(panel.locator('.story-line.current strong')).toContainText('IVO');
  expect(await page.evaluate(()=>(window as any).__steel.phase)).toBe('menu');
  await page.locator('[data-action=story-next]').click();await expect(panel.locator('.story-line')).toHaveCount(2);
  await page.locator('[data-action=story-next]').click();await expect(page.locator('[data-action=story-next]')).toHaveText('DEPLOY →');
  const fits=await page.evaluate(()=>{const p=document.querySelector('.story-panel')!.getBoundingClientRect();return p.right<=innerWidth+1&&p.bottom<=innerHeight+1&&[...document.querySelectorAll('.story-panel button')].every(b=>b.getBoundingClientRect().height>=44);});expect(fits).toBe(true);
  await page.locator('[data-action=story-next]').click();
  expect(await page.evaluate(()=>{const g=(window as any).__steel;return {phase:g.phase,seen:g.save.story[0]};})).toEqual({phase:'playing',seen:1});
  const beats=await page.evaluate(()=>{const g=(window as any).__steel;g.clearOpening?.();g.shieldTime=999;g.radioTimer=0;g.elapsed=14;g.storyBeats();const early=g.radio.textContent;
   g.radioTimer=0;g.elapsed=31;for(const e of g.enemies.slice(0,Math.ceil(g.enemies.length/2)+1))g.damageUnit(e,99999,g.player.visual.root.position);g.radioTimer=0;g.storyBeats();return {early,half:g.radio.textContent};});
  expect(beats.early).toContain('MARA / Keep the gun toward them.');expect(beats.half).toContain('IVO / The loop just changed.');
  const replay=await page.evaluate(()=>{const g=(window as any).__steel;g.showMenu();g.prepare(0,0);g.menuAction('deploy');return {phase:g.phase,scene:!!document.querySelector('.story-panel')};});
  expect(replay).toEqual({phase:'playing',scene:false});
  await page.evaluate(()=>{const g=(window as any).__steel;g.save.level=2;g.start(0,2);g.clearOpening?.();g.complete();g.step(1.6);});
  await expect(panel).toBeVisible();await expect(panel.locator('.story-line.current p')).toContainText('Relay 07');
  await page.locator('[data-action=story-skip]').click();await expect(page.getByRole('heading',{name:'Mission accomplished'})).toBeVisible();
  const vi=await page.evaluate(()=>{const g=(window as any).__steel;g.save.story=[];g.prepare(0,0);g.showMenu();g.menuAction('language','vi');g.menuAction('deploy');return document.querySelector('.story-line p')!.textContent;});
  expect(vi).toContain('Cả dải tần');
 }finally{await context.close();}
});

test('the story has both languages for every line of all sixteen stages',async()=>{
 const {STORY,CAST}=await import('../src/three/story');
 expect(STORY).toHaveLength(16);
 for(const [i,s] of STORY.entries())for(const line of [...s.before,...s.after,s.early,s.half]){expect(CAST[line[0]],`stage ${i+1}`).toBeTruthy();expect(line[1].length,`stage ${i+1}`).toBeGreaterThan(5);expect(line[2].length,`stage ${i+1}`).toBeGreaterThan(5);expect(line[2]).not.toBe(line[1]);}
 expect(STORY.every(s=>s.before.length>=3&&s.after.length>=2)).toBe(true);
});
