import {test,expect} from '@playwright/test';
import {freshSave,parseSave} from '../src/three/campaign';
import {SKINS,buySkin} from '../src/three/skins';
import {TANK_FLAGS} from '../src/three/tank-flags';
import MARKINGS from '../src/three/skin-markings.json' with {type:'json'};

test('automatic Low migrates to High without overriding manual or recovery Low',()=>{
 expect(freshSave()).toMatchObject({low:false,flag:'none'});
 for(const [graphicsChosen,low,expected] of [[false,true,false],[false,false,false],[true,true,true],[true,false,false],[undefined,true,true],[undefined,false,false]] as const){
  const s={...freshSave(),credits:312,skin:'sunburst',low,graphicsChosen};
  expect(parseSave(JSON.stringify(s))).toMatchObject({credits:312,skin:'sunburst',low:expected});
 }
 for(const flag of TANK_FLAGS)expect(parseSave(JSON.stringify({...freshSave(),flag:flag.id})).flag).toBe(flag.id);
 for(const flag of [undefined,null,'invalid','<script>'])expect(parseSave(JSON.stringify({...freshSave(),flag})).flag).toBe('none');
});

test('new vivid skins keep existing price and combat tiers with matching authored stars',()=>{
 for(const [id,reference] of [['coral','volt'],['tropical','guardian'],['acid','inferno'],['aurora','sentinel']]){
  const skin=SKINS.find(s=>s.id===id)!,old=SKINS.find(s=>s.id===reference)!;
  expect([skin.price,skin.speed,skin.damage,skin.shield]).toEqual([old.price,old.speed,old.damage,old.shield]);
  const save=freshSave();save.credits=skin.price;expect(buySkin(save,id)).toBe(true);expect(buySkin(save,id)).toBe(false);
  expect(parseSave(JSON.stringify(save))).toMatchObject({skin:id,credits:0});
  const paint=MARKINGS[id as keyof typeof MARKINGS];expect(paint.stars).toBe((skin as any).stars);
  expect(paint.positions.length).toBe(paint.colors.length);expect(paint.positions.length/9).toBeLessThanOrEqual(112);
 }
 expect(MARKINGS.classic.stars).toBe(1);
});

test('mobile flag selection persists into missions and training; None removes it',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');await page.locator('[data-action=hangar]').tap();
 await page.getByLabel('Country flag').selectOption('vn');await expect(page.getByLabel('Country flag')).toHaveValue('vn');
 await page.screenshot({path:'test-results/vivid-skins-mobile.png'});
 expect(await page.locator('#overlay').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.reload();await page.getByRole('button',{name:'START TRAINING'}).tap();
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return [g.save.flag,g.player.visual.root.getObjectByName('SkinMarkings').userData.flag];})).toEqual(['vn','vn']);
 await page.evaluate(()=>{const g=(window as any).__steel;g.leaveTraining();g.prepare(0);g.showMenu();});
 await page.getByRole('button',{name:'DEPLOY'}).tap();
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {flag:g.player.visual.root.userData.flag,enemies:g.enemies.some((e:any)=>!!e.visual.root.getObjectByName('SkinMarkings'))};})).toEqual({flag:'vn',enemies:false});
 await page.reload();await page.locator('[data-action=hangar]').tap();await expect(page.getByLabel('Country flag')).toHaveValue('vn');
 await page.getByLabel('Country flag').selectOption('none');await page.reload();await page.locator('[data-action=hangar]').tap();await expect(page.getByLabel('Country flag')).toHaveValue('none');
 expect(errors).toEqual([]);await context.close();
});

test('flags share one cached paint mesh, survive detail swaps and stay within the draw budget',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(async()=>{
  const g=(window as any).__steel,w=g.world,root=g.player.visual.root;g.frame=()=>{};g.pause();g.overlay.hidden=true;g.hud.hidden=true;
  w.arena.visible=false;w.ring.visible=false;w.cursor.visible=false;w.shield.visible=false;w.fx.clear();for(const o of w.entities.children)o.visible=o===root;
  root.position.set(0,0,0);g.player.visual.hull.rotation.y=0;g.player.visual.turret.rotation.y=0;g.player.visual.bar.visible=false;
  w.camera.position.set(6,4.5,8);w.camera.lookAt(0,1,0);
  const rows=[],{SKINS}=await import('/src/three/skins.ts');
  for(const {id} of SKINS)for(const flag of ['none','vn','jp','fr','de','it','ua','pl','id']){
   w.applySkin(root,id,flag);w.renderer.render(w.scene,w.camera);
   const mesh=root.getObjectByName('SkinMarkings');rows.push({id,flag,calls:w.renderer.info.render.calls,triangles:(mesh?.geometry.attributes.position.count??0)/3});
  }
  const cached=w.skinMarkings.geometries.size;
  for(let i=0;i<30;i++)for(const flag of ['none','vn','jp','fr','de','it','ua','pl','id'])w.applySkin(root,'classic',flag);
  w.applySkin(root,'classic','vn');const mesh=root.getObjectByName('SkinMarkings'),geometry=mesh.geometry;
  await w.load(true);w.settings(true);const same=mesh===root.getObjectByName('SkinMarkings')&&geometry===mesh.geometry;
  await w.load(false);w.settings(false);w.renderer.render(w.scene,w.camera);
  let meshes=0;root.traverse((o:any)=>{if(o.name==='SkinMarkings')meshes++;});
  return {rows,cached,after:w.skinMarkings.geometries.size,same,meshes,flag:mesh.userData.flag};
 });
 for(const {id} of SKINS){
  const rows=r.rows.filter(x=>x.id===id),base=rows.find(x=>x.flag==='none')!;
  for(const row of rows){expect(row.triangles-base.triangles).toBeLessThanOrEqual(70);expect(row.calls-base.calls).toBe(row.flag==='none'||base.triangles>0?0:1);}
 }
 expect(r).toMatchObject({same:true,meshes:1,flag:'vn'});expect(r.after).toBe(r.cached);
 await page.screenshot({path:'test-results/cobalt-kestrel-flag.png'});
 await page.evaluate(()=>{const g=(window as any).__steel;g.world.camera.position.set(-6,4.5,-8);g.world.camera.lookAt(0,1,0);g.world.renderer.render(g.world.scene,g.world.camera);});
 await page.screenshot({path:'test-results/cobalt-kestrel-flag-rear.png'});
});
