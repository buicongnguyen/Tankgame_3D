import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {enemyHealth} from '../src/three/unit-health';
import {MISSIONS,encounterSize} from '../src/three/campaign';

async function arena(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.world.covers=[];g.world.activities=[];g.enemies=[];g.world.navigationRevision++;g.lootRandom=()=>.99;});
}

test('campaign armor grows gently without inflating infantry or eclipsing bosses',()=>{
 let previous=[0,0,0];
 for(let stage=0;stage<MISSIONS.length;stage++)for(let level=0;level<3;level++){
  const hp=(['raider','sentry','heavy'] as const).map(role=>enemyHealth(role,stage,level));
  expect(hp[0]).toBeGreaterThan(enemyHealth('jeep',stage,level));expect(hp[1]).toBeGreaterThan(hp[0]);expect(hp[2]).toBeGreaterThan(hp[1]);
  hp.forEach((n,i)=>{expect(n).toBeGreaterThanOrEqual(previous[i]);expect(n-previous[i]).toBeLessThanOrEqual(stage===0&&level===0?240:5);});previous=hp;
  expect(enemyHealth('rifleman',stage,level)).toBe(35);expect(enemyHealth('rocketeer',stage,level)).toBe(55);expect(enemyHealth('jeep',stage,level)).toBe(75);
 }
 expect(previous).toEqual([160,220,355]);expect(enemyHealth('heavy',100,2)).toBe(360);expect(enemyHealth('raider',-2,-1)).toBe(110);
});

test('real cannon preserves infantry kills and rewards flanking tougher tanks',async({page})=>{
 await arena(page);const rows=await page.evaluate(()=>{
  const g=(window as any).__steel,rows=[];
  for(const role of ['rifleman','rocketeer','jeep','raider','sentry','heavy'])for(const [facing,x,z] of [['front',0,20],['side',20,0],['rear',0,-20]] as [string,number,number][]){
   g.enemies=[];g.player.visual.root.position.set(x,0,z);g.player.aim=Math.atan2(-x,-z);g.syncVisual(g.player);
   const e=g.makeUnit(0,0,role);e.visual.root.position.set(0,0,0);e.heading=0;g.enemies=[e];g.weapon=0;let hits=0,firstBar=0;
   while(!e.dead&&hits<20){g.shoot(g.player,true);for(let i=0;i<50;i++)g.updateShots(1/60);hits++;g.syncVisual(e);if(hits===1)firstBar=e.visual.bar.scale.x;}
   rows.push({role,facing,hits,dead:e.dead,hp:e.hp,max:e.max,firstBar,barHidden:!e.visual.bar.visible});e.visual.root.removeFromParent();
  }return rows;
 });
 const expected:Record<string,number[]>={rifleman:[1,1,1],rocketeer:[2,2,2],jeep:[2,2,2],raider:[4,3,2],sentry:[6,4,3],heavy:[9,6,4]};
 for(const r of rows){expect(r.hits,`${r.role}/${r.facing}`).toBe(expected[r.role][['front','side','rear'].indexOf(r.facing)]);expect(r.dead&&r.barHidden).toBe(true);expect(r.hp).toBe(0);if(r.hits>1){expect(r.firstBar).toBeGreaterThan(0);expect(r.firstBar).toBeLessThan(1);}}
});

test('missile direct plus splash and laser remain effective; upgrades beat late armor',async({page},testInfo)=>{
 await arena(page);const rows=await page.evaluate(()=>{
  const g=(window as any).__steel,rows=[];
  for(const stage of [0,15])for(const upgraded of [false,true])for(const weapon of [0,2,3,4,6]){
   g.mission=stage;g.level=stage===15?2:0;g.enemies=[];g.special.clear();g.player.visual.root.position.set(0,0,20);g.player.aim=Math.PI;g.aimPoint.set(0,0,0);g.syncVisual(g.player);
   // A modest, affordable specialization, not a level-20 loadout.
   g.save.upgrades.power=upgraded?3:0;g.save.weaponLevels.fill(upgraded?3:0);g.weapon=weapon;g.specialAmmo=[12,6,3];
   const e=g.makeUnit(0,0,'heavy');e.visual.root.position.set(0,0,0);e.heading=0;g.enemies=[e];let hits=0;
   while(!e.dead&&hits<20){g.shoot(g.player,true);for(let i=0;i<100;i++){g.updateShots(1/60);g.special.update(g,1/60);}hits++;}
   rows.push({stage,upgraded,weapon,hits,dead:e.dead,max:e.max});e.visual.root.removeFromParent();
  }return rows;
 });
 await testInfo.attach('weapon-health-comparison',{body:JSON.stringify(rows,null,2),contentType:'application/json'});
 for(const row of rows){expect(row.dead,JSON.stringify(row)).toBe(true);expect(row.max).toBe(row.stage===0?240:355);}
 const hits=(stage:number,upgraded:boolean,weapon:number)=>rows.find(r=>r.stage===stage&&r.upgraded===upgraded&&r.weapon===weapon)!.hits;
 expect([0,2,3,4,6].map(w=>hits(0,false,w))).toEqual([9,2,3,1,4]);
 expect([0,2,3,4,6].map(w=>hits(15,false,w))).toEqual([13,3,4,2,6]);
 expect([0,2,3,4,6].map(w=>hits(15,true,w))).toEqual([7,2,2,1,4]);
 for(const w of [0,2,3,4,6]){expect(hits(15,true,w)).toBeLessThan(hits(15,false,w));expect(hits(15,true,w)).toBeLessThanOrEqual(hits(0,false,w));}
});

