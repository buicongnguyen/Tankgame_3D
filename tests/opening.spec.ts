import {test,expect,type Page} from '@playwright/test';

async function ready(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};});
}

test('no enemy starts inside the deployment zone on any stage or level',async({page})=>{
 await ready(page);
 const rows=await page.evaluate(()=>{const g=(window as any).__steel,out:any[]=[];g.save.difficulty='crazy';
  for(let m=0;m<16;m++)for(let level=0;level<3;level++){g.start(m,level);const z=g.deployZone;if(!z){out.push({m,level,kind:g.missionData().kind,zone:false});continue;}
   const inside=g.enemies.filter((e:any)=>!e.dead&&!e.pending&&Math.hypot(e.visual.root.position.x-z.x,e.visual.root.position.z-z.z)<(g.isInfantry(e)?z.infantry:z.vehicle)-.01);
   const patrol=g.enemies.filter((e:any)=>e.patrol?.points.slice(1).some((p:any)=>Math.hypot(p.x-z.x,p.z-z.z)<(g.isInfantry(e)?z.infantry:z.vehicle)));
   out.push({m,level,kind:g.missionData().kind,zone:true,vehicle:z.vehicle,inside:inside.length,patrol:patrol.length});}
  return out;});
 for(const r of rows){
  // Escort stages keep their own 36 m deployment zone; every other stage uses the new one.
  expect(r.zone,`stage ${r.m+1}.${r.level+1}`).toBe(r.kind!=='escort');
  if(!r.zone)continue;
  expect(r.vehicle).toBeGreaterThanOrEqual(18);
  expect({stage:`${r.m+1}.${r.level+1}`,inside:r.inside,patrol:r.patrol}).toEqual({stage:`${r.m+1}.${r.level+1}`,inside:0,patrol:0});
 }
});

test('a deployment shield absorbs the opening fire, then expires; training starts unshielded',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,out:any={};
  for(const d of ['easy','normal','hard','crazy']){g.save.difficulty=d;g.start(9,0);out[d]=g.shieldTime;}
  // Stage 10 used to open with a jeep 5 m away: nothing lands while shielded, even on Crazy.
  g.save.difficulty='crazy';g.start(9,0);const hp=g.player.hp,p=g.player.visual.root.position.clone();let firstHit=-1;
  for(let n=0;n<60*12;n++){const before=g.player.hp;g.step(1/60);g.player.visual.root.position.copy(p);g.player.hp=Math.max(g.player.hp,1);if(firstHit<0&&g.player.hp<before)firstHit=g.elapsed;}
  out.firstHit=firstHit;out.status=(g.start(9,0),g.updateHud(),document.querySelector('#status-line')!.textContent);out.full=hp;
  g.startTraining(0);out.training=g.shieldTime;g.leaveTraining();
  return out;});
 expect({easy:r.easy,normal:r.normal,hard:r.hard,crazy:r.crazy,training:r.training}).toEqual({easy:8,normal:6,hard:5,crazy:5,training:0});
 expect(r.firstHit).toBeGreaterThanOrEqual(5);expect(r.status).toBe('DEPLOYMENT SHIELD · 5s');
});

test('Easy opens with a free starter cache of 4 laser shots and 2 arc rockets; other modes do not',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.save.difficulty='normal';g.start(5,0);const normal=g.airSupport.drops.length;
  g.save.difficulty='easy';g.save.weapons=[];g.start(5,0);
  const inbound=g.airSupport.drops.map((d:any)=>`${d.activity.kind}:${d.activity.amount}`).sort(),radio=document.querySelector('#radio')!.textContent;
  const budget={used:g.airSupport.used,remaining:g.airSupport.remaining(g),cooldown:g.artilleryCooldown};
  for(let i=0;i<60*3.5;i++)g.step(1/60);
  const crate=g.world.activities.find((a:any)=>a.kind==='laser'&&a.amount===4&&!a.spent);
  g.player.visual.root.position.set(crate.x,0,crate.z);g.updateActivities(.01);
  return {normal,inbound,budget,laser:g.specialAmmo[0],usable:g.weaponAvailable(3),radioKept:document.querySelector('#radio')!.textContent===radio||!document.querySelector('#radio')!.textContent!.includes('Crate landed')};});
 expect(r.normal).toBe(0);expect(r.inbound).toEqual(['arc:2','laser:4']);
 expect(r.budget).toEqual({used:0,remaining:2,cooldown:0});
 expect(r.laser).toBe(4);expect(r.usable).toBe(true);expect(r.radioKept).toBe(true);
});
