import {test,expect} from '@playwright/test';
import {stageLayout} from '../src/three/stage-layout';
import {levelMission} from '../src/three/campaign';
import {roadVertices} from '../src/three/road-geometry';
import {roadDistance} from '../src/three/stage-layout';
import {DIFFICULTIES} from '../src/three/difficulty';

for(const difficulty of DIFFICULTIES)test(`${difficulty}: simple starts, longer routes and layered shortcuts`,()=>{
 let breaches=0;
 for(let stage=0;stage<16;stage++){
  const layouts=[0,1,2].map(level=>stageLayout(stage,level,levelMission(stage,level).kind,difficulty));
  expect(layouts[0].points.length).toBeLessThanOrEqual(levelMission(stage,0).kind==='defense'?5:2);
  expect(layouts[1].length,`${stage}/2`).toBeGreaterThan(layouts[0].length);expect(layouts[2].length,`${stage}/3`).toBeGreaterThan(layouts[1].length);
  for(let level=0;level<3;level++){const l=layouts[level];expect(l.landforms.length).toBeLessThanOrEqual(2);for(const layers of l.breaches){breaches++;expect(layers.length).toBe(level===2?3:2);expect(layers.every(b=>l.barriers.includes(b))).toBe(true);}}
 }
 expect(breaches).toBeGreaterThan(90);
});

test('every direct introductory road stays narrow, including arbitrary diagonal angles',()=>{
 for(let stage=0;stage<16;stage++){const layout=stageLayout(stage,0,levelMission(stage,0).kind);if(layout.points.length!==2)continue;
  const vertices=roadVertices(layout.points,layout.rotation);let area=0;
  for(let i=0;i<vertices.length;i+=9)area+=Math.abs((vertices[i+3]-vertices[i])*(vertices[i+8]-vertices[i+2])-(vertices[i+6]-vertices[i])*(vertices[i+5]-vertices[i+2]))/2;
  expect(area,`stage ${stage}`).toBeCloseTo(layout.length*8+64);
  for(let i=0;i<vertices.length;i+=3)expect(roadDistance(layout.points,{x:vertices[i],z:vertices[i+2]}),`stage ${stage}`).toBeLessThan(5.66);
 }
});

test('supply calls respect mission limits, shared cooldown, landing and retry cleanup',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};const rows:any[]=[];
  for(const difficulty of ['easy','normal','hard','crazy'])for(const stage of [0,1,3]){g.save.difficulty=difficulty;g.start(stage,0);rows.push({difficulty,stage,limit:g.airSupport.limit(g)});}
  g.save.difficulty='crazy';g.start(3,0);g.world.covers=[];g.enemies=[];g.world.activities=[];g.world.navigationRevision++;g.player.visual.root.position.set(0,0,0);g.player.hp=100;
  const accepted=g.airSupport.request(g),drop=g.airSupport.drops[0],a=drop.activity;g.player.visual.root.position.set(a.x,0,a.z);g.updateActivities(1);const airborne=a.airborne&&!a.spent&&g.player.hp===100;
  const double=g.airSupport.request(g);g.pause();const y=a.mesh.position.y;g.step(1);g.airSupport.update(g,1);const paused=a.mesh.position.y===y;g.resume();g.updateActivities(2.3);
  const landed=!a.airborne&&a.spent&&g.player.hp===135&&g.airSupport.drops.length===0&&!drop.rig.parent&&!drop.marker.parent;
  g.artilleryCooldown=0;g.player.visual.root.position.set(25,0,20);const second=g.airSupport.request(g);g.artilleryCooldown=0;const exhausted=!g.airSupport.request(g)&&g.airSupport.remaining(g)===0;
  const rig=g.airSupport.drops[0].rig;g.start(3,0);return {rows,accepted,airborne,double,paused,landed,second,exhausted,clean:g.airSupport.used===0&&g.airSupport.drops.length===0&&!rig.parent&&!g.world.activities.some((a:any)=>a.airborne)};
 });
 expect(r.rows.map(v=>v.limit)).toEqual([0,0,0,0,0,0,0,1,1,0,2,2]);expect(r.double).toBe(false);for(const [key,value] of Object.entries(r).filter(([k])=>!['rows','double'].includes(k)))expect(value,key).toBe(true);
});

test('supply payloads stay small and failed landing requests do not spend the allowance',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='hard';g.start(3,0);g.player.hp=100;
  const medical=g.airSupport.payload(g);g.player.hp=g.player.max;g.save.weapons=[3,4];g.specialAmmo=[12,0];const arc=g.airSupport.payload(g);g.specialAmmo=[0,6];const laser=g.airSupport.payload(g);g.specialAmmo=[12,6];const shield=g.airSupport.payload(g);
  const p=g.player.visual.root.position;g.world.covers=[{x:p.x,z:p.z,w:40,d:40,hp:Infinity}];const denied=!g.airSupport.request(g)&&g.airSupport.used===0&&g.artilleryCooldown===0;
  g.world.covers=[];g.world.activities=[];g.enemies=[];g.player.visual.root.position.set(0,0,0);g.specialAmmo=[0,6];g.airSupport.request(g);const a=g.airSupport.drops[0].activity;g.specialAmmo[0]=11;g.player.visual.root.position.set(a.x,0,a.z);g.updateActivities(3.3);
  return {medical,arc,laser,shield,denied,capped:g.specialAmmo[0]===12};
 });expect(r).toEqual({medical:{kind:'health',amount:40},arc:{kind:'arc',amount:2},laser:{kind:'laser',amount:4},shield:{kind:'shield',amount:4},denied:true,capped:true});
});

