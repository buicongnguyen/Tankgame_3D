import {test,expect,type Page} from '@playwright/test';
import {normalizeSkirmish,defaultSkirmish} from '../src/three/skirmish';
import {freshSave,SAVE_KEY} from '../src/three/campaign';

test('skirmish settings reject bad input and keep at least one battlefield',()=>{
 expect(normalizeSkirmish(null)).toEqual(defaultSkirmish());
 expect(normalizeSkirmish({maps:[5,5,-1,99,2.5,3],speed:9,teams:0,size:-2,field:7})).toEqual({maps:[3,5],speed:1,teams:2,size:1,field:0});
 expect(normalizeSkirmish({maps:[],speed:3,teams:4,size:2,field:1})).toEqual({maps:[0,1,2],speed:3,teams:4,size:2,field:1});
 // Settings saved before Large fields existed load as Standard.
 expect(normalizeSkirmish({maps:[1],speed:1,teams:2,size:1}).field).toBe(0);
});

async function battle(page:Page,config:object){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 return page.evaluate(config=>{const g=(window as any).__steel;g.frame=()=>{};g.skirmishDraft=config;g.startSkirmish();g.player.hp=g.player.max=1e9;return {teams:g.skirmish.teams.map((t:any)=>t.role),units:g.enemies.length};},config);
}
/** Steps the battle with the player parked, recording each team's phase and bearing from the player. */
function simulate(page:Page,seconds:number){
 return page.evaluate(seconds=>{const g=(window as any).__steel,p=g.player.visual.root.position.clone(),frames:any[]=[];
  for(let t=0;t<seconds;t+=.5){for(let n=0;n<30;n++){g.step(1/60);g.player.visual.root.position.copy(p);}
   frames.push({t,teams:g.skirmish.teams.map((tm:any)=>{const c=g.skirmish.centroid(tm);return {role:tm.role,phase:tm.phase,since:tm.since,bearing:Math.atan2(c.x-p.x,c.z-p.z),range:Math.hypot(c.x-p.x,c.z-p.z)};})});}
  return frames;},seconds);
}
const gap=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))*180/Math.PI;

test('hammer and anvil: one team pins the front while the other strikes from the far side',async({page})=>{
 expect(await battle(page,{maps:[1],speed:1,teams:2,size:1})).toEqual({teams:['anvil','hammer'],units:16});
 const frames=await simulate(page,40);
 const strike=frames.find(f=>f.teams[1].phase==='assault')!;expect(strike,'hammer commits').toBeTruthy();
 // Before the hammer strikes, the anvil holds a pinning range instead of charging.
 expect(frames.filter(f=>f.t<strike.t-2).every(f=>f.teams[0].phase==='hold')).toBe(true);
 expect(frames.find(f=>f.t===strike.t-1)!.teams[0].range).toBeLessThan(34);
 expect(gap(strike.teams[0].bearing,strike.teams[1].bearing)).toBeGreaterThan(120);
 expect(frames.at(-1)!.teams.every((t:any)=>t.phase==='assault')).toBe(true);
});

test('pincer and reserve: flanks commit together from opposite sides, reserve waits then joins',async({page})=>{
 expect((await battle(page,{maps:[6],speed:1,teams:3,size:0})).teams).toEqual(['pincer','reserve','pincer']);
 const frames=await simulate(page,40),first=frames.find(f=>f.teams[0].phase==='assault'||f.teams[2].phase==='assault')!;
 expect(first.teams[0].phase).toBe('assault');expect(first.teams[2].phase).toBe('assault');
 expect(first.teams[0].since).toBe(first.teams[2].since);
 expect(first.teams[1].phase).toBe('hold');
 expect(gap(first.teams[0].bearing,first.teams[2].bearing)).toBeGreaterThan(90);
 const joined=frames.find(f=>f.teams[1].phase==='assault');expect(joined&&joined.t).toBeGreaterThan(first.t);
});

test('encirclement: opposite pairs take turns assaulting while the others hold the ring',async({page})=>{
 expect((await battle(page,{maps:[6],speed:1,teams:4,size:0})).teams).toEqual(['ring','ring','ring','ring']);
 const frames=await simulate(page,44),waves=frames.map(f=>f.teams.map((t:any)=>t.phase==='assault'?'A':t.phase==='hold'?'H':'M').join('')).filter(s=>!s.includes('M'));
 expect(waves).toContain('AHAH');expect(waves).toContain('HAHA');
 const spread=frames.find(f=>f.teams.every((t:any)=>t.phase!=='move'))!.teams.map((t:any)=>t.bearing).sort((a:number,b:number)=>a-b);
 for(let i=0;i<4;i++)expect(gap(spread[i],spread[(i+1)%4])).toBeGreaterThan(40);
});

test('a hammer broken before it strikes releases the anvil to charge',async({page})=>{
 await battle(page,{maps:[1],speed:1,teams:2,size:1});
 const r=await page.evaluate(()=>{const g=(window as any).__steel,[anvil,hammer]=g.skirmish.teams;
  for(const u of hammer.units.slice(0,6))g.damageUnit(u,1e9,g.player.visual.root.position,true);
  const p=g.player.visual.root.position.clone();for(let i=0;i<60;i++){g.step(1/60);g.player.visual.root.position.copy(p);}
  return {follow:hammer.follow,anvil:anvil.phase};});
 expect(r).toEqual({follow:0,anvil:'assault'});
});

