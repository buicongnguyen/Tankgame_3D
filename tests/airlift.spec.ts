import {test,expect,type Page} from '@playwright/test';

/** Starts a skirmish battle with the player invulnerable and the render loop stopped. */
async function battle(page:Page,config:object){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(config=>{const g=(window as any).__steel;g.frame=()=>{};g.skirmishDraft=config;g.startSkirmish();g.player.hp=g.player.max=1e9;},config);
}
/** Steps the simulation with the player parked; `until` is evaluated each frame against the game. */
function run(page:Page,seconds:number,until='false'){
 return page.evaluate(([seconds,until])=>{const g=(window as any).__steel,p=g.player.visual.root.position.clone(),stop=new Function('g',`return ${until}`);
  for(let n=0;n<seconds*60;n++){g.step(1/60);g.player.visual.root.position.copy(p);if(stop(g))return n/60;}return seconds;},[seconds,until] as const);
}

test('Large field doubles the battlefield around the campaign core and flies each team\'s infantry in',async({page})=>{
 await battle(page,{maps:[1],speed:1,teams:2,size:1,field:1});
 const large=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,p=g.player.visual.root.position,b=w.bounds;
  const ring=w.covers.filter((c:any)=>Math.abs(c.x)>72||Math.abs(c.z)>60);
  const route=g.navigation.next(w,{x:b.x-12,z:b.z-12},{x:p.x,z:p.z});
  return {bounds:b,ring:ring.length,inside:w.covers.filter((c:any)=>c.kind!=='hill').every((c:any)=>Math.abs(c.x)<b.x&&Math.abs(c.z)<b.z),route:!!route,grid:[g.navigation.cols,g.navigation.rows],
   armor:g.skirmish.teams.map((t:any)=>{const c=g.skirmish.centroid(t);return Math.hypot(c.x-p.x,c.z-p.z);}),
   flights:g.airlifts.flights.map((f:any)=>({team:f.unit.squad,riders:f.passengers.map((r:any)=>r.role).sort(),pending:f.passengers.every((r:any)=>r.pending&&r.aboard===f.unit),range:Math.hypot(f.lz.x-p.x,f.lz.z-p.z),offMap:Math.abs(f.exit.x)>b.x||Math.abs(f.exit.z)>b.z,marker:!!f.marker.parent,altitude:f.unit.visual.root.position.y})),
   onFoot:g.enemies.filter((e:any)=>g.isInfantry(e)&&!e.pending).length,radio:document.querySelector('#radio')!.textContent};});
 expect(large.bounds).toEqual({x:144,z:120});expect(large.inside).toBe(true);expect(large.route).toBe(true);
 expect(large.ring).toBeGreaterThan(20);expect(large.grid).toEqual([95,79]);
 for(const r of large.armor)expect(r).toBeGreaterThan(80);
 expect(large.flights.map(f=>f.team)).toEqual([0,1]);expect(large.onFoot).toBe(0);
 for(const f of large.flights){expect(f).toMatchObject({riders:['rifleman','rifleman','rifleman','rocketeer'],pending:true,offMap:true,marker:true,altitude:11});expect(f.range).toBeGreaterThan(28);expect(f.range).toBeLessThan(84);}
 expect(large.radio).toContain('landing zones');
 // Each airlift keeps its own authored surfaces: the Signal lights still glow in team colours.
 expect(await page.evaluate(()=>{const g=(window as any).__steel;let glow=0;g.airlifts.flights[1].unit.visual.root.traverse((o:any)=>{if(o.isMesh&&o.material.name==='Signal')glow=Math.max(glow,o.material.emissive.getHex());});return glow;})).toBeGreaterThan(0);
 // Standard keeps the campaign battlefield and marches everyone in.
 await page.evaluate(()=>{const g=(window as any).__steel;g.skirmishDraft={maps:[1],speed:1,teams:2,size:1,field:0};g.startSkirmish();});
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {bounds:g.world.bounds,flights:g.airlifts.flights.length,pending:g.enemies.filter((e:any)=>e.pending).length};})).toEqual({bounds:{x:72,z:60},flights:0,pending:0});
});

