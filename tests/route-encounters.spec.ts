import {test,expect} from '@playwright/test';
import {stageLayout,roadDistance,alongRoute,isWeaponSupply} from '../src/three/stage-layout';
import {levelMission} from '../src/three/campaign';
import {DIFFICULTIES,mode} from '../src/three/difficulty';
import {circleBox,segmentBox} from '../src/three/rules';

for(const difficulty of DIFFICULTIES)test(`${difficulty} layouts keep road weapons contested and recovery off-road`,()=>{
 for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){
  const layout=stageLayout(stage,level,levelMission(stage,level).kind,difficulty),useful=layout.supplies.filter(s=>s.kind!=='mine');
  expect(useful.length,`${stage}/${level}`).toBe(mode(difficulty).supplies);expect(layout.supplies.filter(s=>s.kind==='mine')).toHaveLength(6);expect(layout).toEqual(stageLayout(stage,level,levelMission(stage,level).kind,difficulty));
  for(const kind of ['health','shield','repair'])expect(useful.some(s=>s.kind===kind)).toBe(true);expect(useful.some(s=>s.kind==='laser'||s.kind==='arc')).toBe(true);
  for(const supply of useful){if(isWeaponSupply(supply.kind)){expect(roadDistance(layout.points,supply)).toBeLessThanOrEqual(1.1);const anchor=layout.encounters[supply.guardGroup!];expect(Math.hypot(supply.x-anchor.x,supply.z-anchor.z)).toBeLessThan(14);}else{expect(supply.guardGroup).toBeUndefined();expect(roadDistance(layout.points,supply)).toBeGreaterThan(7.2);expect(roadDistance(layout.points,supply)).toBeLessThan(9.31);}expect(layout.barriers.some(b=>circleBox(supply,2.85,b))).toBe(false);}
  for(let i=1;i<layout.points.length;i++)expect(layout.barriers.some(b=>segmentBox(layout.points[i-1],layout.points[i],b,2.3)!==null)).toBe(false);
 }
});

test('campaign includes eastward, northward, diagonal and southward journeys',()=>{
 for(const [stage,direction] of [[4,'northeast'],[13,'east'],[0,'north'],[5,'southeast'],[10,'northeast'],[11,'northeast'],[7,'south']] as const){const layout=stageLayout(stage);expect(layout.direction).toBe(direction);expect(layout.points.length).toBeGreaterThanOrEqual(3);const end=alongRoute(layout.points,layout.length);expect(end).toEqual(layout.points.at(-1));}
});

test('waiting route groups hold position, wake near their zone and counterattack when hit',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(4,2);const before=g.enemies.map((e:any)=>e.visual.root.position.clone());
  for(let i=0;i<300;i++){g.elapsed+=.05;g.updateEnemies(.05);}const quiet=g.enemies.every((e:any,i:number)=>e.visual.root.position.equals(before[i])&&!e.encounter.active),noShots=g.shots.length===0;
  const mid=g.enemies.find((e:any)=>e.encounter.group===2),anchor=mid.encounter.anchor;g.player.visual.root.position.set(anchor.x,0,anchor.z);g.updateEnemies(.01);const middle=g.enemies.filter((e:any)=>e.encounter.group===2).every((e:any)=>e.encounter.active),boss=g.enemies.find((e:any)=>e.role==='boss'),bossWaiting=!boss.encounter.active;
  const later=g.enemies.find((e:any)=>e.encounter.group===3),hp=later.hp;g.damageUnit(later,1,g.player.visual.root.position);const provoked=later.hp<hp&&g.enemies.filter((e:any)=>e.encounter.group===3).every((e:any)=>e.encounter.active);
  g.player.visual.root.position.set(boss.encounter.anchor.x,0,boss.encounter.anchor.z);g.updateEnemies(.01);return {quiet,noShots,middle,bossWaiting,provoked,final:boss.encounter.active,counts:g.armoredGoal===g.enemies.filter((e:any)=>!g.isInfantry(e)).length};
 });expect(r).toEqual({quiet:true,noShots:true,middle:true,bossWaiting:true,provoked:true,final:true,counts:true});
});

