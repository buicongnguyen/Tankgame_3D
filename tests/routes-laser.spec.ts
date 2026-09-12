import {addTestPickups} from './activity-fixtures';
import {test,expect} from '@playwright/test';
import {stageLayout,roadDistance,isWeaponSupply} from '../src/three/stage-layout';
import {MISSIONS,levelMission} from '../src/three/campaign';

test('every level has reproducible, separated supplies and varied routes',()=>{
 const fingerprints=new Set<string>();let south=0;
 for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){
  const layout=stageLayout(stage,level,levelMission(stage,level).kind);expect(layout).toEqual(stageLayout(stage,level,levelMission(stage,level).kind));
  expect(layout.supplies).toHaveLength(7);expect(layout.supplies.filter(s=>s.kind!=='mine').map(s=>s.kind)).toEqual(['repair']);
  for(const [i,s] of layout.supplies.entries()){expect(Math.abs(s.x)).toBeLessThan(69);expect(Math.abs(s.z)).toBeLessThan(57);for(const t of layout.supplies.slice(i+1))expect(Math.hypot(s.x-t.x,s.z-t.z)).toBeGreaterThan(6.5);if(isWeaponSupply(s.kind)){expect(roadDistance(layout.points,s)).toBeLessThanOrEqual(1.1);}else if(s.kind!=='mine'){expect(roadDistance(layout.points,s)).toBeGreaterThan(7.2);expect(roadDistance(layout.points,s)).toBeLessThan(9.31);}}
  fingerprints.add(JSON.stringify(layout.supplies));if(layout.southbound)south++;
 }
 expect(fingerprints.size).toBe(48);expect(south).toBeGreaterThan(0);
});

test('upgraded laser pierces one concrete and never damages either barrier after repeated shots',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.player.visual.root.position.set(0,0,35);g.player.aim=Math.PI;
 const targets=[28,12,-8,-30].map(z=>{const e=g.makeUnit(0,z,'heavy');e.visual.root.position.set(0,0,z);e.hp=e.max=10000;return e;});g.enemies=targets;
 const wall=(z:number,kind='barricade',hp=Infinity)=>{const mesh=g.world.clone(kind);mesh.position.set(0,0,z);g.world.arena.add(mesh);return {x:0,z,w:6,d:1.8,kind,hp,mesh};};
 const first=wall(20),second=wall(0,'stonewall',180),children=[first,second].map(c=>c.mesh.children.length);g.world.covers=[second,first];g.save.upgrades.power=3;g.save.skin='inferno';g.powerBoost=25;g.specialAmmo[0]=12;g.weapon=3;
 g.shoot(g.player,true);const one=targets.map(e=>e.hp<10000),hp=targets.map(e=>e.hp);
 g.shoot(g.player,true);const two=targets.map((e,i)=>e.hp<hp[i]);
 for(let i=0;i<4;i++)g.shoot(g.player,true);
 const intact=first.hp===Infinity&&second.hp===180&&[first,second].every((c,i)=>c.mesh.visible&&c.mesh.children.length===children[i]);
 const stillBlocked=targets[2].hp===10000;
 // A stone wall destroyed by another weapon no longer counts toward penetration.
 g.hitCover(second,200);g.shoot(g.player,true);const throughBreach=second.hp<=0&&targets[2].hp<10000,range=targets[3].hp===10000;
 const steel=wall(24,'steelwall');g.world.covers=[steel];const before=targets.map(e=>e.hp);g.shoot(g.player,true);const steelStops=targets[0].hp<before[0]&&targets.slice(1).every((e,i)=>e.hp===before[i+1])&&steel.hp===Infinity;
 g.start(0);return {one,two,intact,stillBlocked,throughBreach,range,steelStops,cleanup:g.special.beams.length===0};});
 expect(result).toEqual({one:[true,true,false,false],two:[true,true,false,false],intact:true,stillBlocked:true,throughBreach:true,range:true,steelStops:true,cleanup:true});
});

test('laser hits infantry and aircraft through damaged stone without damaging the stone',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(()=>{
 const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.player.visual.root.position.set(0,0,35);g.player.aim=Math.PI;
 const infantry=g.makeUnit(0,28,'rifleman'),heli=g.makeUnit(0,10,'boss','helicopter');heli.visual.root.position.set(0,7,10);heli.hp=10000;g.enemies=[infantry,heli];const mesh=g.world.clone('stonewall');mesh.position.set(0,0,20);const stone={x:0,z:20,w:6,d:1.4,hp:7,kind:'stonewall',mesh};g.world.covers=[stone];const children=mesh.children.length;g.special.fire(g,3);const dead=infantry.dead,air=heli.hp<10000,first=stone.hp===7;const kills=g.infantryKills;for(let i=0;i<3;i++)g.special.fire(g,3);return {dead,air,first,intact:stone.hp===7&&stone.mesh.visible&&mesh.children.length===children,once:g.infantryKills===kills};});expect(Object.values(result).every(Boolean),JSON.stringify(result)).toBe(true);
});

