import {test,expect,type Page} from '@playwright/test';
import {freshSave,parseSave} from '../src/three/campaign';
import {medalsFor,medalsEarned,recordMedals,heldMedals,medalCount,normalizeMedals} from '../src/three/medals';

const PHONE={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const LANDSCAPE={viewport:{width:844,height:390},isMobile:true,hasTouch:true};
async function ready(page:Page){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};});
}
const run={kind:'assault',time:60,target:90,rearHits:0,supportCalls:0,objectiveShare:1,squadSurvivors:0};

test('each level has three medal goals chosen by mission type',()=>{
 expect(medalsFor('assault',90).map(m=>m.id)).toEqual(['swift','flanker','lone']);
 expect(medalsFor('defense',0).map(m=>m.id)).toEqual(['bulwark','flanker','lone']);
 expect(medalsFor('defense',120).map(m=>m.id)).toEqual(['bulwark','flanker','lone']);
 expect(medalsFor('escort',150).map(m=>m.id)).toEqual(['swift','flanker','passage']);
 expect(medalsFor('rescue',150).map(m=>m.id)).toEqual(['swift','flanker','squad']);
 expect(medalsEarned(run)).toEqual([true,false,true]);
 expect(medalsEarned({...run,time:91,rearHits:3,supportCalls:1})).toEqual([false,true,false]);
 expect(medalsEarned({...run,kind:'escort',objectiveShare:.59})).toEqual([true,false,false]);
 expect(medalsEarned({...run,kind:'escort',objectiveShare:.6})).toEqual([true,false,true]);
 expect(medalsEarned({...run,kind:'rescue',squadSurvivors:1})).toEqual([true,false,false]);
 expect(medalsEarned({...run,kind:'rescue',squadSurvivors:2})).toEqual([true,false,true]);
 expect(medalsEarned({...run,kind:'defense',target:0,objectiveShare:.4})).toEqual([false,false,true]);
});

test('medals are kept per level, pay once, and survive a save round trip',()=>{
 const save=freshSave();
 expect(recordMedals(save,2,1,[true,false,true])).toEqual([true,false,true]);
 expect(recordMedals(save,2,1,[true,true,false])).toEqual([false,true,false]);
 expect(heldMedals(save,2,1)).toEqual([true,true,true]);expect(heldMedals(save,2,0)).toEqual([false,false,false]);expect(medalCount(save,2)).toBe(3);
 const loaded=parseSave(JSON.stringify(save));expect(heldMedals(loaded,2,1)).toEqual([true,true,true]);
 expect(normalizeMedals([9,'x',-1.5,2]).slice(0,4)).toEqual([1,0,0,2]);
 const old=JSON.parse(JSON.stringify(freshSave()));delete old.medals;expect(parseSave(JSON.stringify(old)).medals!.every(n=>n===0)).toBe(true);
});

test('sound is on for new players and stays off once switched off',()=>{
 expect(freshSave().sound).toBe(true);
 const legacy=JSON.parse(JSON.stringify(freshSave()));legacy.sound=false;delete legacy.soundChosen;expect(parseSave(JSON.stringify(legacy)).sound).toBe(true);
 const chosen={...freshSave(),sound:false,soundChosen:true};expect(parseSave(JSON.stringify(chosen)).sound).toBe(false);
});

test('the sound bank plays named sounds, spaces out repeats and respects the sound setting',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.sound=true;g.sfx.play('buy');g.sfx.play('buy');g.sfx.play('kill');const on={...g.sfx.played};g.save.sound=false;g.sfx.play('win');g.tone(440,.05,.02);return {on,off:g.sfx.played.win??0};});
 expect(r.on).toMatchObject({buy:1,kill:1});expect(r.off).toBe(0);
});

test('hostile hits show summed damage numbers; rear hits stand out and count for the Flanker medal',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.start(0,0);g.clearOpening?.();
  const e=g.enemies.find((u:any)=>!g.isInfantry(u)&&u.role!=='jeep'&&!u.dead);e.pending=false;e.hp=e.max=400;const p=e.visual.root.position;
  const front={x:p.x+Math.sin(e.heading)*8,z:p.z+Math.cos(e.heading)*8},rear={x:p.x-Math.sin(e.heading)*8,z:p.z-Math.cos(e.heading)*8};
  g.damageUnit(e,20,front);g.damageUnit(e,20,front);g.hits.update(.2,g.world.camera,innerWidth,innerHeight);
  const first=[...document.querySelectorAll('.hit-layer b:not([hidden])')].map(b=>[b.textContent,b.className]);
  g.damageUnit(e,20,rear);g.hits.update(.2,g.world.camera,innerWidth,innerHeight);
  const second=[...document.querySelectorAll('.hit-layer b:not([hidden])')].map(b=>[b.textContent,b.className]);
  const before=g.hits.shown;g.damageUnit(g.player,5,front);g.hits.update(.2,g.world.camera,innerWidth,innerHeight);
  g.hits.update(1,g.world.camera,innerWidth,innerHeight);
  return {first,second,rear:g.rearHits,playerSilent:g.hits.shown===before,cleared:document.querySelectorAll('.hit-layer b:not([hidden])').length};});
 expect(r.first).toEqual([['26','normal']]);
 expect(r.second).toContainEqual(['30','weak']);
 expect(r).toMatchObject({rear:1,playerSilent:true,cleared:0});
});

