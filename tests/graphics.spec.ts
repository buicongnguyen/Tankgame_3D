import {test,expect,webkit} from '@playwright/test';

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`mobile detail selection reduces geometry and survives reload ${viewport.width}`,async({browser})=>{
 const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:3});const page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');const graphics=page.locator('[data-action="quality"]');await expect(graphics).toHaveText('GRAPHICS DETAILED');
 const sample=()=>page.evaluate(()=>{const g=(window as any).__steel,w=g.world;let triangles=0;g.player.visual.root.traverse((o:any)=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return {triangles,ratio:w.renderer.getPixelRatio(),shadow:w.renderer.shadowMap.enabled,reflection:!!w.scene.environment,width:document.documentElement.scrollWidth,phase:g.phase};});
 const high=await sample();await graphics.tap();await expect(graphics).toHaveAttribute('aria-pressed','true');const low=await sample();
 expect(low.triangles).toBeLessThan(high.triangles*.4);expect(low.ratio).toBeLessThanOrEqual(.8);expect(low.shadow||low.reflection).toBe(false);expect(low.width).toBeLessThanOrEqual(viewport.width);expect(low.phase).toBe('menu');
 await graphics.scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/mobile-graphics-${viewport.width}.png`});
 const requests:string[]=[];page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url());});await page.reload();await expect(graphics).toHaveAttribute('aria-pressed','true');
 expect(requests).toHaveLength(19);expect(requests.every(url=>url.includes('/models/low/'))).toBe(true);expect((await sample()).triangles).toBe(low.triangles);
 // Switching back from a cold low-detail start must also restore every surface.
 await graphics.tap();await expect(graphics).toHaveAttribute('aria-pressed','false');expect((await sample()).triangles).toBe(high.triangles);
 await page.getByRole('button',{name:'DEPLOY'}).tap();await expect(page.locator('#hud')).toBeVisible();expect(errors).toEqual([]);await context.close();
});

test('pause switches all models without changing battle state or rig references',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const before=await page.evaluate(()=>{const g=(window as any).__steel;g.start(6);g.pause();g.player.hp=173;g.player.visual.turret.rotation.y=.8;g.world.applySkin(g.player.visual.root,'inferno');
 const boss=g.enemies.find((e:any)=>e.role==='boss');boss.visual.root.getObjectByName('Core').visible=true;
 const rocket=g.world.rocket();g.world.entities.add(rocket);
 (window as any).qualityRefs={player:g.player,hull:g.player.visual.hull,turret:g.player.visual.turret,muzzle:g.player.visual.muzzle,rocket,cover:g.world.covers[0]};
 const point=g.player.visual.muzzle.getWorldPosition(g.aimPoint.clone());return {hp:g.player.hp,elapsed:g.elapsed,ammo:g.specialAmmo,position:g.player.visual.root.position.toArray(),muzzle:point.toArray(),enemies:g.enemies.length};});
 const graphics=page.locator('[data-action="quality"]');await graphics.click();await expect(graphics).toHaveAttribute('aria-pressed','true');
 const after=await page.evaluate(()=>{const g=(window as any).__steel,r=(window as any).qualityRefs;const boss=g.enemies.find((e:any)=>e.role==='boss');let allMatch=true;const geometries=new Set();for(const root of g.world.templates.values())root.traverse((o:any)=>{if(o.isMesh)geometries.add(o.geometry);});g.world.scene.traverse((o:any)=>{if(o.isMesh&&o.userData.modelAsset&&!geometries.has(o.geometry))allMatch=false;});
 return {state:{hp:g.player.hp,elapsed:g.elapsed,ammo:g.specialAmmo,position:g.player.visual.root.position.toArray(),muzzle:g.player.visual.muzzle.getWorldPosition(g.aimPoint.clone()).toArray(),enemies:g.enemies.length},refs:r.player===g.player&&r.hull===g.player.visual.hull&&r.turret===g.player.visual.turret&&r.muzzle===g.player.visual.muzzle&&r.cover===g.world.covers[0],allMatch,skin:g.player.visual.root.userData.skin,core:boss.visual.root.getObjectByName('Core').visible,exhaust:!!r.rocket.getObjectByName('Exhaust'),phase:g.phase};});
 expect(after.state).toEqual(before);expect(after.refs&&after.allMatch&&after.core&&after.exhaust).toBe(true);expect(after.skin).toBe('inferno');expect(after.phase).toBe('paused');
 await page.getByRole('button',{name:'RESUME OPERATION'}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__steel.elapsed)).toBeGreaterThan(before.elapsed);
 await page.evaluate(()=>{const g=(window as any).__steel;g.pause();g.frame=()=>{};g.overlay.hidden=true;g.hud.hidden=true;g.world.arena.visible=false;g.world.ring.visible=false;g.world.cursor.visible=false;g.world.fx.clear();for(const child of g.world.entities.children)child.visible=child===g.player.visual.root;g.player.visual.root.position.set(0,0,0);g.player.visual.hull.rotation.y=0;g.player.visual.turret.rotation.y=0;g.world.camera.position.set(6,4.5,8);g.world.camera.lookAt(0,1,0);g.player.visual.bar.visible=false;g.world.renderer.render(g.world.scene,g.world.camera);});await page.screenshot({path:'test-results/low-detail-tank.png'});
});

test('failed detail download keeps current graphics and allows retry',async({page})=>{
 await page.goto('/?e2e');const graphics=page.locator('[data-action="quality"]');await expect(graphics).toBeVisible();
 await page.route('**/models/low/*.glb',route=>route.abort());await graphics.click();await expect(page.locator('#graphics-help')).toContainText('Tap to retry');await expect(graphics).toHaveAttribute('aria-pressed','false');
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return g.save.low||g.world.low||g.qualityChanging;})).toBe(false);
 await page.unroute('**/models/low/*.glb');await graphics.click();await expect(graphics).toHaveAttribute('aria-pressed','true');
});

test('iPhone WebKit can select low detail from pause and resume',async()=>{
 const browser=await webkit.launch();const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true,deviceScaleFactor:3});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5178/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();await page.locator('#pause').tap();
 const graphics=page.locator('[data-action="quality"]');await graphics.tap();await expect(graphics).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 // Windows WebKit screenshots can omit the composited WebGL canvas; inspect
 // the actual drawing buffer as well as checking the native-resolution UI.
 const pixels=await page.evaluate(()=>{const w=(window as any).__steel.world,r=w.renderer,gl=r.getContext();r.render(w.scene,w.camera);const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);const colors=new Set();for(let i=0;i<data.length;i+=64)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);return {colors:colors.size,error:gl.getError(),lost:gl.isContextLost()};});expect(pixels.colors).toBeGreaterThan(20);expect(pixels.error).toBe(0);expect(pixels.lost).toBe(false);
 await page.screenshot({path:'test-results/ios-low-detail.png'});await page.getByRole('button',{name:'RESUME OPERATION'}).tap();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
 await expect.poll(()=>page.evaluate(()=>(window as any).__steel.elapsed)).toBeGreaterThan(.1);expect(errors).toEqual([]);await browser.close();
});