test('an airlift lands, lowers its ramp, unloads every soldier and leaves without a kill or wreck',async({page})=>{
 await battle(page,{maps:[1],speed:1,teams:1,size:1,field:1});
 const trace=await page.evaluate(()=>{const g=(window as any).__steel,f=g.airlifts.flights[0],u=f.unit,p=g.player.visual.root.position.clone(),seen:any={phases:[],openOnGround:false,openInAir:false,maxY:0,landedAt:null},wrecks=g.world.wrecks.length;
  for(let n=0;n<60*60&&!u.dead;n++){g.step(1/60);g.player.visual.root.position.copy(p);const y=u.visual.root.position.y,ramp=u.visual.root.getObjectByName('Ramp').rotation.x;
   if(seen.phases.at(-1)!==f.phase)seen.phases.push(f.phase);seen.maxY=Math.max(seen.maxY,y);
   if(ramp<-1.7&&y===0)seen.openOnGround=true;if(ramp<-.1&&y>0)seen.openInAir=true;
   if(f.phase==='unload'&&seen.landedAt===null)seen.landedAt={x:u.visual.root.position.x-f.lz.x,z:u.visual.root.position.z-f.lz.z,t:g.elapsed};}
  return {...seen,dead:u.dead,kills:g.kills,wreckAdded:g.world.wrecks.length>wrecks,flights:g.airlifts.flights.length,marker:!!f.marker.parent,
   riders:f.passengers.map((r:any)=>({pending:r.pending,aboard:!!r.aboard,visible:r.visual.root.visible,fromLz:Math.hypot(r.visual.root.position.x-f.lz.x,r.visual.root.position.z-f.lz.z)}))};});
 expect(trace.phases).toEqual(['ingress','descend','unload','ascend','egress']);
 expect(trace.maxY).toBe(11);expect(trace.openOnGround).toBe(true);expect(trace.openInAir).toBe(false);
 expect(Math.hypot(trace.landedAt.x,trace.landedAt.z)).toBeLessThan(.1);
 // First contact research target: troops on the ground well inside the opening 45 seconds.
 expect(trace.landedAt.t).toBeLessThan(25);
 expect(trace).toMatchObject({dead:true,kills:0,wreckAdded:false,flights:0,marker:false});
 for(const r of trace.riders){expect(r).toMatchObject({pending:false,aboard:false,visible:true});}
});

test('airborne airlifts shrug off shells but not laser; on the ground every gun hits; downing one kills everyone aboard',async({page})=>{
 await battle(page,{maps:[6],speed:1,teams:1,size:0,field:1});
 const air=await page.evaluate(()=>{const g=(window as any).__steel,u=g.airlifts.flights[0].unit,from=g.player.visual.root.position,hp=u.hp;
  g.damageUnit(u,50,from);const shell=hp-u.hp;g.damageUnit(u,50,from,true);return {airborne:g.airborne(u),shell,laser:hp-u.hp};});
 expect(air).toEqual({airborne:true,shell:0,laser:50});
 await run(page,40,"g.airlifts.flights[0].phase==='unload'");
 const ground=await page.evaluate(()=>{const g=(window as any).__steel,u=g.airlifts.flights[0].unit,hp=u.hp;g.damageUnit(u,40,g.player.visual.root.position);return {airborne:g.airborne(u),shell:hp-u.hp};});
 expect(ground).toEqual({airborne:false,shell:40});
 // A fresh battle: shoot the airlift down on the way in.
 await page.evaluate(()=>{const g=(window as any).__steel;g.startSkirmishBattle();g.player.hp=g.player.max=1e9;});
 const downed=await page.evaluate(()=>{const g=(window as any).__steel,f=g.airlifts.flights[0],u=f.unit,team=g.skirmish.teams[0],before=g.skirmish.alive(team);
  g.damageUnit(u,1e9,g.player.visual.root.position,true);for(let i=0;i<30;i++)g.step(1/60);
  return {dead:u.dead,riders:f.passengers.map((r:any)=>r.dead),kills:g.kills,infantry:g.infantryKills,lost:before-g.skirmish.alive(team),flights:g.airlifts.flights.length,wreck:g.world.wrecks.some((w:any)=>!!w.root.getObjectByName('Rotor0')),radio:document.querySelector('#radio')!.textContent};});
 expect(downed).toMatchObject({dead:true,riders:[true,true,true],kills:1,infantry:3,lost:3,flights:0,wreck:true});
 expect(downed.radio).toContain('3 soldiers lost');
});

