import {test,expect,type Page} from '@playwright/test';

async function arena(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.clearOpening();g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.enemies=[];g.lootRandom=()=>.99;g.player.visual.root.position.set(50,0,50);});
}

test('every grounded boss takes mine damage when its hull first touches the trigger circle',async({page})=>{
 await arena(page);const rows=await page.evaluate(async()=>{
  const g=(window as any).__steel,{BOSS}=await import('/src/three/bosses.ts'),{createActivity}=await import('/src/three/activities.ts'),{MINE_TRIGGER_RADIUS}=await import('/src/three/combat-ranges.ts');const rows=[];
  for(const kind of Object.keys(BOSS)){
   g.enemies=[];g.world.activities=[];const boss=g.makeUnit(15,0,'boss',kind),radius=g.unitRadius(boss);g.enemies=[boss];boss.hp=boss.max=10000;
   const mine=createActivity(g.world.entities,'mine',0,0,0);g.world.activities=[mine];
   boss.visual.root.position.set(MINE_TRIGGER_RADIUS+radius+.01,0,0);g.updateActivities(.01);const outside=!mine.spent&&boss.hp===10000;
   boss.visual.root.position.x-=.02;g.updateActivities(.01);const hp=boss.hp;g.updateActivities(.01);
   rows.push({kind,outside,spent:mine.spent,damaged:hp<10000,once:boss.hp===hp});
  }return rows;
 });for(const row of rows)expect(row,JSON.stringify(row)).toMatchObject({outside:true,spent:true,damaged:true,once:true});
});

test('blast edges include enemy hulls, preserve existing central damage and respect protection',async({page})=>{
 await arena(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel,unit=g.makeUnit(10,0,'jeep');g.enemies=[unit];const radius=g.unitRadius(unit);
  const hit=(x:number,y=0,antiAir=false)=>{unit.visual.root.position.set(x,y,0);unit.hp=unit.max=1000;g.explode({x:0,z:0},4.5,100,antiAir);return 1000-unit.hp;};
  const centre=hit(0),existing=hit(2),edge=hit(4.5+radius-.01),outside=hit(4.5+radius+.01);
  unit.pending=true;const reserve=hit(0);unit.pending=false;unit.role='airlift';const airborne=hit(0,11),antiAir=hit(0,11,true);
  g.player.visual.root.position.set(0,0,0);g.shieldTime=2;const hp=g.player.hp;g.explode({x:0,z:0},4.5,100);const shield=g.player.hp===hp;
  g.shieldTime=0;g.explode({x:0,z:0},4.5,100,false,true);return {centre,existing,edge,outside,reserve,airborne,antiAir,shield,alliedSafe:g.player.hp===hp};
 });expect(r.centre).toBe(100);expect(r.existing).toBeCloseTo(100*(1-2/4.5*.6));expect(r.edge).toBeCloseTo(40);
 expect(r).toMatchObject({outside:0,reserve:0,airborne:0,antiAir:100,shield:true,alliedSafe:true});
});

test('a crowded airlift ramp keeps passengers aboard until a clear unloading spot opens',async({page})=>{
 await arena(page);const r=await page.evaluate(async()=>{
  const g=(window as any).__steel,{rampFoot,AIRLIFT}=await import('/src/three/airlift.ts');
  const rider=g.makeUnit(20,0,'rifleman');g.enemies=[rider];const airlift=g.airlifts.dispatch(g,0,'#ff7a5d',[rider],{x:0,z:0},{x:0,z:40});
  const flight=g.airlifts.flights[0];flight.phase='unload';flight.ramp=1;flight.next=0;airlift.visual.root.position.set(0,0,0);airlift.heading=0;
  const foot=rampFoot(airlift.visual.root.position,0,AIRLIFT.rampReach+.6);foot.x+=1.3;
  // Ground vehicles surround the ramp after the helicopter has landed. The same spawn
  // validator used in battle must reject every overlapping candidate, even its fallback.
  const blockers=[];
  for(const [dx,dz] of [[0,0],[-4,-4],[-4,4],[4,-4],[4,4]]){
   const tank=g.makeUnit(30+blockers.length*5,30,'boss','spider');tank.visual.root.position.set(foot.x+dx,0,foot.z+dz);blockers.push(tank);g.enemies.push(tank);
  }
  g.airlifts.update(g,1);const waiting=rider.pending&&rider.aboard===airlift&&!rider.visual.root.visible&&!g.airlifts.departing(airlift);
  for(const tank of blockers)tank.dead=true;g.airlifts.update(g,1);
  const p=rider.visual.root.position,clear=g.enemies.every((u:any)=>u===rider||u.dead||g.airborne(u)||Math.hypot(p.x-u.visual.root.position.x,p.z-u.visual.root.position.z)>=g.unitRadius(u)+g.unitRadius(rider));
  return {waiting,released:!rider.pending&&!rider.aboard&&rider.visual.root.visible,clear,departing:g.airlifts.departing(airlift)};
 });expect(r).toEqual({waiting:true,released:true,clear:true,departing:true});
});

test('marked blast circles keep their existing player and escort dodge boundaries',async({page})=>{
 await arena(page);const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.start(2,0);g.clearOpening();g.world.covers=[];g.enemies=[];g.world.activities=[];
  g.player.visual.root.position.set(4.51,0,0);g.convoy.position.set(4.51,0,0);const hp=g.convoyHealth,playerHP=g.player.hp;
  g.explode({x:0,z:0},4.5,100);const outside=g.convoyHealth===hp&&g.player.hp===playerHP;
  g.player.visual.root.position.x=4.49;g.convoy.position.x=4.49;g.explode({x:0,z:0},4.5,100);const loss=hp-g.convoyHealth,playerAfter=g.player.hp;
  g.shieldTime=2;g.explode({x:0,z:0},4.5,100);const shield=g.convoyHealth===hp-loss&&g.player.hp===playerAfter;
  g.shieldTime=0;g.explode({x:0,z:0},4.5,100,false,true);return {outside,loss,playerHit:playerAfter<playerHP,shield,alliedSafe:g.convoyHealth===hp-loss&&g.player.hp===playerAfter};
 });expect(r).toEqual({outside:true,loss:50,playerHit:true,shield:true,alliedSafe:true});
});