test('defense groups enter in staggered waves and reset with the stage',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(3);g.updateEnemies(.01);const first=g.enemies.filter((e:any)=>e.encounter.active).length,waiting=g.enemies.filter((e:any)=>!e.encounter.active).length;g.elapsed=15;g.updateEnemies(.01);const next=g.enemies.filter((e:any)=>e.encounter.active).length;g.elapsed=22;g.updateEnemies(.01);const all=g.enemies.every((e:any)=>e.encounter.active);g.start(3);return {first,waiting,next,all,reset:g.enemies.every((e:any)=>!e.encounter.active)&&g.encounters.progress===0};});expect(r.first).toBeGreaterThan(0);expect(r.waiting).toBeGreaterThan(0);expect(r.next).toBeGreaterThan(r.first);expect(r.all&&r.reset).toBe(true);
});

test('assault requires its marked exit after the patrol is cleared',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};for(const u of g.enemies)g.damageUnit(u,999999,g.player.visual.root.position,true);g.step(.01);g.updateHud();const waits=g.phase==='playing'&&g.objectiveProgress()<1,exitCue=g.el('objective').textContent.includes('REACH EXIT');g.player.visual.root.position.copy(g.world.ring.position);g.step(.01);const delay=g.phase==='finishing';g.step(.8);return {waits,exitCue,delay,result:g.phase==='depot'};});expect(r).toEqual({waits:true,exitCue:true,delay:true,result:true});
});

test('actual cannon opens one concrete section after four hits and the laser leaves it intact',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.enemies=[];g.world.concreteBarrier({x:0,z:0,w:25.6,d:1.8});const [wall,neighbor]=g.world.covers;g.player.visual.root.position.set(wall.x,0,12);g.player.aim=Math.PI;g.weapon=0;g.syncVisual(g.player);const revision=g.world.navigationRevision;
  const shoot=()=>{g.shoot(g.player,true);for(let n=0;n<30;n++)g.updateShots(1/60);};for(let n=0;n<3;n++)shoot();const held=wall.hp===44&&wall.mesh.visible&&neighbor.hp===176;g.special.fire(g,3);const laser=wall.hp===44;shoot();
  const {circleBox}=await import('/src/three/rules.ts');const local=wall.hp===0&&!wall.mesh.visible&&neighbor.hp===176&&neighbor.mesh.visible,open=!g.world.covers.some((c:any)=>c.hp>0&&circleBox({x:wall.x,z:0},1.25,c)),blocked=g.world.covers.some((c:any)=>c.hp>0&&circleBox({x:neighbor.x,z:0},1.25,c));
  const values=Array.from(wall.section.parts[0].instanceMatrix.array).slice(wall.section.index*16,wall.section.index*16+16);await g.world.load(true);g.world.settings(true);const stable=wall.section.parts[0].instanceMatrix.array[wall.section.index*16]===0;g.start(0);return {held,laser,local,open,blocked,revised:g.world.navigationRevision>revision,hidden:values[0]===0&&values[5]===0&&values[10]===0,stable,reset:g.world.covers.filter((c:any)=>c.section).every((c:any)=>c.hp===176)};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});


test('salvage is limited by difficulty and placed on the clear road',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const rows=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};const {roadDistance,alongRoute}=await import('/src/three/stage-layout.ts');const {circleBox}=await import('/src/three/rules.ts');return ['easy','normal','hard','crazy'].map(difficulty=>{g.save.difficulty=difficulty;g.start(4);const before=g.world.activities.length;for(let kills=1;kills<=128;kills++){g.kills=kills;g.dropSalvage(alongRoute(g.world.layout.points,g.world.layout.length*((kills%7+1)/8)));}const drops=g.world.activities.slice(before);return {difficulty,count:drops.length,onRoad:drops.every((p:any)=>roadDistance(g.world.layout.points,p)<=1.01),clear:drops.every((p:any)=>!g.world.covers.some((c:any)=>c.hp>0&&circleBox(p,2.85,c)))};});});expect(rows.map((r:any)=>r.count)).toEqual([4,2,1,1]);expect(rows.every((r:any)=>r.onRoad&&r.clear)).toBe(true);
});
