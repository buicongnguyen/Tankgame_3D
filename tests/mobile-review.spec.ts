import { test, expect, webkit } from '@playwright/test';
const sizes=[[320,568],[360,640],[390,844],[412,915],[568,320],[667,375],[844,390]];
for(const [width,height] of sizes)test(`mobile layout ${width}x${height}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5178/?e2e');await page.getByRole('button',{name:'DEPLOY'}).waitFor();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'DEPLOY'}).tap();
 if(height>width){await expect.poll(()=>page.evaluate(()=>{const g=(window as any).__steel;const p=g.player.visual.root.position.clone();p.y=1;p.project(g.world.camera);const y=(1-p.y)*innerHeight/2;return y<document.querySelector('.bottom-hud')!.getBoundingClientRect().top-10;}),{timeout:10000}).toBe(true);}
 const boxes=await page.evaluate(()=>['move-pad','aim-pad','artillery','shield','repair','weapon','pause'].map(id=>{const r=document.getElementById(id)!.getBoundingClientRect();return {id,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};}));
 for(const box of boxes){expect(box.x,box.id).toBeGreaterThanOrEqual(0);expect(box.y,box.id).toBeGreaterThanOrEqual(0);expect(box.right,box.id).toBeLessThanOrEqual(width+1);expect(box.bottom,box.id).toBeLessThanOrEqual(height+1);if(['artillery','shield','repair','pause'].includes(box.id))expect(box.h,box.id).toBeGreaterThanOrEqual(44);}
 for(const a of boxes)for(const b of boxes){if(a.id>=b.id)continue;expect(a.x<b.right-1&&a.right>b.x+1&&a.y<b.bottom-1&&a.bottom>b.y+1,`${a.id} overlaps ${b.id}`).toBe(false);}
 await page.screenshot({path:`test-results/mobile-${width}x${height}.png`});await page.locator('#pause').tap();await expect(page.locator('body')).toHaveAttribute('data-phase','paused');await page.getByRole('button',{name:'RESUME OPERATION'}).tap();expect(errors).toEqual([]);await context.close();
});
test('touch center preserves direction, pause cancels ownership, resume accepts fresh touch',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();await page.goto('http://127.0.0.1:5178/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 const r=(await page.locator('#aim-pad').boundingBox())!,l=(await page.locator('#move-pad').boundingBox())!;const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2+28,y:r.y+r.height/2,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});
 expect(await page.evaluate(()=>(window as any).__steel.input.aim.x)).toBeCloseTo(1);
 await page.evaluate(()=>{const g=(window as any).__steel;g.pause();window.dispatchEvent(new Event('blur'));});await expect(page.locator('body')).toHaveAttribute('data-phase','paused');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.getByRole('button',{name:'RESUME OPERATION'}).tap();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:l.x+l.width/2,y:l.y+l.height/2-28,id:2},{x:r.x+r.width/2+28,y:r.y+r.height/2,id:3}]});
 await expect.poll(()=>page.evaluate(()=>{const i=(window as any).__steel.input;return i.move.z<0&&i.touchFiring;})).toBe(true);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect.poll(()=>page.evaluate(()=>{const i=(window as any).__steel.input;return i.move.z===0&&!i.touchFiring;})).toBe(true);await context.close();
});
test('lethal damage cannot be repaired and approaching enemies retain fire warning',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{const g=(window as any).__steel;const pad=g.world.activities.find((a:any)=>a.kind==='repair');g.player.visual.root.position.set(pad.x,0,pad.z);g.damageUnit(g.player,9999,pad);g.step(1/60);const failed=g.phase==='failed';g.start(0);g.player.visual.root.position.set(0,0,0);for(const e of g.enemies)e.cooldown=10;const e=g.enemies[1];e.encounter.active=true;e.visual.root.position.set(0,0,-60);e.cooldown=-4;g.updateEnemies(.1);e.visual.root.position.set(0,0,-20);g.updateEnemies(.1);return {failed,warning:e.cooldown>0&&e.visual.beam.visible,shots:g.shots.length};});expect(result).toEqual({failed:true,warning:true,shots:0});
});
// WebKit validates the rendering engine, not physical iOS hardware.
test('WebKit mobile startup and touch action controls',async()=>{
 const browser=await webkit.launch({args:[]});const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5178/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();await page.locator('#artillery').tap();await expect(page.locator('#artillery-label')).toContainText('s');await page.locator('#pause').tap();await expect(page.locator('body')).toHaveAttribute('data-phase','paused');await page.screenshot({path:'test-results/mobile-webkit.png'});expect(errors).toEqual([]);await browser.close();
});

test('long mobile objectives leave radio space and the convoy waits for blocking tanks',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});const page=await context.newPage();await page.goto('http://127.0.0.1:5178/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 for(let mission=0;mission<6;mission++){
  await page.evaluate(i=>{const g=(window as any).__steel;g.start(i);g.updateHud();},mission);
  const spacing=await page.evaluate(()=>({bottom:document.querySelector('.mission-hud')!.getBoundingClientRect().bottom,top:document.querySelector('#radio')!.getBoundingClientRect().top}));expect(spacing.top).toBeGreaterThanOrEqual(spacing.bottom+7);
 }
 const escort=await page.evaluate(()=>{const g=(window as any).__steel;g.start(2);g.player.visual.root.position.set(0,0,45.5);g.step(.1);const stopped=g.convoyBlocked&&g.convoy.position.z===48;g.player.visual.root.position.set(5,0,48);g.step(.1);return {stopped,moving:g.convoy.position.z<48};});expect(escort).toEqual({stopped:true,moving:true});await context.close();
});

test('touch weapon selection executes once and abilities work while driving',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('http://127.0.0.1:5178/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 await page.evaluate(()=>{const g=(window as any).__steel;g.fieldWeaponCount=3;});await page.locator('#weapon').tap();await page.locator('[data-weapon="2"]').tap();expect(await page.evaluate(()=>(window as any).__steel.weapon)).toBe(1);
 const l=(await page.locator('#move-pad').boundingBox())!,b=(await page.locator('#shield').boundingBox())!;const cdp=await context.newCDPSession(page);
 const drive={x:l.x+l.width/2,y:l.y+l.height/2-25,id:1};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[drive]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[drive,{x:b.x+b.width/2,y:b.y+b.height/2,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:2}]});
 await expect.poll(()=>page.evaluate(()=>{const g=(window as any).__steel;return g.shieldTime>0&&g.input.move.z<0;})).toBe(true);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await context.close();
});
