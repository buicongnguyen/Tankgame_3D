import {test,expect} from '@playwright/test';
import {DIFFICULTIES} from '../src/three/difficulty';

for(const difficulty of DIFFICULTIES)test(`${difficulty}: every escort level keeps a clear deployment area, with intact counts and separated ambush sectors`,async({page})=>{
 test.setTimeout(180000);await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const rows=await page.evaluate(async difficulty=>{const g=(window as any).__steel;g.frame=()=>{};await g.world.load(true);g.world.settings(true);g.save.difficulty=difficulty;
  const {MISSIONS,encounterSize}=await import('/src/three/campaign.ts'),{escortStartClear}=await import('/src/three/escort.ts'),{segmentCircle}=await import('/src/three/rules.ts');const rows=[];
  for(let stage=0;stage<MISSIONS.length;stage++){if(MISSIONS[stage].kind!=='escort')continue;for(let level=0;level<3;level++){
   g.start(stage,level);const layout=g.world.layout,count=encounterSize(stage,level,difficulty);g.updateEnemies(.01);
   rows.push({stage,level,hp:g.convoyHealth,clear:g.enemies.every((u:any)=>escortStartClear(layout,u.visual.root.position)),quiet:g.enemies.every((u:any)=>!u.encounter.active)&&g.shots.length===0,counts:g.enemies.length===count.armor+count.bosses+count.infantry+count.jeeps,sectors:new Set(g.enemies.filter((u:any)=>u.role!=='boss').map((u:any)=>u.encounter.meters)).size,patrols:g.enemies.every((u:any)=>!u.patrol||u.patrol.points.every((p:any)=>escortStartClear(layout,p)&&segmentCircle(u.patrol.home,p,layout.points[0],36)===null&&segmentCircle(u.patrol.home,p,layout.spawn,36)===null))});
  }}return rows;
 },difficulty);
 expect(rows).toHaveLength(12);for(const r of rows){expect(r.hp).toBe(1040);expect(r.clear&&r.quiet&&r.counts&&r.patrols,JSON.stringify(r)).toBe(true);expect(r.sectors).toBe(4);}
});

test('escort patrols leave the starting convoy alone, then engage when the player approaches an ambush',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const rows=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};const rows=[];
 for(const level of [0,1]){g.save.difficulty=level?'crazy':'normal';g.start(2,level);const start=g.convoy.position.clone();for(let i=0;i<200;i++){g.elapsed+=.05;g.updateEnemies(.05);g.updateShots(.05);}const quiet=g.convoyHealth===1040&&g.shots.length===0&&g.enemies.every((e:any)=>!e.encounter.active);const target=g.enemies.find((e:any)=>e.encounter.group===0);g.world.covers=[];g.world.navigationRevision++;g.player.visual.root.position.copy(target.visual.root.position).x+=5;g.updateEnemies(.01);rows.push({quiet,engaged:target.encounter.active,stationary:g.convoy.position.equals(start),waiting:g.enemies.some((e:any)=>!e.encounter.active)});}return rows;
 });for(const row of rows)expect(Object.values(row).every(Boolean),JSON.stringify(row)).toBe(true);
});

test('Q and collected shields protect both vehicles from bullets and explosions, expire, pause, and reset',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(2,0);g.world.covers=[];g.world.activities=[];g.enemies=[];g.world.navigationRevision++;g.convoy.position.set(0,0,0);g.player.visual.root.position.set(30,0,30);});
 await page.keyboard.press('q');const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.updatePlayer(.01);const field=g.convoy.getObjectByName('ConvoyShield'),visible=field.visible,initial=g.convoyHealth,hp=g.player.hp;
  const shooter=g.makeUnit(0,10,'sentry');shooter.visual.root.position.set(0,0,10);shooter.aim=Math.PI;g.syncVisual(shooter);
  const shoot=()=>{g.shoot(shooter,false);for(let i=0;i<90;i++)g.updateShots(1/60);};shoot();g.explode(g.convoy.position,5,200);g.explode(g.player.visual.root.position,5,200);g.damageConvoy(100);const protectedBoth=g.convoyHealth===initial&&g.player.hp===hp;
  g.pause();const time=g.shieldTime;g.step(3);const paused=g.shieldTime===time;g.resume();g.updatePlayer(time+.01);const expired=!field.visible&&g.shieldTime===0;shoot();const bullet=g.convoyHealth<initial;const before=g.convoyHealth;g.explode(g.convoy.position,5,100);const blast=g.convoyHealth===before-50;
  const {createActivity}=await import('/src/three/activities.ts');const a=createActivity(g.world.entities,'shield',30,30,4);g.world.activities=[a];g.updateActivities(.01);g.updatePlayer(.01);const now=g.convoyHealth;g.damageConvoy(100);const pickup=a.spent&&field.visible&&g.convoyHealth===now;g.updateHud();const hud=g.el('objective').textContent.includes('SHIELDED')&&!g.el('objective').textContent.includes('400%');g.start(2,0);return {visible,protectedBoth,paused,expired,bullet,blast,pickup,hud,reset:g.convoyHealth===1040&&g.shieldTime===0&&!g.convoy.getObjectByName('ConvoyShield').visible};
 });expect(Object.values(r).every(Boolean),JSON.stringify(r)).toBe(true);
});


test('O-loop escort ambushes progress in either chosen direction rather than waking both branches together',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const rows=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};const {routeSample}=await import('/src/three/stage-layout.ts');const rows=[];
 for(const reverse of [false,true]){g.start(2,1);g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.convoyReverse=reverse;const first=g.enemies.find((u:any)=>u.encounter.group===(reverse?3:0)),last=g.enemies.find((u:any)=>u.encounter.group===(reverse?0:3));const meters=reverse?g.world.layout.length-first.encounter.meters:first.encounter.meters,p=routeSample(g.convoyPath(),meters);g.player.visual.root.position.set(p.x,0,p.z);g.convoyDistance=meters;g.convoy.position.set(p.x,0,p.z);g.updateEnemies(.01);rows.push({reverse,first:first.encounter.active,later:!last.encounter.active});}return rows;
 });for(const row of rows)expect(row.first&&row.later,JSON.stringify(row)).toBe(true);
});
