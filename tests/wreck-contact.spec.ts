import {test,expect} from '@playwright/test';

test('track contact requires actual speed, respects cover and counts only infantry',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};
  const setup=(mission=0)=>{g.start(mission);g.world.covers=[];for(const e of g.enemies)e.dead=true;const e=g.enemies.find((e:any)=>g.isInfantry(e));e.dead=false;e.hp=e.max=35;e.visual.root.visible=true;g.player.visual.root.position.set(-4,0,0);e.visual.root.position.set(0,0,0);return e;};
  let e=setup();g.moveUnit(g.player,7,0,.7);const fast=e.dead&&g.infantryKills===1&&g.kills===0&&g.world.activities.length===12;g.moveUnit(g.player,-7,0,.7);const once=g.infantryKills===1;
  e=setup();g.player.visual.root.position.set(-1.7,0,0);g.moveUnit(g.player,0,0,.1);const still=!e.dead;g.moveUnit(g.player,.15,0,.1);const slow=!e.dead;
  e=setup();g.world.covers=[{x:-1,z:0,w:.5,d:6,hp:Infinity}];g.moveUnit(g.player,7,0,.7);const wall=!e.dead&&g.player.visual.root.position.x<-2;
  e=setup(11);g.player.visual.root.position.set(-25,0,30);e.visual.root.position.set(-23,0,30);g.moveUnit(g.player,4.5,0,.5);const sand=!e.dead&&g.player.visual.root.position.x<-24;
  e=setup(9);g.player.visual.root.position.set(-25,0,30);e.visual.root.position.set(-23.5,0,30);g.player.velocity={x:9,z:0};g.moveUnit(g.player,0,0,.1);const ice=e.dead;
  e=setup();g.pause();g.moveUnit(g.player,7,0,.7);const paused=!e.dead;
  e=setup();const tank=g.enemies.find((u:any)=>!g.isInfantry(u));tank.dead=false;tank.visual.root.position.set(-4,0,0);g.player.visual.root.position.set(50,0,50);g.moveUnit(tank,7,0,.7);const allies=!e.dead;
  return {fast,once,still,slow,wall,sand,ice,paused,allies};
 });expect(result).toEqual({fast:true,once:true,still:true,slow:true,wall:true,sand:true,ice:true,paused:true,allies:true});
});

