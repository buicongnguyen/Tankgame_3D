import {test,expect} from '@playwright/test';

for(const mobile of [false,true])test(`boss warnings stay accurate in ${mobile?'mobile':'desktop'} Detailed and Low`,async({browser})=>{
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1200,height:800},hasTouch:mobile,isMobile:mobile});const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(6,2);const b=g.enemies.find((u:any)=>u.role==='boss');for(const e of g.enemies)if(e!==b){e.dead=true;e.visual.root.visible=false;}g.enemies=[b];b.visual.root.position.set(0,0,0);g.player.visual.root.position.set(0,0,26);g.bosses.update(g,b,4.1);g.updateHud();});
 for(const low of [false,true]){
  const r=await page.evaluate(async low=>{const g=(window as any).__steel;if(low){g.pause();await g.world.load(true);g.world.settings(true);g.resume();g.frame=()=>{};}const b=g.enemies[0],s=g.bosses.states.get(b);g.world.update(0,g.player.visual.root.position);g.world.camera.position.set(15,48,65);g.world.camera.lookAt(0,0,20);g.world.renderer.render(g.world.scene,g.world.camera);g.updateHud();return {radii:s.markers.map((m:any)=>m.geometry.parameters.outerRadius),visible:s.markers.every((m:any)=>m.visible&&m.parent===g.world.entities),phase:s.phase,overflow:document.documentElement.scrollWidth>innerWidth};},low);
  expect(r).toEqual({radii:[6.5,6.5,6.5],visible:true,phase:'charging',overflow:false});await expect(page.locator('#boss-readout')).toContainText('ATTACK INBOUND');await page.screenshot({path:`test-results/boss-warning-${mobile?'mobile':'desktop'}-${low?'low':'detailed'}.png`});
 }
 expect(errors).toEqual([]);await context.close();
});