test('mine ring matches the enlarged trigger boundary and ignores airborne tanks',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.enemies=[];g.world.covers=[];g.world.activities=[];g.player.visual.root.position.set(40,0,40);g.world.navigationRevision++;
  const {createActivity}=await import('/src/three/activities.ts'),{MINE_TRIGGER_RADIUS:r}=await import('/src/three/combat-ranges.ts');const a=createActivity(g.world.arena,'mine',0,0);g.world.activities=[a];const tank=g.makeUnit(10,0,'heavy');g.enemies=[tank];tank.visual.root.position.set(r+.01,0,0);g.updateActivities(.01);const outside=!a.spent;
  tank.visual.root.position.set(r-.01,3,0);g.updateActivities(.01);const flying=!a.spent;tank.visual.root.position.y=0;const hp=tank.hp;g.updateActivities(.01);const inside=a.spent&&tank.hp<hp;const after=tank.hp;g.updateActivities(.01);
  return {radius:a.mesh.children[0].geometry.parameters.outerRadius,outside,flying,inside,once:tank.hp===after,depthWrite:a.mesh.children[0].material.depthWrite};
 });expect(r).toEqual({radius:2.7,outside:true,flying:true,inside:true,once:true,depthWrite:false});
});

test('extended sight still respects cover and warns before firing',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.world.navigationRevision++;g.moveUnit=()=>{};const {seesTarget}=await import('/src/three/encounters.ts');const rows=[];
  for(const [role,range] of [['rifleman',34],['raider',44],['boss',48]] as const){g.player.visual.root.position.set(0,0,range-1);const e=g.makeUnit(0,0,role);e.visual.root.position.set(0,0,0);const extended=seesTarget(g,e,g.player.visual.root.position);g.player.visual.root.position.z=range+.01;const bounded=!seesTarget(g,e,g.player.visual.root.position);g.player.visual.root.position.z=range-1;g.world.covers=[{x:0,z:10,w:8,d:2,hp:Infinity}];const blocked=!seesTarget(g,e,g.player.visual.root.position);g.world.covers=[];rows.push({extended,bounded,blocked});}
  g.player.visual.root.position.set(0,0,30);const e=g.makeUnit(0,0,'sentry');e.visual.root.position.set(0,0,0);e.cooldown=1.15;g.enemies=[e];g.updateEnemies(.01);return {rows,warning:e.visual.beam.visible&&g.shots.length===0};
 });expect(r.rows.every(row=>Object.values(row).every(Boolean))).toBe(true);expect(r.warning).toBe(true);
});

test('batched shortcut walls stop laser at the second row and open local cannon breaches',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(4,2);const layers=g.world.layout.breaches[0];const panels=g.world.covers.filter((c:any)=>c.section&&layers.some((b:any)=>Math.abs(c.z-b.z)<.01&&Math.abs(c.x-b.x)<b.w/2));g.world.covers=panels;g.enemies=[];g.world.navigationRevision++;const column=panels.filter((c:any)=>Math.abs(c.x-panels[0].x)<.01).sort((a:any,b:any)=>b.z-a.z),first=column[0],second=column[1];g.player.visual.root.position.set(first.x,0,first.z+12);g.player.aim=Math.PI;g.syncVisual(g.player);
  const target=g.makeUnit(first.x,first.z-1.5,'rifleman');target.visual.root.position.set(first.x,0,first.z-1.5);target.hp=10000;const behind=g.makeUnit(first.x,second.z-1.5,'rifleman');behind.visual.root.position.set(first.x,0,second.z-1.5);behind.hp=10000;g.enemies=[target,behind];g.special.fire(g,3);const laser=target.hp<10000&&behind.hp===10000&&panels.every((c:any)=>c.hp===176),batch=first.section.parts===second.section.parts&&first.section.wall!==second.section.wall;
  g.enemies=[];for(const c of column)for(let i=0;i<4;i++)g.hitCover(c,44);const {segmentBox}=await import('/src/three/rules.ts');const open=!panels.some((c:any)=>c.hp>0&&segmentBox({x:first.x,z:first.z+3},{x:first.x,z:column.at(-1).z-3},c,1.25)!==null),adjacent=panels.some((c:any)=>c.hp===176);
  await g.world.load(true);return {laser,batch,open,adjacent,stable:column.every((c:any)=>c.section.parts[0].instanceMatrix.array[c.section.index*16]===0)};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});

for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}])test(`air support keyboard/touch UI ${viewport.width}`,async({browser})=>{
 const mobile=viewport.width!==1440,ctx=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='hard';g.start(3,0);g.player.hp=100;g.world.update(0,g.player.visual.root.position);});
 if(mobile)await page.locator('#artillery').tap();else await page.keyboard.press('r');await expect(page.locator('#support-picker')).toBeVisible();await expect(page.locator('#supply-allowance')).toHaveText('1 left · nearby landing');
 const box=(await page.locator('#support-picker').boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
 await page.screenshot({path:`test-results/air-support-menu-${viewport.width}.png`});
 if(mobile)await page.locator('[data-support="support-drop"]').tap();else await page.keyboard.press('2');await expect(page.locator('#support-picker')).toBeHidden();expect(await page.evaluate(()=>(window as any).__steel.airSupport.drops.length)).toBe(1);
 await page.evaluate(async()=>{const g=(window as any).__steel;if(window.innerWidth<900){await g.world.load(true);g.world.settings(true);}g.updateActivities(1);g.world.update(0,g.player.visual.root.position);});await page.screenshot({path:`test-results/air-support-flight-${viewport.width}.png`});
 if(!mobile){await page.keyboard.press('r');await page.keyboard.press('Escape');await expect(page.locator('#support-picker')).toBeHidden();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);expect(errors).toEqual([]);await ctx.close();
});