test('Hard and Crazy toughen skirmish enemies instead of adding more of them',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const hp=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};const out:any={};
  for(const d of ['normal','hard','crazy']){g.save.difficulty=d;g.skirmishDraft={maps:[1],speed:1,teams:1,size:0,field:0};g.startSkirmish();const raider=g.enemies.find((e:any)=>e.role==='raider');out[d]={hp:raider.max,count:g.enemies.length};g.leaveTraining();}
  return out;});
 expect(hp.hard.hp/hp.normal.hp).toBeCloseTo(1.25);expect(hp.crazy.hp/hp.normal.hp).toBeCloseTo(1.5);
 expect(hp.hard.count).toBe(hp.normal.count);expect(hp.crazy.count).toBe(hp.normal.count);
});

test('AI speed scales every enemy role by the chosen pace',async({page})=>{
 await battle(page,{maps:[1],speed:0,teams:1,size:0});
 const slow=await page.evaluate(()=>{const g=(window as any).__steel;return g.enemies.filter((e:any)=>!g.isInfantry(e)).map((e:any)=>g.enemySpeed(e));});
 await page.evaluate(()=>{const g=(window as any).__steel;g.skirmishDraft={maps:[1],speed:3,teams:1,size:0};g.startSkirmish();});
 const blitz=await page.evaluate(()=>{const g=(window as any).__steel;return {speeds:g.enemies.filter((e:any)=>!g.isInfantry(e)).map((e:any)=>g.enemySpeed(e)),pace:g.skirmish.pace};});
 expect(blitz.pace).toBe(1.6);blitz.speeds.forEach((v:number,i:number)=>expect(v/slow[i]).toBeCloseTo(1.6/.75));
});

for(const viewport of [{width:1280,height:800},{width:390,height:844}])test(`skirmish series ${viewport.width}: setup persists, battles chain and the campaign save is untouched`,async({browser})=>{
 const touch=viewport.width<600,context=await browser.newContext({viewport,isMobile:touch,hasTouch:touch});const page=await context.newPage();
 const campaign={...freshSave(),credits:500,strikeCharges:3,cleared:freshSave().cleared.map((_,i)=>i<2)};campaign.mission=2;
 await page.addInitScript(([key,save])=>{if(!localStorage.getItem('seeded')){localStorage.setItem(key,save);localStorage.setItem('seeded','1');}},[SAVE_KEY,JSON.stringify(campaign)]);
 const press=(selector:string)=>touch?page.locator(selector).tap():page.locator(selector).click();
 await page.goto('/?e2e');await page.locator('[data-action="skirmish-setup"]').waitFor();await page.evaluate(()=>{(window as any).__steel.frame=()=>{};});
 await press('[data-action="skirmish-setup"]');await expect(page.locator('.skirmish-panel')).toBeVisible();
 await press('[data-action="sk-map"][data-value="2"]');await press('[data-action="sk-teams"][data-value="1"]');await press('[data-action="sk-speed"][data-value="3"]');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await press('[data-action="sk-field"][data-value="1"]');await expect(page.locator('.skirmish-panel')).toContainText('288 × 240 m');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await press('[data-action="sk-field"][data-value="0"]');
 expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('steel-front-3d-skirmish')!))).toEqual({maps:[0,1],speed:3,teams:2,size:1,field:0});
 await expect(page.locator('[data-action="sk-start"]')).toHaveText(/2 BATTLES/);await press('[data-action="sk-start"]');
 const first=await page.evaluate(()=>{const g=(window as any).__steel;return {map:g.mission,teams:g.skirmish.teams.length,colors:new Set(g.enemies.map((e:any)=>e.squad)).size,amber:(()=>{let hex=0;g.enemies.find((e:any)=>e.squad===1&&e.role==='raider').visual.root.traverse((o:any)=>{if(o.isMesh&&o.material.name==='Armor')hex=o.material.color.getHex();});return hex;})(),header:document.querySelector('#mission-number')!.textContent,strikes:g.save.strikeCharges};});
 expect(first).toMatchObject({map:0,teams:2,colors:2,strikes:2,amber:0x86662a});expect(first.header).toContain('SKIRMISH 1/2 · BLITZ AI');
 const win=()=>page.evaluate(()=>{const g=(window as any).__steel;for(const e of g.enemies)if(!e.dead)g.damageUnit(e,1e9,g.player.visual.root.position);for(let i=0;i<120;i++)g.step(1/60);});
 await win();await expect(page.locator('[data-action="skirmish-next"]')).toBeVisible();await press('[data-action="skirmish-next"]');
 expect(await page.evaluate(()=>(window as any).__steel.mission)).toBe(1);
 await win();await expect(page.locator('.skirmish-log li')).toHaveCount(2);await expect(page.locator('.skirmish-panel h1')).toHaveText('2 / 2 won');
 await press('.skirmish-panel [data-action="menu"]');
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SAVE_KEY);
 expect({credits:saved.credits,strikes:saved.strikeCharges,cleared:saved.cleared.filter(Boolean).length,mission:saved.mission}).toEqual({credits:500,strikes:3,cleared:2,mission:2});
 expect(await page.evaluate(()=>(window as any).__steel.skirmish)).toBeNull();await context.close();
});

test('losing a skirmish battle offers a retry of the same battlefield',async({page})=>{
 await battle(page,{maps:[3,5],speed:1,teams:2,size:0});
 await page.evaluate(()=>{const g=(window as any).__steel;g.skirmish.round=1;g.startSkirmishBattle(),g.clearOpening();g.damageUnit(g.player,1e12,{x:0,z:0});for(let i=0;i<30;i++)g.step(1/60);});
 await expect(page.getByRole('button',{name:/RETRY LAST SIGNAL/})).toBeVisible();await page.getByRole('button',{name:/RETRY LAST SIGNAL/}).click();
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {phase:g.phase,map:g.mission,round:g.skirmish.round,hostiles:g.enemies.filter((e:any)=>!e.dead).length};})).toEqual({phase:'playing',map:5,round:1,hostiles:12});
});
