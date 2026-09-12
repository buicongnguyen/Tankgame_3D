import {test,expect} from '@playwright/test';
import {freshSave,parseSave,MISSIONS} from '../src/three/campaign';
import {grantBackgroundStrikes} from '../src/three/strike-bank';
import {BARRAGE} from '../src/three/barrage';
import {WEAPONS} from '../src/three/armory';
import {ammoCaps} from '../src/three/loot';
import {ammoCapacity} from '../src/three/skins';
import {FLAME} from '../src/three/flamethrower';

test('exact balance and background allowance migrate and bank without replay farming',()=>{
 expect([WEAPONS[8].price,WEAPONS[8].capacity]).toEqual([800,100]);expect(WEAPONS[8].damage).toBeCloseTo(24*.8);expect(FLAME.burnDps).toBeCloseTo(18*.8);
 expect([BARRAGE.count,BARRAGE.damage]).toEqual([6,90]);
 expect(ammoCaps('classic')).toEqual([12,6,3,100]);expect(ammoCaps('quartermaster')).toEqual([15,8,4,250]);expect(ammoCapacity('quartermaster',6)).toBe(8);
 const s=freshSave();expect(grantBackgroundStrikes(s,0)).toBe(2);s.strikeCharges--;
 expect(grantBackgroundStrikes(s,0)).toBe(0);expect(grantBackgroundStrikes(s,1)).toBe(2);expect(s.strikeCharges).toBe(3);
 expect(parseSave(JSON.stringify(s))).toEqual(s);
 for(const invalid of [-1,99,.5,NaN])expect(grantBackgroundStrikes(s,invalid)).toBe(0);
 const old:any=freshSave();old.mission=3;old.cleared.fill(true,0,3);old.weapons=[8];old.credits=700;
 delete old.strikeCharges;delete old.strikeBackgrounds;
 const migrated=parseSave(JSON.stringify(old));expect(migrated.weapons).toEqual([8]);expect(migrated.credits).toBe(700);
 expect(grantBackgroundStrikes(migrated,0)).toBe(0);expect(grantBackgroundStrikes(migrated,3)).toBe(2);expect(migrated.strikeCharges).toBe(2);
 const complete:any={...old,mission:MISSIONS.length-1,cleared:Array(MISSIONS.length).fill(true)};
 expect(grantBackgroundStrikes(parseSave(JSON.stringify(complete)),MISSIONS.length-1)).toBe(2);
});

test('fuel counts trigger bursts, refuses empty fire, prefers higher ammo and refills owned fuel',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.weapons=[3,4,7,8];g.save.equippedWeapon=8;g.start(0);g.enemies=[];g.world.covers=[];g.world.activities=[];g.player.visual.root.position.set(0,0,0);const full=g.specialAmmo[3];
 const before=g.shotsFired;for(let i=0;i<99;i++)g.shoot(g.player,true);const penultimate=g.specialAmmo[3]===1&&g.weapon===8;g.shoot(g.player,true);
 const empty=g.specialAmmo[3]===0&&g.weapon===7&&g.shotsFired===before+100&&g.reload>0&&g.save.equippedWeapon===8;
 g.weapon=8;g.shoot(g.player,true);const refused=g.shotsFired===before+100&&g.weapon===7;
 g.weapon=3;g.specialAmmo[0]=1;g.shoot(g.player,true);const higher=g.weapon===4;
 g.save.skin='quartermaster';g.start(0);const bonus=g.specialAmmo[3];g.shoot(g.player,true);g.pause();await g.changeQuality();g.resume();const quality=g.specialAmmo[3]===249;g.start(0);
 return {full,penultimate,empty,refused,higher,bonus,quality,refill:g.specialAmmo[3]===250};});
 expect(r).toEqual({full:100,penultimate:true,empty:true,refused:true,higher:true,bonus:250,quality:true,refill:true});
});

test('Strike calls persist through reload and retry; previews cannot grant and Drop works with zero strikes',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.enemies=[];g.world.covers=[];g.world.activities=[];g.player.visual.root.position.set(0,0,0);const first=g.save.strikeCharges;
 const empty=!g.callArtillery()&&g.save.strikeCharges===first;
 const enemy=g.makeUnit(10,0,'heavy');enemy.visual.root.position.set(10,0,0);g.enemies=[enemy];const accepted=g.callArtillery()&&g.save.strikeCharges===first-1;
 const duplicate=!g.callArtillery()&&g.save.strikeCharges===first-1;g.clearBarrage();g.artilleryCooldown=0;g.callArtillery();g.clearBarrage();g.artilleryCooldown=0;
 const denied=!g.callArtillery()&&g.save.strikeCharges===0;g.updateHud();const disabled=(g.el('artillery') as HTMLButtonElement).disabled;
 const drop=g.airSupport.request(g)&&g.save.strikeCharges===0;g.prepare(1);const preview=g.save.strikeCharges===0;g.start(0);const retry=g.save.strikeCharges===0;g.start(1);const bank=g.save.strikeCharges===2;g.start(1,1);const level=g.save.strikeCharges===2;g.start(0);return {first,empty,accepted,duplicate,denied,disabled,drop,preview,retry,bank,level,back:g.save.strikeCharges===2};});
 expect(r).toEqual({first:2,empty:true,accepted:true,duplicate:true,denied:true,disabled:true,drop:true,preview:true,retry:true,bank:true,level:true,back:true});
 await page.reload();await page.getByRole('button',{name:'DEPLOY'}).click();expect(await page.evaluate(()=>(window as any).__steel.save.strikeCharges)).toBe(2);
});

for(const viewport of [{width:320,height:568},{width:390,height:844},{width:568,height:320},{width:844,height:390}])test(`compact touch mission HUD stays readable and clear ${viewport.width}`,async({browser})=>{
 const ctx=await browser.newContext({viewport,isMobile:true,hasTouch:true}),page=await ctx.newPage();
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 for(const stage of [0,2,9,12]){
  const r=await page.evaluate(stage=>{const g=(window as any).__steel;g.frame=()=>{};g.start(stage,2);g.shieldTime=4;g.updateHud();g.world.renderer.render(g.world.scene,g.world.camera);const card=document.querySelector('.mission-hud')!.getBoundingClientRect(),pause=g.el('pause').getBoundingClientRect(),radio=g.radio.getBoundingClientRect();return {height:card.height,right:card.right,pause:pause.left,radio:radio.top,bottom:card.bottom,overflow:document.documentElement.scrollWidth>innerWidth,text:g.el('objective-compact').textContent};},stage);
  expect(r.height,JSON.stringify(r)).toBeLessThanOrEqual(90);expect(r.right).toBeLessThan(r.pause);expect(r.radio).toBeGreaterThan(r.bottom);expect(r.overflow).toBe(false);expect(r.text.length).toBeGreaterThan(0);
  await expect(page.locator('#objective-compact')).toBeVisible();await expect(page.locator('#mission-number')).toBeHidden();
 }
 await page.screenshot({path:`test-results/compact-mission-${viewport.width}.png`});await ctx.close();
});
