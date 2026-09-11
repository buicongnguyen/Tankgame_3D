import {test,expect} from '@playwright/test';
import {awardStage} from '../src/three/results';
import {freshSave,parseSave} from '../src/three/campaign';
test('time and hull bonuses are bounded, saved and awarded only once per level',()=>{
 const save=freshSave(),r=awardStage(save,0,45,50,100,0);expect(r).toMatchObject({base:117,timeBonus:15,healthBonus:15,total:147,healthPercent:50});expect(parseSave(JSON.stringify(save)).credits).toBe(147);expect(awardStage(save,0,0,100,100,0)).toMatchObject({replay:true,total:0});expect(save.credits).toBe(147);expect(awardStage(freshSave(),0,200,200,100,0)).toMatchObject({timeBonus:0,healthBonus:29});const defense={...freshSave(),mission:3,cleared:Array.from({length:16},(_,i)=>i<3)};expect(awardStage(defense,3,45,100,100,0)).toMatchObject({timeBonus:0,healthBonus:46,target:0});
});

test('last tank destruction gets 0.8 seconds before results and combat stops',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};for(const e of g.enemies.filter((u:any)=>!g.isInfantry(u)))g.damageUnit(e,9999,g.player.visual.root.position);g.step(.016);});await expect(page.locator('body')).toHaveAttribute('data-phase','finishing');await expect(page.locator('#overlay')).toBeHidden();
 const r=await page.evaluate(()=>{const g=(window as any).__steel,hp=g.player.hp,time=g.elapsed,credits=g.save.credits;g.complete();g.step(.79);return {phase:g.phase,stable:g.player.hp===hp&&g.elapsed===time&&g.save.credits===credits,active:g.input.active};});expect(r).toEqual({phase:'finishing',stable:true,active:false});await page.evaluate(()=>(window as any).__steel.step(.011));await expect(page.getByRole('heading',{name:'Mission accomplished'})).toBeVisible();await expect(page.getByText('Total earned')).toBeVisible();await page.screenshot({path:'test-results/stage-results-desktop.png'});
});
test('phone result summary and shop navigation fit',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();await page.evaluate(()=>{const g=(window as any).__steel;g.elapsed=45;g.player.hp=g.player.max*.5;g.complete();});await expect(page.getByRole('heading',{name:'Mission accomplished'})).toBeVisible();expect(await page.evaluate(()=>{const e=document.querySelector('#overlay')!;return e.scrollWidth<=e.clientWidth;})).toBe(true);await page.screenshot({path:'test-results/stage-results-mobile.png'});await page.locator('[data-action=shop]').tap();await expect(page.getByRole('heading',{name:'Field shop'})).toBeVisible();await context.close();
});

test('finish uses real time even when rendering frames are far apart',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel,frame=g.frame.bind(g);g.frame=()=>{};g.complete();frame(g.finishDeadline-1);const before=g.phase;frame(g.finishDeadline);return {before,after:g.phase};});expect(r).toEqual({before:'finishing',after:'depot'});
});
