import {expect,test} from '@playwright/test';

const ready=async(page:any)=>{await page.goto('/?e2e');await page.waitForSelector('[data-action=deploy]');await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};try{localStorage.removeItem('steel-front-tips');}catch{}g.fun.seen.clear();});};

test('tips: each shows once, one at a time, only on Easy and Normal with helpers on',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;const radio=()=>g.radio.textContent||'';const out:any={};
  const run=(difficulty:string,helpers:boolean)=>{g.helpers=helpers;g.save.difficulty=difficulty;g.start(4,0);g.clearOpening();g.radioTimer=0;g.elapsed=5;g.radio.textContent='';g.player.hp=g.player.max*.2;g.fun.update(g);return radio();};
  out.off=run('easy',false);out.hard=run('hard',true);out.easy=run('easy',true);out.seen=[...g.fun.seen];
  // the same tip never repeats, even in a new battle
  out.again=run('easy',true);
  // a second tip waits 12 s after the last
  g.fun.seen.clear();g.helpers=true;g.radioTimer=0;g.elapsed=5;out.first=g.fun.tip(g,'kite');g.radioTimer=0;g.elapsed=10;out.tooSoon=g.fun.tip(g,'fence');g.elapsed=18;out.later=g.fun.tip(g,'fence');
  // an ambush hit shows its tip
  g.fun.seen.clear();g.save.difficulty='normal';g.start(4,0);g.clearOpening();g.radioTimer=0;g.elapsed=30;const e=g.enemies.find((x:any)=>x.encounter&&!x.encounter.active&&!x.dead&&!x.perch);e.hp=e.max=5000;g.damageUnit(e,10,g.player.visual.root.position);out.ambush=radio();
  return out;});
 expect(r.off).toBe('');expect(r.hard).toBe('');expect(r.easy).toContain('Hull low');expect(r.seen).toEqual(['hull']);expect(r.again).toBe('');
 expect(r.first).toBe(true);expect(r.tooSoon).toBe(false);expect(r.later).toBe(true);
 expect(r.ambush).toContain('Ambush!');
});

test('revive: the defeat card offers it twice on Easy and once on Normal, returns the tank with full hull and a shield; never on Hard or when the objective is lost',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.helpers=true;const out:any={};
  const die=()=>{g.player.dead=true;g.step(1/60);return {phase:g.phase,button:!!document.querySelector('#overlay [data-action=revive]'),primary:document.querySelector('#overlay .primary')?.getAttribute('data-action')};};
  const revive=()=>{(document.querySelector('#overlay [data-action=revive]') as HTMLButtonElement).click();const p=g.player;return {phase:g.phase,hp:p.hp===p.max,dead:p.dead,visible:p.visual.root.visible,shield:g.shieldTime};};
  g.save.difficulty='easy';g.start(0,1);g.clearOpening();out.easy=[die(),revive(),die(),revive(),die()];out.revived=g.fun.revived;
  g.save.difficulty='normal';g.start(0,1);g.clearOpening();out.normal=[die(),revive(),die()];
  g.save.difficulty='hard';g.start(0,1);g.clearOpening();out.hard=die();
  g.save.difficulty='easy';g.start(7,0);g.clearOpening();g.convoyHealth=0;g.step(1/60);out.convoy=!!document.querySelector('#overlay [data-action=revive]');
  return out;});
 const [d1,r1,d2,r2,d3]=r.easy;
 expect(d1).toEqual({phase:'failed',button:true,primary:'revive'});expect(r1).toEqual({phase:'playing',hp:true,dead:false,visible:true,shield:4});
 expect(d2.button).toBe(true);expect(r2.phase).toBe('playing');expect(d3).toEqual({phase:'failed',button:false,primary:'retry'});expect(r.revived).toBe(2);
 expect(r.normal[0].button).toBe(true);expect(r.normal[2].button).toBe(false);
 expect(r.hard.button).toBe(false);expect(r.convoy).toBe(false);
});

test('a revive returns to the last safe spot, or to the deployment point when enemies have moved in',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.helpers=true;g.save.difficulty='easy';g.start(0,1);g.clearOpening();
  for(const e of g.enemies)if(e.encounter)e.encounter.active=false;
  const p=g.player.visual.root.position,spawn=g.world.layout.spawn;g.fun.checkpoint={x:spawn.x+6,z:spawn.z+6};const safe=g.fun.revivePoint(g);
  const e=g.enemies.find((x:any)=>!x.dead&&x.encounter);e.encounter.active=true;e.visual.root.position.set(spawn.x+10,0,spawn.z+6);const crowded=g.fun.revivePoint(g);
  return {safe,crowded,spawn:{x:spawn.x,z:spawn.z},p:[p.x,p.z]};});
 expect(r.safe).toEqual({x:r.spawn.x+6,z:r.spawn.z+6});expect(r.crowded).toEqual(r.spawn);
});

test('field support: after two defeats in a row on a level, enemy fire hurts 25% less there; a win or Hard turns it off',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.helpers=true;const out:any={};
  const lose=()=>{g.player.dead=true;g.step(1/60);};
  g.save.difficulty='normal';g.start(2,0);out.fresh=g.fun.playerDamageScale();lose();g.start(2,0);out.once=g.fun.playerDamageScale();lose();g.start(2,0);out.twice=g.fun.playerDamageScale();
  g.start(3,0);out.otherLevel=g.fun.playerDamageScale();
  g.start(2,0);g.radioTimer=0;g.elapsed=.85;g.fun.update(g);out.line=g.radio.textContent;
  g.fun.won(g);g.start(2,0);out.afterWin=g.fun.playerDamageScale();
  g.save.difficulty='hard';lose();lose();g.start(2,0);lose();g.start(2,0);lose();g.start(2,0);out.hard=g.fun.playerDamageScale();
  return out;});
 expect(r.fresh).toBe(1);expect(r.once).toBe(1);expect(r.twice).toBe(.75);expect(r.otherLevel).toBe(1);expect(r.line).toContain('Extra armour');expect(r.afterWin).toBe(1);expect(r.hard).toBe(1);
});

test('finale: the winning kill shows AREA CLEAR with the credits and slows the finish; off without helpers',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;const out:any={};
  const win=(helpers:boolean)=>{g.helpers=helpers;g.save.difficulty='easy';g.start(0,0);g.clearOpening();for(const e of g.enemies)if(!e.dead)g.damageUnit(e,e.hp+1e6,e.visual.root.position,true);for(let i=0;i<5&&g.phase==='playing';i++)g.step(1/60);
   const b=document.querySelector('.finale-banner');return {phase:g.phase,text:b?.textContent??'',speed:g.fun.drawSpeed(1/60)};};
  out.on=win(true);out.reward=g.stageResult?.total;out.off=win(false);return out;});
 expect(r.on.phase).toBe('finishing');expect(r.reward).toBeGreaterThan(0);expect(r.on.text).toBe(`AREA CLEAR+${r.reward} CR`);expect(r.on.speed).toBe(.4);
 expect(r.off.text).toBe('');expect(r.off.speed).toBe(1);
});
