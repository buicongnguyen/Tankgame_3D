import {test,expect} from '@playwright/test';

for(const kind of ['walker','spider'])test(`${kind} repeats light volleys sooner and still exposes its core`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const r=await page.evaluate(kind=>{const g=(window as any).__steel;g.frame=()=>{};g.start(0);g.world.covers=[];g.convoy=null;const b=g.makeUnit(0,0,'boss',kind);g.enemies=[b];b.visual.root.position.set(0,0,0);g.player.visual.root.position.set(0,0,30);g.player.hp=100000;
  const times:number[]=[],damage:number[]=[],rest:number[]=[];let exposedAt=0;const shoot=g.shoot.bind(g);g.shoot=(u:any,friendly:boolean)=>{shoot(u,friendly);if(u===b){times.push(g.elapsed);damage.push(g.shots.at(-1).damage);}};
  for(let i=0;i<1200;i++){const before=g.bosses.states.get(b)?.phase;g.elapsed+=1/60;g.bosses.update(g,b,1/60);const after=g.bosses.states.get(b)?.phase;if(after==='exposed'&&before!=='exposed')exposedAt=g.elapsed;if(before==='exposed'&&after==='tracking')rest.push(g.elapsed-exposedAt);g.updateShots(1/60);g.special.update(g,1/60);g.world.fx.update(1/60,g.world.camera);}
  const volleys=times.filter((_,i)=>i%3===0);return {volleys,damage,rest,core:g.bosses.multiplier(b),alive:!b.dead};
 },kind);
 expect(r.volleys.length).toBeGreaterThanOrEqual(kind==='walker'?5:4);expect(r.damage.every((v:number)=>v===33)).toBe(true);
 const gaps=r.volleys.slice(1).map((v:number,i:number)=>v-r.volleys[i]);expect(Math.max(...gaps)).toBeLessThan(kind==='walker'?3.6:4.95);expect(Math.min(...r.rest)).toBeGreaterThanOrEqual(kind==='walker'?1.59:2.79);expect(r.alive).toBe(true);
});

test('light laser pulses accelerate consistently at 30 and 60 fps with bounded effects',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const rows=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};return [30,60].map(fps=>{g.start(0);g.world.covers=[];const b=g.makeUnit(0,0,'boss','laser');g.enemies=[b];b.visual.root.position.set(0,0,0);g.player.visual.root.position.set(0,0,30);g.player.hp=100000;g.bosses.update(g,b,4.1);const hp=g.player.hp;g.bosses.update(g,b,1.51);const warned=hp===g.player.hp;
  const times:number[]=[];let peak=0;const rail=g.bosses.rail.bind(g.bosses);g.bosses.rail=(...args:any[])=>{times.push(g.elapsed);rail(...args);};
  while(g.bosses.states.get(b).phase==='firing'){g.elapsed+=1/fps;g.bosses.update(g,b,1/fps);g.special.update(g,1/fps);g.world.fx.update(1/fps,g.world.camera);peak=Math.max(peak,g.special.beams.length);}
  g.bosses.rail=rail;g.special.update(g,.3);return {fps,times,warned,peak,hurt:g.player.hp<hp,exposed:g.bosses.multiplier(b)>1,clean:g.special.beams.length===0};
 });});
 for(const r of rows){expect(r.times.length).toBe(8);expect(r.warned&&r.hurt&&r.exposed&&r.clean).toBe(true);expect(r.peak).toBeLessThanOrEqual(2);expect(Math.max(...r.times.slice(1).map((v:number,i:number)=>v-r.times[i]))).toBeLessThan(.18);}
});

for(const kind of ['missile','helicopter'])test(`${kind} warns its wider blast area and leaves space to dodge`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const rows=await page.evaluate(kind=>{const g=(window as any).__steel;g.frame=()=>{};return [-14,-14.6].map(x=>{g.start(0);g.world.covers=[];const b=g.makeUnit(0,0,'boss',kind);g.enemies=[b];b.visual.root.position.set(0,0,0);g.player.visual.root.position.set(0,0,30);g.bosses.update(g,b,4.1);const s=g.bosses.states.get(b),targets=JSON.stringify(s.targets),radii=s.markers.map((m:any)=>m.geometry.parameters.outerRadius),warning=s.time,markers=[...s.markers],rockets=[...s.rockets];
  g.player.visual.root.position.set(x,0,28);const hp=g.player.hp;g.bosses.update(g,b,warning-.01);const safeDuringWarning=g.player.hp===hp,locked=targets===JSON.stringify(s.targets);g.bosses.update(g,b,.02);return {x,warning,radii,targets:JSON.parse(targets),safeDuringWarning,locked,hurt:g.player.hp<hp,clean:markers.every((m:any)=>!m.parent)&&rockets.every((m:any)=>!m.parent)&&s.markers.length===0};
 });},kind);
 for(const r of rows){expect(r.radii).toEqual([6.5,6.5,6.5]);expect(r.targets.map((t:any)=>t.x)).toEqual([-8,0,8]);expect(r.warning).toBeGreaterThanOrEqual(1.8);expect(r.safeDuringWarning&&r.locked&&r.clean).toBe(true);}expect(rows[0].hurt).toBe(true);expect(rows[1].hurt).toBe(false);
});

test('heavy rail warning matches its wider shot, with cover and sidestep protection',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(0);const b=g.makeUnit(0,0,'boss','rail');g.enemies=[b];g.world.covers=[];b.visual.root.position.set(0,0,0);g.player.visual.root.position.set(0,0,30);g.bosses.update(g,b,4.1);g.bosses.update(g,b,.1);const warningWidth=b.visual.beam.geometry.parameters.width*b.visual.beam.scale.x;
  g.player.visual.root.position.x=1.8;const hp=g.player.hp;g.bosses.rail(g,b,0);const wideHit=g.player.hp<hp,beamWidth=g.special.beams.at(-1).mesh.geometry.parameters.radiusTop*2;
  g.player.visual.root.position.x=2.2;const hp2=g.player.hp;g.bosses.rail(g,b,0);const dodged=g.player.hp===hp2;
  const mesh=g.world.clone('barricade');mesh.position.set(0,0,15);g.world.covers=[{x:0,z:15,w:8,d:2,hp:Infinity,kind:'barricade',mesh}];g.player.visual.root.position.x=1.8;g.bosses.rail(g,b,0);const covered=g.player.hp===hp2;g.bosses.cancel(b);return {warningWidth,beamWidth,wideHit,dodged,covered,clean:!b.visual.beam.visible};
 });expect(r.warningWidth).toBeCloseTo(1.6);expect(r.beamWidth).toBeCloseTo(r.warningWidth);expect(r.wideHit&&r.dodged&&r.covered&&r.clean).toBe(true);
});