test('all difficulties spawn consistent HP, keep player hull, and restore damage on retry',async({page})=>{
 await arena(page);const rows=await page.evaluate(()=>{
  const g=(window as any).__steel,rows=[];
  for(const difficulty of ['easy','normal','hard','crazy']){
   g.save.difficulty=difficulty;g.start(15,2);const counts:Record<string,number>={},health:Record<string,number>={};
   for(const e of g.enemies){counts[e.role]=(counts[e.role]??0)+1;health[e.role]=e.max;if(e.hp!==e.max)throw new Error('Spawned damaged');}
   const before=g.enemies.filter((e:any)=>e.role!=='boss').map((e:any)=>e.max);g.save.upgrades.armor=5;g.save.upgrades.power=20;g.save.weaponLevels.fill(20);g.save.skin='prism';
   g.start(15,2);const independent=JSON.stringify(before)===JSON.stringify(g.enemies.filter((e:any)=>e.role!=='boss').map((e:any)=>e.max));
   const e=g.enemies.find((e:any)=>e.role==='heavy');g.damageUnit(e,44,g.player.visual.root.position);g.syncVisual(e);const barMatches=Math.abs(e.visual.bar.scale.x-e.hp/e.max)<1e-6;
   g.start(15,2);rows.push({difficulty,counts,health,independent,barMatches,hull:g.player.max,retried:g.enemies.every((e:any)=>e.hp===e.max&&!e.dead)});g.save.upgrades.armor=0;
  }return rows;
 });
 for(const r of rows){const c=encounterSize(15,2,r.difficulty as any);expect(r.counts.rifleman).toBe(c.riflemen);expect(r.counts.rocketeer).toBe(c.rocketeers);expect(r.counts.jeep).toBe(c.jeeps);expect(r.counts.boss).toBe(c.bosses);expect(r.counts.raider+r.counts.sentry+r.counts.heavy).toBe(c.armor);expect(r.health).toMatchObject({rifleman:35,rocketeer:55,jeep:75,raider:160,sentry:220,heavy:355});expect(r.hull).toBe(565*(r.difficulty==='easy'?3:1));expect(r.independent&&r.barMatches&&r.retried).toBe(true);}
});

test('all nine bosses retain individual HP and meaningful exposed cores',async({page})=>{
 await arena(page);const rows=await page.evaluate(()=>{
  const g=(window as any).__steel,rows=[];g.player.visual.root.position.set(0,0,25);
  for(const kind of ['rail','missile','walker','helicopter','spider','laser','quad-mech','siege-mech','missile-truck']){
   g.enemies=[];const b=g.makeUnit(0,0,'boss',kind);b.visual.root.position.set(0,0,0);b.heading=0;g.enemies=[b];g.bosses.update(g,b,.001);b.heading=0;b.visual.root.position.set(0,0,0);
   const s=g.bosses.states.get(b);s.phase='tracking';g.damageUnit(b,44,{x:0,z:25},true);const protectedDamage=b.max-b.hp;s.phase='exposed';const hp=b.hp;g.damageUnit(b,44,{x:0,z:25},true);rows.push({kind,max:b.max,protectedDamage,exposedDamage:hp-b.hp,alive:!b.dead});g.bosses.cancel(b);b.visual.root.removeFromParent();
  }return rows;
 });
 expect(rows.map(r=>r.max)).toEqual([800,850,1050,680,920,780,1000,1100,1200]);for(const r of rows){expect(r.protectedDamage).toBeCloseTo(18.59);expect(r.exposedDamage).toBeCloseTo(50.05);expect(r.alive).toBe(true);}
});

test('a tougher final tank reaches delayed results and awards the stage once',async({page})=>{
 await arena(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.player.visual.root.position.set(0,0,20);g.player.aim=Math.PI;g.syncVisual(g.player);const e=g.makeUnit(0,0,'raider');e.visual.root.position.set(0,0,0);e.heading=0;e.cooldown=1e6;g.enemies=[e];
  for(let shot=0;shot<3;shot++){g.shoot(g.player,true);for(let i=0;i<50;i++)g.updateShots(1/60);}g.step(.001);const survived=g.phase==='playing'&&!e.dead;
  const credits=g.save.credits;g.shoot(g.player,true);for(let i=0;i<50;i++)g.updateShots(1/60);g.step(.001);const finishing=g.phase==='finishing';g.step(.79);const delay=g.phase==='finishing';g.step(.02);const results=g.phase==='depot',award=g.save.credits;g.complete();return {survived,finishing,delay,results,reward:award>credits,once:g.save.credits===award,kills:g.kills};
 });expect(r).toEqual({survived:true,finishing:true,delay:true,results:true,reward:true,once:true,kills:1});
});
