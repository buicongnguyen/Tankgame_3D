import {test,expect} from '@playwright/test';

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])test(`route and supply presentation ${viewport.width}`,async({browser})=>{
 const mobile=viewport.width!==1440,context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(4,0);g.hazards.clock=999;g.player.visual.root.position.set(-18,0,-25);g.world.target.copy(g.player.visual.root.position);g.world.update(1,g.player.visual.root.position);g.updateHud();});
 if(!mobile){await page.evaluate(()=>{const g=(window as any).__steel;g.hud.hidden=true;g.world.scene.fog=null;g.world.camera.position.set(0,145,105);g.world.camera.lookAt(0,0,0);g.world.renderer.render(g.world.scene,g.world.camera);});await page.screenshot({path:'test-results/routes-desktop-overview.png'});}
 for(const low of [false,true]){
  const r=await page.evaluate(async low=>{const g=(window as any).__steel;g.hud.hidden=false;await g.world.load(low);g.world.settings(low);g.start(7,0);g.frame=()=>{};const {routeSample}=await import('/src/three/stage-layout.ts');const spawnDrop=(fraction:number,roll:number)=>{const sequence=[.1,roll];g.lootRandom=()=>sequence.shift()??.99;g.dropSalvage(routeSample(g.world.layout.points,g.world.layout.length*fraction));};spawnDrop(.45,.1);spawnDrop(.49,.4);const health=g.world.activities.filter((a:any)=>a.kind==='health'),shields=g.world.activities.filter((a:any)=>a.kind==='shield');const pairs=health.flatMap((h:any)=>shields.map((s:any)=>({h,s,d:Math.hypot(h.x-s.x,h.z-s.z)}))).sort((a:any,b:any)=>a.d-b.d);const {h,s}=pairs[0];g.player.visual.root.position.set((h.x+s.x)/2-5,0,(h.z+s.z)/2);g.world.target.set((h.x+s.x)/2,0,(h.z+s.z)/2);g.world.update(0,g.player.visual.root.position);g.updateHud();return {overflow:document.documentElement.scrollWidth>innerWidth,health:h.mesh.children.some((o:any)=>o.isMesh&&o.material.color.getHex()===0xeaf4ef),shield:s.mesh.children.some((o:any)=>o.isMesh&&o.geometry.type==='CylinderGeometry'&&o.geometry.parameters.radialSegments===6),calls:g.world.renderer.info.render.calls};},low);
  expect(r.overflow).toBe(false);expect(r.health&&r.shield).toBe(true);expect(r.calls).toBeLessThan(1000);await page.screenshot({path:`test-results/supplies-${viewport.width}-${low?'low':'detailed'}.png`});
 }
 expect(errors).toEqual([]);await context.close();
});

test('southbound start keeps default aim facing along its route',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(7);g.input.hasMouse=false;g.input.hasTouchAim=false;g.updatePlayer(.1);return {south:g.aimPoint.z>g.player.visual.root.position.z,heading:Math.cos(g.player.aim)>0,camera:g.world.cameraLead()>0};});expect(r).toEqual({south:true,heading:true,camera:true});
});
