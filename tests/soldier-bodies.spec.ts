import {test,expect,type Page} from '@playwright/test';

async function ready(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};});
}

/** The rig every soldier must keep: pivots, muzzle, the height of a person and feet on the ground. */
test('soldier bodies keep the rig contract and carry baked shading in both detail tiers',async({page})=>{
 await ready(page);
 const rows=await page.evaluate(async()=>{const g=(window as any).__steel,out:any[]=[];
  for(const low of [false,true]){await g.world.load(low);
   for(const name of ['rifleman','rocketeer']){
    const root=g.world.templates.get(name);root.updateMatrixWorld(true);
    const pos=(n:string)=>{const o=root.getObjectByName(n);return o?[o.position.x,o.position.y,o.position.z].map((v:number)=>+v.toFixed(2)):null;};
    let meshes=0,tris=0,minY=1e9,maxY=-1e9,maxX=0;const colors=new Set<string>();
    root.traverse((o:any)=>{if(!o.isMesh)return;meshes++;const geo=o.geometry;tris+=(geo.index?geo.index.count:geo.attributes.position.count)/3;
     const p=geo.attributes.position,c=geo.attributes.color,v=new (o.position.constructor)();
     for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);maxX=Math.max(maxX,Math.abs(v.x));colors.add([c.getX(i),c.getY(i),c.getZ(i)].map((n:number)=>n.toFixed(2)).join(','));}});
    out.push({low,name,meshes,tris:Math.round(tris),pivots:{hull:!!root.getObjectByName('Hull'),turret:pos('Turret'),left:pos('LeftLeg'),right:pos('RightLeg'),muzzle:pos('Muzzle')},height:+(maxY-minY).toFixed(2),feet:+minY.toFixed(2),width:+(maxX*2).toFixed(2),colors:colors.size});
   }}
  return out;});
 for(const r of rows){
  const tag=`${r.name} ${r.low?'low':'high'}`;
  expect(r.meshes,tag).toBeLessThanOrEqual(3);                               // torso + two legs after crew batching
  expect(r.pivots.hull,tag).toBe(true);
  expect(r.pivots.turret,tag).toEqual([0,1.2,0]);expect(r.pivots.left,tag).toEqual([-.23,.92,0]);expect(r.pivots.right,tag).toEqual([.23,.92,0]);
  expect(r.pivots.muzzle,tag).toEqual(r.name==='rifleman'?[.28,.16,1.18]:[.42,.47,1.08]);
  expect(r.height,tag).toBeGreaterThan(2.15);expect(r.height,tag).toBeLessThan(2.45);   // a person, as tall as the old figure
  expect(Math.abs(r.feet),tag).toBeLessThan(.06);                              // boots stand on the ground
  expect(r.width,tag).toBeGreaterThan(.9);expect(r.width,tag).toBeLessThan(1.5);
  expect(r.colors,tag).toBeGreaterThan(40);                                    // occlusion + mottling multiplied into the finish
  expect(r.tris,tag).toBeLessThan(r.low?700:1700);
 }
 for(const name of ['rifleman','rocketeer']){const high=rows.find(r=>r.name===name&&!r.low),low=rows.find(r=>r.name===name&&r.low);expect(low.tris).toBeLessThan(high.tris*.5);}
});

test('soldiers stay in the game: legs swing, the muzzle leads the shot and units survive a detail change',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.start(0,1);g.clearOpening();
  const rifle=g.enemies.find((e:any)=>e.role==='rifleman'),rocket=g.enemies.find((e:any)=>e.role==='rocketeer');
  const out:any={};
  // Strides advance with distance walked, so walk each soldier a few steps and watch the leg swing.
  for(const u of [rifle,rocket]){const l=u.visual.root.getObjectByName('LeftLeg');let swing=0;for(let k=0;k<12;k++){u.visual.root.position.x+=.1;u.visual.root.userData.walking=true;g.syncVisual(u);swing=Math.max(swing,Math.abs(l.rotation.x));}out[u.role]={swing:swing>.1,muzzle:!!u.visual.muzzle};}
  await g.world.load(true);g.world.settings(true);
  const stillVisible=g.enemies.filter((e:any)=>!e.dead&&(e.role==='rifleman'||e.role==='rocketeer')).every((e:any)=>e.visual.root.children.length>0&&e.visual.root.getObjectByName('Muzzle'));
  await g.world.load(false);g.world.settings(false);out.back=g.enemies.filter((e:any)=>(e.role==='rifleman'||e.role==='rocketeer')).every((e:any)=>!!e.visual.root.getObjectByName('Muzzle'));out.stillVisible=stillVisible;
  return out;});
 expect(r).toEqual({rifleman:{swing:true,muzzle:true},rocketeer:{swing:true,muzzle:true},back:true,stillVisible:true});
});