test('all 48 real layouts keep routes, supplies and spawns clear',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const issues=await page.evaluate(async()=>{
 const g=(window as any).__steel;g.frame=()=>{};const {circleBox,segmentBox}=await import('/src/three/rules.ts');const issues:any[]=[];
 for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){
  g.start(stage,level);const covers=g.world.covers.filter((c:any)=>c.hp>0),route=g.world.layout;
  for(const u of [g.player,...g.enemies])if(covers.some((c:any)=>circleBox(u.visual.root.position,g.unitRadius(u),c)))issues.push({stage,level,overlap:u.role});
  for(let i=1;i<route.points.length;i++)for(const c of covers)if(segmentBox(route.points[i-1],route.points[i],c,2.3)!==null)issues.push({stage,level,blocked:c.kind,x:c.x,z:c.z});
  for(const a of g.world.activities.filter((a:any)=>a.kind!=='mine')){if(covers.some((c:any)=>circleBox(a,2.8,c)))issues.push({stage,level,pickup:a.kind});if(covers.some((c:any)=>['fuelcrate','barrel'].includes(c.kind)&&Math.hypot(c.x-a.x,c.z-a.z)<7))issues.push({stage,level,fuelNear:a.kind});}
  if(g.convoy&&covers.some((c:any)=>circleBox(g.convoy.position,2.3,c)))issues.push({stage,level,convoy:true});
 }return issues;
 });expect(issues).toEqual([]);
});

for(const stage of [2,7,11,15])test(`escort ${MISSIONS[stage].name} follows all bends to its actual extraction`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(async stage=>{
 const g=(window as any).__steel;g.frame=()=>{};const {alongRoute}=await import('/src/three/stage-layout.ts');const {distance,circleBox}=await import('/src/three/rules.ts');const results=[];
 for(let level=0;level<3;level++){g.start(stage,level);for(const e of g.enemies)e.dead=true;let steps=0,clipped=false;
  const end=g.world.layout.points.at(-1);g.convoy.position.set(end.x,0,end.z);const noTeleportWin=g.objectiveProgress()<1;const start=g.world.layout.points[0];g.convoy.position.set(start.x,0,start.z);if(g.world.layout.closed){g.player.visual.root.position.set(start.x+5,0,start.z);g.updateConvoy(0);}
  while(g.convoyDistance<g.world.layout.length-.001&&steps++<5000){const p=g.convoy.position,next=alongRoute(g.world.layout.points,g.convoyDistance+.1),angle=Math.atan2(next.x-p.x,next.z-p.z);g.player.visual.root.position.set(p.x+Math.cos(angle)*4,0,p.z-Math.sin(angle)*4);g.updateConvoy(.1);if(g.world.covers.some((c:any)=>c.hp>0&&circleBox(g.convoy.position,2.3,c)))clipped=true;}
  results.push({level,complete:distance(g.convoy.position,end)<.01,progress:g.convoyDistance/g.world.layout.length,noTeleportWin,clipped,seconds:steps*.1});
 }return results;
 },stage);for(const r of result){expect(r.complete,JSON.stringify(r)).toBe(true);expect(r.progress).toBeCloseTo(1);expect(r.clipped).toBe(false);expect(r.noTeleportWin).toBe(true);expect(r.seconds).toBeLessThan(levelMission(stage,r.level).parTime);}
});

test('health and shield cases are finite and never waste full-health recovery',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();await addTestPickups(page,['health','shield']);const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};for(const e of g.enemies)e.dead=true;
 const health=g.world.activities.find((a:any)=>a.kind==='health'),shield=g.world.activities.find((a:any)=>a.kind==='shield');g.player.visual.root.position.set(health.x,0,health.z);g.updateActivities(.01);const full=!health.spent;g.player.hp=g.player.max-20;g.updateActivities(.01);const capped=health.spent&&g.player.hp===g.player.max;g.player.hp-=100;g.updateActivities(.01);const once=g.player.hp===g.player.max-100;
 g.player.visual.root.position.set(shield.x,0,shield.z);g.shieldCooldown=10;g.updateActivities(.01);const protectedNow=g.shieldTime===6&&g.shieldCooldown===10&&shield.spent;const hp=g.player.hp;g.damageUnit(g.player,1000,shield);g.updateActivities(.01);const protectedOnce=g.player.hp===hp&&g.shieldTime===6;g.action('shield');const manualCannotShorten=g.shieldTime===6;
 return {full,capped,once,protectedNow,protectedOnce,manualCannotShorten};});expect(Object.values(result).every(Boolean),JSON.stringify(result)).toBe(true);
});

test('provoked ground attacker navigates around a concrete checkpoint',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.player.visual.root.position.set(0,0,-35);const e=g.makeUnit(0,20,'heavy');e.visual.root.position.set(0,0,20);g.enemies=[e];const mesh=g.world.clone('barricade');mesh.position.set(0,0,0);g.world.covers=[{x:0,z:0,w:34,d:1.8,hp:Infinity,kind:'barricade',mesh}];g.world.navigationRevision++;let flank=0;for(let i=0;i<1500;i++){g.elapsed+=1/30;if(i%90===0)g.damageUnit(e,.01,g.player.visual.root.position);g.updateEnemies(1/30);flank=Math.max(flank,Math.abs(e.visual.root.position.x));}return {z:e.visual.root.position.z,flank};});expect(r.flank).toBeGreaterThan(18);expect(r.z).toBeLessThan(-3);
});


test('laser crosses adjacent sections of one wall and stops at the next wall',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{
  const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];
  g.world.concreteBarrier({x:0,z:0,w:25.6,d:1.8});g.world.concreteBarrier({x:0,z:-18,w:25.6,d:1.8});g.world.navigationRevision++;
  g.player.visual.root.position.set(-10,0,8);g.player.aim=Math.atan2(3.6,-8);
  const targets=[22,42].map(distance=>{const x=-10+Math.sin(g.player.aim)*distance,z=8+Math.cos(g.player.aim)*distance;const e=g.makeUnit(x,z,'heavy');e.visual.root.position.set(x,0,z);e.hp=e.max=10000;return e;});g.enemies=targets;
  g.special.fire(g,3);
  return {behindFirst:targets[0].hp<10000,behindSecond:targets[1].hp===10000,intact:g.world.covers.every((c:any)=>c.hp===176)};
 });expect(result).toEqual({behindFirst:true,behindSecond:true,intact:true});
});
