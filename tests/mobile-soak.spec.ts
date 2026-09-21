import {test,expect} from '@playwright/test';

test('three-minute mobile battle keeps graphics resources bounded',async({browser},testInfo)=>{
 test.setTimeout(240000);
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:3});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).tap();
  await page.evaluate(()=>{
   const g=(window as any).__steel;g.save.difficulty='crazy';g.start(13,2);g.player.hp=g.player.max=1e9;
   g.player.visual.root.position.set(0,0,0);g.save.weapons=[5];g.weapon=5;g.input.keys.add('Space');
   for(const e of g.enemies){e.hp=e.max=1e9;if(e.encounter)e.encounter.active=true;}
   // Keep impacts active even while distant patrols are behind cover.
   (window as any).__soakTimer=setInterval(()=>g.world.fx.impact(g.player.visual.root.position.clone().setY(1),true),150);
  });
  const samples:any[]=[];
  for(let i=0;i<6;i++){
   await page.waitForTimeout(30000);
   samples.push(await page.evaluate(()=>{const g=(window as any).__steel,w=g.world;return {elapsed:g.elapsed,phase:g.phase,low:w.low,lost:w.renderer.getContext().isContextLost(),frames:w.renderer.info.render.frame,...w.renderer.info.memory,programs:w.renderer.info.programs.length,particles:w.fx.particles.length,pooled:w.fx.pooled,wrecks:w.wrecks.length,children:w.entities.children.length,shots:g.shots.length};}));
  }
  console.log('MOBILE_SOAK_RESOURCES',JSON.stringify(samples));
  await testInfo.attach('mobile-soak-resources',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
  for(const s of samples){expect(s.phase).toBe('playing');expect(s.low).toBe(true);expect(s.lost).toBe(false);expect(s.particles+s.pooled).toBeLessThanOrEqual(48);expect(s.wrecks).toBeLessThanOrEqual(6);expect(s.geometries).toBeLessThanOrEqual(samples[0].geometries+80);expect(s.textures).toBeLessThanOrEqual(samples[0].textures+2);expect(s.programs).toBeLessThanOrEqual(samples[0].programs+8);}
  expect(samples.at(-1).frames-samples[0].frames).toBeGreaterThan(300);expect(samples.at(-1).elapsed).toBeGreaterThan(60);expect(errors).toEqual([]);
 }finally{await context.close();}
});