test('the battle ends once the last soldier falls, even while an empty airlift is still leaving',async({page})=>{
 await battle(page,{maps:[6],speed:1,teams:1,size:0,field:1});
 await run(page,40,"g.airlifts.flights[0].phase==='ascend'");
 const result=await page.evaluate(()=>{const g=(window as any).__steel,u=g.airlifts.flights[0].unit;
  for(const e of g.enemies)if(e!==u&&!e.dead)g.damageUnit(e,1e9,g.player.visual.root.position,true);
  const cleared=g.battlefieldClear();for(let i=0;i<30;i++)g.step(1/60);
  return {alive:!u.dead,cleared,phase:g.phase};});
 expect(result).toEqual({alive:true,cleared:true,phase:'finishing'});
});

test('each team calls exactly one reinforcement airlift when it falls below half strength',async({page})=>{
 await battle(page,{maps:[6],speed:1,teams:1,size:0,field:1});
 await run(page,40,"g.enemies.every(e=>!e.pending)");
 const kill=(n:number)=>page.evaluate(n=>{const g=(window as any).__steel;for(const e of g.skirmish.teams[0].units.filter((u:any)=>!u.dead&&!u.pending).slice(0,n))g.damageUnit(e,1e9,g.player.visual.root.position,true);},n);
 await kill(4);await run(page,1);
 const called=await page.evaluate(()=>{const g=(window as any).__steel,t=g.skirmish.teams[0],f=g.airlifts.flights.find((x:any)=>x.phase==='ingress'),p=g.player.visual.root.position;
  return {reinforced:t.reinforced,units:t.units.length,riders:f?.passengers.map((r:any)=>r.role),range:f&&Math.hypot(f.lz.x-p.x,f.lz.z-p.z),squad:f?.unit.squad,radio:document.querySelector('#radio')!.textContent,
   hidden:!!f&&f.passengers.every((r:any)=>!r.visual.root.visible&&!r.visual.bar.visible)};});
 // Riders created mid-battle ride hidden, like the opening flights.
 expect(called).toMatchObject({reinforced:true,units:9,riders:['rifleman','rifleman','rocketeer'],squad:0,hidden:true});
 expect(called.range).toBeGreaterThan(16);expect(called.range).toBeLessThan(56);expect(called.radio).toContain('calling an airlift');
 await run(page,40,"g.enemies.every(e=>!e.pending)");await kill(4);await run(page,4);
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {units:g.skirmish.teams[0].units.length,inbound:g.airlifts.flights.filter((f:any)=>f.phase==='ingress').length};})).toEqual({units:9,inbound:0});
});

test('a tank parked on the landing zone holds the airlift in a hover out of shell reach until it diverts',async({page})=>{
 await battle(page,{maps:[1],speed:1,teams:1,size:1,field:1});
 const result=await page.evaluate(()=>{const g=(window as any).__steel,f=g.airlifts.flights[0],u=f.unit,first={...f.lz},me=g.player.visual.root.position;
  me.set(first.x,0,first.z);let hovered=0,lowest=99;
  for(let n=0;n<60*40&&f.phase!=='unload';n++){g.step(1/60);if(f.lz.x===first.x&&f.lz.z===first.z)me.set(first.x,0,first.z);const y=u.visual.root.position.y;if(f.phase==='descend'&&y===3)hovered+=1/60;if(f.lz.x===first.x&&f.lz.z===first.z)lowest=Math.min(lowest,y);}
  const foot={x:f.lz.x-Math.sin(f.face)*7,z:f.lz.z-Math.cos(f.face)*7};
  return {hovered,lowest,moved:Math.hypot(f.lz.x-first.x,f.lz.z-first.z),landed:f.phase==='unload',clear:Math.hypot(u.visual.root.position.x-me.x,u.visual.root.position.z-me.z),
   rampAway:Math.hypot(foot.x-me.x,foot.z-me.z)>Math.hypot(f.lz.x-me.x,f.lz.z-me.z)+5};});
 expect(result.hovered).toBeGreaterThan(4.5);expect(result.lowest).toBe(3);
 // It diverts well clear of the tank that blocked it, with the ramp opening away from that tank.
 expect(result.landed).toBe(true);expect(result.clear).toBeGreaterThanOrEqual(19.9);expect(result.rampAway).toBe(true);
});
