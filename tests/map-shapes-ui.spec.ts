import {test,expect} from '@playwright/test';
for(const mobile of [false,true])test(`shaped route presentation ${mobile?'mobile':'desktop'}`,async({browser})=>{
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 for(const [stage,level,label] of [[4,0,'S'],[4,1,'flipped-S'],[5,0,'L'],[4,2,'U'],[7,1,'S-45']] as const){
  const result=await page.evaluate(async({stage,level,mobile})=>{const g=(window as any).__steel;g.frame=()=>{};g.start(stage,level);const {alongRoute}=await import('/src/three/stage-layout.ts');const p=alongRoute(g.world.layout.points,g.world.layout.length*.35);g.player.visual.root.position.set(p.x,0,p.z);g.syncVisual(g.player);g.world.target.copy(g.player.visual.root.position);const offset=g.world.cameraOffset(g.player.visual.root.position);g.world.target.x+=offset.x;g.world.target.z+=offset.z;g.world.update(0,g.player.visual.root.position);if(!mobile){g.world.scene.fog=null;g.world.camera.position.set(0,145,110);g.world.camera.lookAt(0,0,0);}g.world.renderer.render(g.world.scene,g.world.camera);g.updateHud();return {shape:g.world.layout.shape,overflow:document.documentElement.scrollWidth>innerWidth,calls:g.world.renderer.info.render.calls};},{stage,level,mobile});
  expect(result.shape).toBe(label);expect(result.overflow).toBe(false);expect(result.calls).toBeLessThan(1000);await page.screenshot({path:`test-results/shapes-${mobile?'mobile':'desktop'}-${label}.png`});
 }
 await page.evaluate(async()=>{const g=(window as any).__steel;await g.world.load(true);g.world.settings(true);g.world.renderer.render(g.world.scene,g.world.camera);});await page.screenshot({path:`test-results/shapes-${mobile?'mobile':'desktop'}-low.png`});expect(errors).toEqual([]);await context.close();
});
