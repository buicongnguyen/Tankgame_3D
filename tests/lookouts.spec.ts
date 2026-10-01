import {test,expect,type Page} from '@playwright/test';

async function battle(page:Page,stage:number,difficulty='normal',level=0){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(({stage,difficulty,level})=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty=difficulty;g.start(stage,level);g.clearOpening?.();},{stage,difficulty,level});
}

test('lookouts stand on rooftops beside the road, more on harder difficulties, none on Easy',async({page})=>{
 await battle(page,13);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;const count=(d:string)=>{g.save.difficulty=d;g.start(13,0);g.clearOpening?.();return g.enemies.filter((u:any)=>u.perch).length;};
  g.save.difficulty='normal';g.start(13,0);const posted=g.enemies.filter((u:any)=>u.perch).map((u:any)=>({y:u.visual.root.position.y,kind:u.perch.cover.kind,role:u.role,
   inside:Math.abs(u.visual.root.position.x-u.perch.cover.x)<=u.perch.cover.w/2&&Math.abs(u.visual.root.position.z-u.perch.cover.z)<=u.perch.cover.d/2}));
  return {posted,easy:count('easy'),normal:count('normal'),hard:count('hard'),crazy:count('crazy'),skirmish:(()=>{g.skirmishDraft={maps:[13],speed:1,teams:2,size:1,field:0};g.startSkirmish();return g.enemies.filter((u:any)=>u.perch).length;})()};});
 expect(r.posted.length).toBe(2);for(const u of r.posted){expect(u.y).toBeGreaterThan(3);expect(u.role).toBe('rifleman');expect(u.inside).toBe(true);}
 expect(r.easy).toBe(0);expect(r.hard).toBeGreaterThan(r.normal);expect(r.crazy).toBeGreaterThanOrEqual(r.hard);expect(r.skirmish).toBe(0);
});

test('a lookout holds its roof, sees and fires past its own building, and direct fire hits the building first',async({page})=>{
 await battle(page,13);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,u=g.enemies.find((e:any)=>e.perch),c=u.perch.cover,p=u.visual.root.position;
  // Park the tank in the open 14 m from the building, on the side facing the road.
  const away=Math.atan2(g.world.target.x-c.x,g.world.target.z-c.z);let spot=null;
  for(let k=0;k<16&&!spot;k++){const a=away+k*.4,x=c.x+Math.sin(a)*(Math.max(c.w,c.d)/2+12),z=c.z+Math.cos(a)*(Math.max(c.w,c.d)/2+12);if(g.canSpawnUnit(x,z,'player'))spot={x,z};}
  g.player.visual.root.position.set(spot.x,0,spot.z);g.player.hp=g.player.max=1e9;for(const e of g.enemies)if(e!==u){e.dead=true;e.visual.root.visible=false;}
  const start={x:p.x,y:p.y,z:p.z};const before=g.shots.length;let fired=0;
  for(let i=0;i<60*6;i++){g.step(1/60);fired=Math.max(fired,g.shots.filter((s:any)=>!s.friendly).length);}
  const held=Math.hypot(p.x-start.x,p.z-start.z)<.01&&Math.abs(p.y-start.y)<.01;
  // A friendly shell aimed straight at the lookout from the tank strikes the building.
  const hp=c.hp;g.player.aim=Math.atan2(p.x-g.player.visual.root.position.x,p.z-g.player.visual.root.position.z);g.reload=0;g.weapon=0;g.shoot(g.player,true);for(let i=0;i<60;i++)g.updateShots(1/60);
  return {held,fired,building:c.hp<hp,alive:!u.dead,before};});
 expect(r.held).toBe(true);expect(r.fired).toBeGreaterThan(0);expect(r.building).toBe(true);expect(r.alive).toBe(true);
});

test('knocking the building down drops its lookout, and the next stage has no stale lookouts',async({page})=>{
 await battle(page,13);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,u=g.enemies.find((e:any)=>e.perch),c=u.perch.cover;
  g.hitCover(c,1e6);const dropped=u.dead&&u.visual.root.position.y===0&&!u.perch;
  g.start(1,0);const stale=g.enemies.filter((e:any)=>e.perch&&e.perch.cover.hp<=0).length;
  const hosts=g.enemies.filter((e:any)=>e.perch).every((e:any)=>g.world.covers.includes(e.perch.cover));
  return {dropped,stale,hosts};});
 expect(r).toEqual({dropped:true,stale:0,hosts:true});
});
