import {test,expect,type Page} from '@playwright/test';

// Crowd control (src/three/crowd.ts): on campaign Easy and Normal only a few hostiles press the attack at once,
// the rest wait quietly in an outer ring, attackers keep apart, searchers stop short and guards walk home.
async function arena(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
}
/** Eight riflemen in a 24 m circle around the tank, all awake and in clear sight; counts who fires in `seconds`. */
function ring(difficulty:string,seconds:number){
 return ({difficulty,seconds}:{difficulty:string,seconds:number})=>{
  const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty=difficulty;g.start(4,0);
  g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.enemies=[];g.player.visual.root.position.set(0,0,0);g.shieldTime=0;g.contact=true;
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,u=g.makeUnit(Math.sin(a)*24,Math.cos(a)*24,'rifleman');u.visual.root.position.set(Math.sin(a)*24,0,Math.cos(a)*24);u.encounter={group:0,anchor:{x:0,z:0},meters:0,active:true};u.cooldown=0;g.enemies.push(u);}
  const fired=new Set(),shoot=g.shoot.bind(g);g.shoot=(u:any,player:boolean,...rest:any[])=>{if(!player&&u!==g.player)fired.add(u);return shoot(u,player,...rest);};
  for(let i=0;i<seconds*60;i++){g.player.hp=g.player.max;g.step(1/60);}
  const spread=g.enemies.map((e:any)=>Math.round(e.visual.root.position.length()));
  return {fired:fired.size,spread};
 };
}

test('Easy and Normal: at most three (Easy) or four (Normal) hostiles shoot at once; Hard keeps the old rush',async({page})=>{
 await arena(page);
 const easy=await page.evaluate(ring('easy',6),{difficulty:'easy',seconds:6});
 const normal=await page.evaluate(ring('normal',6),{difficulty:'normal',seconds:6});
 const hard=await page.evaluate(ring('hard',6),{difficulty:'hard',seconds:6});
 expect(easy.fired).toBeLessThanOrEqual(3);expect(easy.fired).toBeGreaterThan(0);
 expect(normal.fired).toBeLessThanOrEqual(4);expect(normal.fired).toBeGreaterThan(0);
 expect(hard.fired).toBeGreaterThan(4);
 // Waiting riflemen stay out in the ring (30 m) instead of closing to 17 m with the attackers.
 expect(easy.spread.filter((d:number)=>d>=23).length).toBeGreaterThanOrEqual(5);
});

test('a waiting hostile still defends itself when the tank drives right up to it',async({page})=>{
 await arena(page);
 const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='easy';g.start(4,0);
  g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.enemies=[];g.player.visual.root.position.set(0,0,0);g.shieldTime=0;g.contact=true;
  const make=(x:number,z:number)=>{const u=g.makeUnit(x,z,'rifleman');u.visual.root.position.set(x,0,z);u.encounter={group:0,anchor:{x:0,z:0},meters:0,active:true};u.cooldown=0;g.enemies.push(u);return u;};
  // Three attackers take the slots at 18-20 m; two more wait at 28 m and must stay quiet; one more is parked 12 m
  // away but outside the slots (the slots are sticky), so it waits - and still shoots, because it is that close.
  for(const x of [-18,-19,18])make(x,0);g.crowd.update(g);
  const far=[make(0,-28),make(4,-28)],close=make(0,12);g.crowd.update(g);
  const fired=new Set(),shoot=g.shoot.bind(g);g.shoot=(u:any,p:boolean,...rest:any[])=>{if(!p&&u!==g.player)fired.add(u);return shoot(u,p,...rest);};
  for(let i=0;i<240;i++){g.player.hp=g.player.max;g.step(1/60);}
  return {closeFired:fired.has(close),farFired:far.filter(u=>fired.has(u)).length};
 });
 expect(r.closeFired).toBe(true);expect(r.farFired).toBe(0);
});

test('attackers keep apart, searchers stop short of the last seen spot, and guards walk home and go back on watch',async({page})=>{
 await arena(page);
 const r=await page.evaluate(()=>{
  const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='easy';g.start(4,0);
  g.world.covers=[];g.world.activities=[];g.world.navigationRevision++;g.enemies=[];g.player.visual.root.position.set(10,0,0);g.contact=true;g.shieldTime=999;
  // Spacing: two riflemen attacking side by side (2 m apart) spread out (the tank is in sight, 20 m away).
  const a=g.makeUnit(30,-1,'rifleman'),b=g.makeUnit(30,1,'rifleman');a.visual.root.position.set(30,0,-1);b.visual.root.position.set(30,0,1);for(const u of [a,b])u.encounter={group:0,anchor:{x:30,z:0},meters:0,active:true};
  // Search: a rifleman that lost the tank (out of sight, 70 m away) heads for the last seen spot and stops about 5 m short.
  const s=g.makeUnit(-90,0,'rifleman');s.visual.root.position.set(-90,0,0);s.encounter={group:1,anchor:{x:-90,z:0},meters:0,active:true};
  // Home: a guard asleep at its post is remembered, then woken and pulled away.
  const h=g.makeUnit(60,-20,'rifleman');h.visual.root.position.set(60,0,-20);h.encounter={group:2,anchor:{x:60,z:-20},meters:0,active:false};
  g.enemies=[a,b,s,h];g.crowd.update(g);
  s.lastSeen={x:-60,z:0};s.searchUntil=g.elapsed+30;g.player.visual.root.position.set(10,0,0);
  h.encounter.active=true;h.visual.root.position.set(75,0,-20);h.lastSeen=undefined;h.searchUntil=0;
  for(let i=0;i<60*12;i++){g.player.hp=g.player.max;g.step(1/60);}
  const pa=a.visual.root.position,pb=b.visual.root.position,ps=s.visual.root.position,ph=h.visual.root.position;
  return {apart:Math.hypot(pa.x-pb.x,pa.z-pb.z),searchGap:Math.hypot(ps.x+60,ps.z),home:Math.hypot(ph.x-60,ph.z+20),asleep:h.encounter.active===false};
 });
 expect(r.apart).toBeGreaterThan(3);
 expect(r.searchGap).toBeGreaterThan(3.5);expect(r.searchGap).toBeLessThan(8);
 expect(r.home).toBeLessThan(3);expect(r.asleep).toBe(true);
});