test('a mission opens with a title card that never takes a tap',async({browser})=>{
 const context=await browser.newContext(PHONE),page=await context.newPage();
 try{await ready(page);await page.evaluate(()=>(window as any).__steel.start(2,1));
  const card=page.locator('#title-card');await expect(card).toBeVisible();await expect(card).toContainText('STAGE 3 / 16 · LEVEL 2 / 3');await expect(card).toContainText('Homeward');
  expect(await card.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(card).toBeHidden({timeout:6000});
 }finally{await context.close();}
});

test('the debrief awards medals once, celebrates, and NEXT LEVEL starts the next fight',async({browser})=>{
 const context=await browser.newContext(PHONE),page=await context.newPage();
 try{await ready(page);
  const first=await page.evaluate(()=>{const g=(window as any).__steel;g.start(0,0);g.clearOpening?.();g.rearHits=3;g.elapsed=40;const before=g.save.credits;g.complete();const total=g.stageResult.total;g.step(1.6);return {gain:g.save.credits-before,total,phase:g.phase,medals:g.save.medals[0]};});
  expect(first.gain).toBe(first.total+75);expect(first).toMatchObject({phase:'depot',medals:7});
  await expect(page.locator('.debrief-panel .medal.held.fresh')).toHaveCount(3);await expect(page.locator('.debrief-panel .medal em').first()).toHaveText('+25 CR');
  const primary=page.locator('.debrief-panel button.primary');await expect(primary).toHaveText('NEXT LEVEL →');await expect(primary).toBeFocused();
  const fits=await page.evaluate(()=>{const p=document.querySelector('.debrief-panel')!,o=document.getElementById('overlay')!;return {wide:p.scrollWidth<=p.clientWidth+1&&o.scrollWidth<=o.clientWidth+1,buttons:[...p.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44)};});
  expect(fits).toEqual({wide:true,buttons:true});
  await page.locator('[data-action=shop]').click();await page.locator('[data-action=shop-back]').click();
  await expect(page.locator('.debrief-panel.seen')).toBeVisible();
  await page.locator('[data-action=next-level]').click();
  expect(await page.evaluate(()=>{const g=(window as any).__steel;return {phase:g.phase,mission:g.mission,level:g.level};})).toEqual({phase:'playing',mission:0,level:1});
  const again=await page.evaluate(()=>{const g=(window as any).__steel;g.start(0,0);g.clearOpening?.();g.rearHits=3;g.elapsed=40;const before=g.save.credits;g.complete();const total=g.stageResult.total;g.step(1.6);return {gain:g.save.credits-before,total,fresh:document.querySelectorAll('.medal.fresh').length,held:document.querySelectorAll('.medal.held').length};});
  expect(again.gain).toBe(again.total);expect(again).toMatchObject({fresh:0,held:3});
 }finally{await context.close();}
});

test('support calls cost the Self-reliant medal',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.strikeCharges=2;g.start(0,0);g.clearOpening?.();const none=g.supportCalls;g.artilleryCooldown=0;g.action('support-strike');const called=g.supportCalls;g.elapsed=40;g.complete();return {none,called,held:g.medalResult.held,defs:g.medalResult.defs.map((d:any)=>d.id)};});
 expect(r.none).toBe(0);expect(r.defs[2]).toBe('lone');expect(r.held[2]).toBe(r.called===0);
});

test('the defeat card shows the fight so far and offers retry, shop and command',async({browser})=>{
 const context=await browser.newContext(PHONE),page=await context.newPage();
 try{await ready(page);
  await page.evaluate(()=>{const g=(window as any).__steel;g.save.credits=500;g.start(0,0);g.clearOpening?.();g.elapsed=75;g.kills=2;g.fail();});
  const panel=page.locator('.defeat-panel');await expect(panel).toBeVisible();await expect(panel.locator('.defeat-stats')).toContainText('1:15');await expect(panel.locator('.defeat-stats')).toContainText('HOSTILES');
  await expect(panel.locator('button.primary')).toHaveText('RETRY FIRST LIGHT →');
  await panel.locator('[data-action=shop]').click();await expect(page.locator('.depot-panel')).toBeVisible();
  await page.locator('[data-action=shop-back]').click();await expect(page.locator('.defeat-panel')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__steel.phase)).toBe('failed');
  await page.locator('[data-action=retry]').click();expect(await page.evaluate(()=>(window as any).__steel.phase)).toBe('playing');
 }finally{await context.close();}
});

test('landscape phone shop: DONE sits in the header and never covers an item',async({browser})=>{
 const context=await browser.newContext(LANDSCAPE),page=await context.newPage();
 try{await ready(page);await page.evaluate(()=>{const g=(window as any).__steel;g.save.credits=900;g.showMenu();});
  await page.locator('[data-action=shop]').click();
  for(const tab of ['equipment','systems','support','skins']){
   await page.locator(`[data-action=shop-tab][data-value=${tab}]`).click();
   const r=await page.evaluate(()=>{const done=document.querySelector('[data-action=shop-back]')!.getBoundingClientRect(),list=document.querySelector<HTMLElement>('.depot-panel>.shop-category,.depot-panel>.skin-grid')!,l=list.getBoundingClientRect();
    const hit=(a:DOMRect,b:DOMRect)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    return {overList:hit(done,l),inView:done.top>=0&&done.bottom<=innerHeight&&done.right<=innerWidth,tall:done.height>=44,listRoom:l.height,short:list.scrollHeight<=list.clientHeight+1,scrolls:getComputedStyle(list).overflowY==='auto',panelFits:document.querySelector('.depot-panel')!.getBoundingClientRect().bottom<=innerHeight+1};});
   expect(r,tab).toMatchObject({overList:false,inView:true,tall:true,scrolls:true,panelFits:true});expect(r.short||r.listRoom>150,tab).toBe(true);
  }
 }finally{await context.close();}
});