for(const mission of [7,9])for(const width of [390,1440])test(`wrecks stay above winter surfaces ${mission}-${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:900});await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();await page.evaluate(()=>{(window as any).__steel.frame=()=>{};});
 for(const low of [false,true]){
  const result=await page.evaluate(async({mission,low})=>{const g=(window as any).__steel;g.start(mission);await g.world.load(low);g.world.settings(low);g.hud.hidden=true;
   const u=g.enemies[0];u.visual.root.position.set(-24,0,30);g.damageUnit(u,99999,g.player.visual.root.position);const wreck=g.world.wrecks[0];g.world.fx.clear();wreck.age=20;const stable= wreck.scorch.position.y>.10&&wreck.scorch.parent===g.world.entities&&wreck.scorch.material.depthTest&&!wreck.scorch.material.depthWrite&&wreck.scorch.material.polygonOffset&&!u.visual.root.visible;
   let selfShadow=false;wreck.root.traverse((o:any)=>{if(o.isMesh&&o.receiveShadow)selfShadow=true;});
   for(let i=0;i<6;i++){g.player.visual.root.position.set(-24+i*.4,0,30-i*.4);g.world.update(.1,g.player.visual.root.position);}
   return {stable,selfShadow,near:g.world.camera.near};
  },{mission,low});expect(result.stable).toBe(true);expect(result.selfShadow).toBe(false);expect(result.near).toBe(.5);await page.screenshot({path:`test-results/wreck-${mission}-${width}-${low?'low':'high'}.png`});
 }
});

test('winter ground marks remain visible through camera motion and bounded cleanup',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};const contrast:number[]=[];
  for(const mission of [7,9]){
   g.start(mission);g.world.fx.root.visible=false;g.world.environment.weather.visible=false;const u=g.enemies[0];u.visual.root.position.set(-24,0,30);g.damageUnit(u,99999,g.player.visual.root.position);const w=g.world.wrecks[0];w.root.visible=false;
   for(let i=0;i<6;i++){
    g.world.camera.position.set(-20+i*.12,54,70-i*.12);g.world.camera.lookAt(-24,0,30);g.world.camera.updateMatrixWorld();
    const p=w.scorch.position.clone();p.x+=1;p.project(g.world.camera);const gl=g.world.renderer.getContext(),x=Math.floor((p.x+1)*.5*gl.drawingBufferWidth),y=Math.floor((p.y+1)*.5*gl.drawingBufferHeight),sample=new Uint8Array(4);
    w.scorch.visible=true;g.world.renderer.render(g.world.scene,g.world.camera);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,sample);const dark=sample[0]+sample[1]+sample[2];w.scorch.visible=false;g.world.renderer.render(g.world.scene,g.world.camera);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,sample);contrast.push(sample[0]+sample[1]+sample[2]-dark);w.scorch.visible=true;
   }
  }
  // An aiming ring must remain readable on top of cosmetic burn marks.
  g.start(9);g.world.fx.root.visible=false;g.world.environment.weather.visible=false;const victim=g.enemies[0];victim.visual.root.position.set(-24,0,30);g.damageUnit(victim,99999,g.player.visual.root.position);const wreck=g.world.wrecks[0];wreck.root.visible=false;g.world.cursor.visible=true;g.world.cursor.position.set(-24,.07,30);g.world.cursor.scale.setScalar(1);g.world.camera.position.set(-24,12,42);g.world.camera.lookAt(-24,0,30);g.world.camera.updateMatrixWorld();const point=g.world.cursor.position.clone();point.x+=.715;point.project(g.world.camera);const gl=g.world.renderer.getContext(),pixel=new Uint8Array(4),px=Math.floor((point.x+1)*.5*gl.drawingBufferWidth),py=Math.floor((point.y+1)*.5*gl.drawingBufferHeight);g.world.renderer.render(g.world.scene,g.world.camera);gl.readPixels(px,py,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const marked=Array.from(pixel);wreck.scorch.visible=false;g.world.renderer.render(g.world.scene,g.world.camera);gl.readPixels(px,py,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const aimDifference=marked.slice(0,3).reduce((sum,c,i)=>sum+Math.abs(c-pixel[i]),0);
  const marks:any[]=[];for(let i=0;i<18;i++){g.world.destroyTank(g.enemies[0].visual);marks.push(g.world.wrecks.at(-1).scorch);}
  const bounded=g.world.wrecks.length===14&&marks.slice(0,4).every(m=>!m.parent);g.start(0);return {contrast,bounded,aimDifference,cleanup:marks.every(m=>!m.parent)};
 });expect(Math.min(...result.contrast)).toBeGreaterThan(20);expect(result.bounded&&result.cleanup).toBe(true);expect(result.aimDifference).toBeLessThanOrEqual(8);
});


test('frontier instances switch detail and release only their own GPU resources',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(13);const instances=g.world.arena.children.filter((o:any)=>o.isInstancedMesh);let disposed=0,sharedDisposed=0;for(const o of instances){o.addEventListener('dispose',()=>disposed++);o.geometry.addEventListener('dispose',()=>sharedDisposed++);}const first=instances[0],matrix=Array.from(first.instanceMatrix.array),before=first.geometry.attributes.position.count,material=first.material;await g.world.load(true);g.world.settings(true);const switched=before>first.geometry.attributes.position.count&&first.material===material&&JSON.stringify(matrix)===JSON.stringify(Array.from(first.instanceMatrix.array))&&first.boundingSphere.radius>0;g.start(0);return {count:instances.length,disposed,sharedDisposed,switched};});expect(result.count).toBeGreaterThan(0);expect(result.switched).toBe(true);expect(result.disposed).toBe(result.count);expect(result.sharedDisposed).toBe(0);
});
