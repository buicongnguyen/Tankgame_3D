import {test,expect} from '@playwright/test';
import {RenderPacer} from '../src/three/render-pacer';

test('60 Hz movement keeps every frame despite ordinary early/late RAF jitter',()=>{
 for(const jitter of [.7,1.5]){
  const pacer=new RenderPacer(),times:number[]=[];
  for(let i=0;i<300;i++){
   const now=i*1000/60+(i===0?0:i%2?jitter:-jitter);
   if(pacer.due(now,60))times.push(now);
  }
  expect(times).toHaveLength(300);
  expect(Math.max(...times.slice(1).map((t,i)=>t-times[i]))).toBeLessThan(20);
 }
});

test('moving and reversing in level two keeps static shadows aligned to their texel grid',async({page})=>{
 await page.goto('/?e2e');await page.waitForFunction(()=>(window as any).__steel?.phase==='menu');
 const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.frame=()=>{};g.start(0,1);
  const w=g.world,p=g.player.visual.root.position,light=w.sun;
  // Exercise the real camera/light update without queueing hundreds of GPU frames.
  const render=w.renderer.render;w.renderer.render=()=>{};
  const point=p.clone().set(0,0,0),uv=()=>{
   light.updateMatrixWorld();light.target.updateMatrixWorld();light.shadow.updateMatrices(light);
   const q=point.clone().applyMatrix4(light.shadow.matrix);
   return {x:q.x*light.shadow.mapSize.x,y:q.y*light.shadow.mapSize.y};
  };
  const before=uv();let error=0,directionError=0;
  for(let i=0;i<360;i++){
   // Fast lateral and downward travel, then reverse across a U-route bend.
   const t=i/60;p.set(-50+Math.sin(t*2)*5,0,40+Math.cos(t*2)*5);
   w.update(1/60,p);const q=uv();
   for(const delta of [q.x-before.x,q.y-before.y])error=Math.max(error,Math.abs(delta-Math.round(delta)));
   directionError=Math.max(directionError,light.position.clone().sub(light.target.position).distanceTo(point.clone().set(-28,48,20)));
  }
  w.renderer.render=render;w.update(0,p);
  return {error,directionError,shadow:w.renderer.shadowMap.enabled};
 });
 expect(r.shadow).toBe(true);expect(r.error).toBeLessThan(1e-7);expect(r.directionError).toBeLessThan(1e-9);
});

test('a direction reversal cannot whip the camera lead or reset it during a paused frame',async({page})=>{
 await page.goto('/?e2e');await page.waitForFunction(()=>(window as any).__steel?.phase==='menu');
 const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.frame=()=>{};const w=g.world;
  w.cameraOffset=()=>({x:8,z:0});g.start(0,1);
  const p=g.player.visual.root.position,render=w.renderer.render;w.renderer.render=()=>{};
  w.cameraOffset=()=>({x:-8,z:0});w.update(1/60,p);
  const step=8-w.smoothLead.x,lead=w.smoothLead.clone(),target=w.target.clone();
  w.update(0,p);const frozen=lead.equals(w.smoothLead)&&target.equals(w.target);
  w.renderer.render=render;g.start(0,1);
  return {step,frozen,reset:w.smoothLead.x===-8};
 });expect(r.step).toBeLessThanOrEqual(8/60+1e-9);expect(r.frozen).toBe(true);expect(r.reset).toBe(true);
});


for(const mobile of [false,true])test(`level-two fast travel and reversals stay framed ${mobile?'phone':'desktop'}`,async({browser})=>{
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');await page.waitForFunction(()=>(window as any).__steel?.phase==='menu');
 const result=await page.evaluate(async()=>{
  const g=(window as any).__steel;g.frame=()=>{};
  const w=g.world,{routeSample}=await import('/src/three/stage-layout.ts');
  let maxStep=0,maxScreen=0,maxLeadSpeed=0;
  for(const low of [false,true]){
   w.settings(low);g.start(2,1); // The second level's freely reversible O loop.
   const p=g.player.visual.root.position,render=w.renderer.render;
   w.renderer.render=()=>{};
   let previous=w.camera.position.clone(),lead=w.smoothLead.clone();
   // 18 m/s includes fast skins/upgrades; change direction every two seconds.
   for(let i=0;i<480;i++){
    const reverse=Math.floor(i/120)%2===1,t=(i%120)/60;
    const meters=(reverse?2-t:t)*18,q=routeSample(w.layout.points,meters);
    p.set(q.x,0,q.z);w.loopReverse=reverse;w.update(1/60,p);
    maxStep=Math.max(maxStep,w.camera.position.distanceTo(previous));previous.copy(w.camera.position);
    maxLeadSpeed=Math.max(maxLeadSpeed,w.smoothLead.distanceTo(lead)*60);lead.copy(w.smoothLead);
    w.camera.updateMatrixWorld();const screen=p.clone().project(w.camera);
    maxScreen=Math.max(maxScreen,Math.abs(screen.x),Math.abs(screen.y));
    // Submit a few real frames; numerical sampling must not flood the software GPU.
    if(i%120===0){render.call(w.renderer,w.scene,w.camera);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
   }
   w.renderer.render=render;w.update(0,p);w.renderer.getContext().finish();
  }
  return {maxStep,maxScreen,maxLeadSpeed,lost:w.renderer.getContext().isContextLost(),overflow:document.documentElement.scrollWidth>innerWidth};
 });
 expect(result.maxStep).toBeLessThan(.5);expect(result.maxScreen).toBeLessThan(.9);expect(result.maxLeadSpeed).toBeLessThanOrEqual(8+1e-8);
 expect(result.lost||result.overflow).toBe(false);expect(errors).toEqual([]);
 await page.screenshot({path:`test-results/stable-movement-${mobile?'mobile':'desktop'}.png`});await context.close();
});
