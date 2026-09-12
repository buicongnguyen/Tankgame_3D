import {test,expect} from '@playwright/test';
for(const [width,height] of [[390,844],[844,390]])test(`joystick directions, independent release and rotation ${width}x${height}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 // Test real pointer/resize events without live combat ending the mission on slow CI renderers.
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};});
 const cdp=await context.newCDPSession(page);const box=async(id:string)=>{const r=(await page.locator(id).boundingBox())!;return {x:r.x+r.width/2,y:r.y+r.height/2};};const left=await box('#move-pad'),right=await box('#aim-pad');
 const send=async(type:string,touchPoints:any[])=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints});await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));};
 const state=()=>page.evaluate(()=>{const i=(window as any).__steel.input;return {move:i.move,aim:i.aim,fire:i.touchFiring};});
 // Resting-thumb jitter must not drive; direction and analog strength remain predictable.
 await send('touchStart',[{...left,x:left.x+2,id:1}]);expect((await state()).move).toEqual({x:0,z:0});
 for(const [x,z] of [[1,0],[-1,0],[0,-1],[0,1]]){
  await send('touchMove',[{x:left.x+x*45,y:left.y+z*45,id:1}]);const m=(await state()).move;expect(m.x).toBeCloseTo(x);expect(m.z).toBeCloseTo(z);
 }
 await send('touchMove',[{x:left.x+15,y:left.y,id:1}]);expect((await state()).move.x).toBeGreaterThan(.1);expect((await state()).move.x).toBeLessThan(.8);
 const drive={x:left.x,y:left.y-45,id:1};await send('touchMove',[drive]);
 for(const [x,z] of [[1,0],[-1,0],[0,-1],[0,1]]){
  const aim={x:right.x+x*45,y:right.y+z*45,id:2};await send('touchStart',[drive,aim]);const s=await state();expect(s.aim.x).toBeCloseTo(x);expect(s.aim.z).toBeCloseTo(z);expect(s.fire).toBe(true);expect(s.move.z).toBe(-1);
  // CDP releases the supplied contact; the other finger remains captured.
  await send('touchEnd',[aim]);expect((await state()).fire).toBe(false);expect((await state()).move.z).toBe(-1);
 }
 // Drag beyond the visual pad and over the other stick: ownership must stay independent.
 const aim={x:right.x+45,y:right.y,id:2};await send('touchStart',[drive,aim]);await send('touchMove',[{x:right.x,y:right.y,id:1},aim]);expect((await state()).fire).toBe(true);
 await send('touchEnd',[{x:right.x,y:right.y,id:1}]);expect((await state()).move).toEqual({x:0,z:0});expect((await state()).fire).toBe(true);
 await page.screenshot({path:'test-results/joystick-'+width+'x'+height+'.png'});await page.setViewportSize({width:height,height:width});await expect.poll(state).toMatchObject({move:{x:0,z:0},fire:false});await expect(page.locator('.touch-pad.engaged')).toHaveCount(0);await send('touchCancel',[]);
 const fresh=await box('#move-pad');await send('touchStart',[{x:fresh.x,y:fresh.y-30,id:3}]);expect((await state()).move.z).toBeLessThan(0);await send('touchCancel',[]);expect((await state()).move).toEqual({x:0,z:0});await context.close();
});
test('aim trigger hysteresis and nub containment',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});const page=await context.newPage();await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
 // Test real pointer/resize events without live combat ending the mission on slow CI renderers.
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};});const cdp=await context.newCDPSession(page);
 const r=(await page.locator('#aim-pad').boundingBox())!,n=(await page.locator('#aim-pad .stick-nub').boundingBox())!,max=(r.width-n.width)/2-3;
 for(const [index,strength,fire] of [[0,.27,false],[1,.4,true],[2,.27,true],[3,.18,false],[4,4,true]] as const){await cdp.send('Input.dispatchTouchEvent',{type:index===0?'touchStart':'touchMove',touchPoints:[{x:r.x+r.width/2+strength*max,y:r.y+r.height/2,id:1}]});expect(await page.evaluate(()=>(window as any).__steel.input.touchFiring)).toBe(fire);}
 const nub=(await page.locator('#aim-pad .stick-nub').boundingBox())!;expect(nub.x+nub.width).toBeLessThanOrEqual(r.x+r.width);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('#aim-pad')).not.toHaveClass(/firing|engaged/);await context.close();
});
