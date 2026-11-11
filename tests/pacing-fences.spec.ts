import {expect,test} from '@playwright/test';

const ready=async(page:any)=>{await page.goto('/?e2e');await page.waitForSelector('[data-action=deploy]');await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};});};

test('plank fences stand beside the road before later groups, the same every time, and never on defense, training or skirmish',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const L=await import('/src/three/stage-layout.ts');const fences=()=>g.world.covers.filter((c:any)=>c.kind==='fence');
  const rows=[];g.save.difficulty='normal';for(let m=0;m<16;m++){g.prepare(m,0);const first=fences().map((c:any)=>[c.x,c.z,c.w,c.d]);g.prepare(m,0);const again=fences().map((c:any)=>[c.x,c.z,c.w,c.d]);
   const onRoad=fences().some((c:any)=>L.overlapsReservation(g.world.layout,c,1));const others=g.world.covers.filter((c:any)=>c.kind!=='fence'&&c.hp>0);
   const clash=fences().some((f:any)=>others.some((o:any)=>Math.abs(f.x-o.x)<(f.w+o.w)/2&&Math.abs(f.z-o.z)<(f.d+o.d)/2));
   const nearSpawn=fences().some((c:any)=>Math.hypot(c.x-g.world.layout.spawn.x,c.z-g.world.layout.spawn.z)<16);
   rows.push({kind:g.world.missionKind,count:first.length,same:JSON.stringify(first)===JSON.stringify(again),onRoad,clash,nearSpawn,hp:fences().every((c:any)=>c.hp===60)});}
  g.startTraining(0);const training=fences().length;return {rows,training};});
 for(const row of r.rows){expect(row.same).toBe(true);expect(row.onRoad).toBe(false);expect(row.clash).toBe(false);expect(row.nearSpawn).toBe(false);expect(row.hp).toBe(true);expect(row.count).toBeLessThanOrEqual(6);if(row.kind==='defense')expect(row.count).toBe(0);if(row.kind==='assault')expect(row.count).toBeGreaterThanOrEqual(1);}
 expect(r.training).toBe(0);
});

test('the tank bursts through a fence and a crate at speed, opens the route, and stops at concrete',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.difficulty='normal';g.start(0,1);g.clearOpening();const pos=g.player.visual.root.position;
  const drive=(cover:any,frames:number)=>{const along=cover.w>cover.d;pos.set(cover.x+(along?0:3.4),0,cover.z+(along?3.4:0));g.player.velocity.x=g.player.velocity.z=0;const move=along?{x:0,z:-1}:{x:-1,z:0};let broke=-1;for(let i=0;i<frames;i++){g.input.move=move;g.updatePlayer(1/60);if(broke<0&&cover.hp<=0)broke=i+1;}return {broke,passed:along?pos.z<cover.z-1:pos.x<cover.x-1};};
  const fence=g.world.covers.find((c:any)=>c.kind==='fence'),revision=g.world.navigationRevision,sight=g.world.covers.filter((c:any)=>c.hp>0).length;
  const a=drive(fence,120),opened=g.world.navigationRevision>revision,called=g.fenceCalled;
  const wall=g.world.covers.find((c:any)=>c.kind==='barricade'&&c.hp>0),wallHp=wall.hp,b=drive(wall,120);
  // slow pushing does not break a second fence
  const second=g.world.covers.find((c:any)=>c.kind==='fence'&&c.hp>0);const along=second.w>second.d;pos.set(second.x+(along?0:2.6),0,second.z+(along?2.6:0));g.player.velocity.x=g.player.velocity.z=0;for(let i=0;i<8;i++){g.input.move=along?{x:0,z:-.2}:{x:-.2,z:0};g.updatePlayer(1/60);}
  return {a,opened,called,b,wallHp,wallAfter:wall.hp,slowHp:second.hp,sight};});
 expect(r.a.broke).toBeGreaterThan(0);expect(r.a.broke).toBeLessThan(70);expect(r.a.passed).toBe(true);expect(r.opened).toBe(true);expect(r.called).toBe(true);
 expect(r.b.broke).toBe(-1);expect(r.b.passed).toBe(false);expect(r.wallAfter).toBe(r.wallHp);expect(r.slowHp).toBe(60);
});

test('a fence blocks sight until it falls',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const E=await import('/src/three/encounters.ts');g.start(0,1);g.clearOpening();const f=g.world.covers.find((c:any)=>c.kind==='fence'),along=f.w>f.d;
  const a={x:f.x+(along?0:2),z:f.z+(along?2:0)},b={x:f.x-(along?0:2),z:f.z-(along?2:0)};const before=E.clearSight(g,a,b);g.hitCover(f,999);return {before,after:E.clearSight(g,a,b)};});
 expect(r.before).toBe(false);expect(r.after).toBe(true);
});

test('later groups hold back on Easy and Normal until earlier groups are down or the tank comes close',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const S=await import('/src/three/screens.ts');const out:any={};
  for(const difficulty of ['easy','normal','hard']){g.save.difficulty=difficulty;g.start(4,0);g.clearOpening();const later=g.enemies.find((e:any)=>e.encounter?.group===2&&e.role!=='boss'),first=g.enemies.find((e:any)=>e.encounter?.group===0),pos=g.player.visual.root.position,q=later.visual.root.position;
   pos.set(q.x+32,0,q.z);const far=S.holdsBack(g,later,later.encounter),opening=S.holdsBack(g,first,first.encounter);
   pos.set(q.x+12,0,q.z);const close=S.holdsBack(g,later,later.encounter);pos.set(q.x+32,0,q.z);
   const earlier=g.enemies.filter((e:any)=>e.encounter&&e.encounter.group<2&&e.role!=='boss');for(const e of earlier.slice(2))e.dead=true;const twoLeft=S.holdsBack(g,later,later.encounter);for(const e of earlier)e.dead=true;const cleared=S.holdsBack(g,later,later.encounter);
   out[difficulty]={far,opening,close,twoLeft,cleared};}
  // in play: a held group stays asleep in plain view, then wakes when shot
  g.save.difficulty='easy';g.start(4,0);g.clearOpening();const later=g.enemies.find((e:any)=>e.encounter?.group===2&&e.role!=='boss'),q=later.visual.root.position;for(const c of g.world.covers)c.hp=0;g.world.navigationRevision++;
  g.player.visual.root.position.set(q.x+30,0,q.z);g.encounters.scanAt=0;g.encounters.update(g);const asleep=later.encounter.active;g.damageUnit(later,1,g.player.visual.root.position);
  return {...out,asleep,shot:later.encounter.active};});
 expect(r.easy).toEqual({far:true,opening:false,close:false,twoLeft:true,cleared:false});
 expect(r.normal).toEqual({far:true,opening:false,close:false,twoLeft:false,cleared:false});
 expect(r.hard).toEqual({far:false,opening:false,close:false,twoLeft:false,cleared:false});
 expect(r.asleep).toBe(false);expect(r.shot).toBe(true);
});
