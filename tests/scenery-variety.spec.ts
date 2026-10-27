import {test,expect,type Page} from '@playwright/test';

async function ready(page:Page){
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='normal';});
}

test('temperate maps mix Hoshi Valley trees into the pine cover without changing gameplay',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,out:any={};
  for(const [m,label] of [[0,'grove'],[2,'river'],[7,'snow'],[10,'volcanic']] as const){
   g.start(m,1);const trees=g.world.covers.filter((c:any)=>c.kind==='pine'||c.kind==='white-pine');
   const models=[...new Set(trees.map((c:any)=>c.model??c.kind))].sort();
   const signature=trees.map((c:any)=>`${c.x.toFixed(1)},${c.z.toFixed(1)}:${c.model??''}`).join('|');g.start(m,1);
   const again=g.world.covers.filter((c:any)=>c.kind==='pine'||c.kind==='white-pine').map((c:any)=>`${c.x.toFixed(1)},${c.z.toFixed(1)}:${c.model??''}`).join('|');
   out[label]={models,count:trees.length,stable:signature===again,hp:[...new Set(trees.map((c:any)=>c.hp))],kinds:[...new Set(trees.map((c:any)=>c.kind))]};
  }
  return out;});
 expect(r.grove.models).toEqual(['pine','tree-broadleaf','tree-maple']);
 expect(r.river.models).toEqual(['pine','tree-broadleaf','tree-cedar']);
 // Snow keeps white pines and the volcanic basin keeps its burnt pines.
 expect(r.snow.models).toEqual(['white-pine']);expect(r.volcanic.models).toEqual(['pine']);
 for(const k of ['grove','river']){expect(r[k].kinds).toEqual(['pine']);expect(r[k].stable).toBe(true);for(const hp of r[k].hp)expect([65,70]).toContain(hp);}
});

test('reused trees load at full size in both detail tiers and stay cheaper than the pine on phones',async({page})=>{
 await ready(page);
 const size=(low:boolean)=>page.evaluate(async low=>{const g=(window as any).__steel,THREE=g.world.scene.constructor;await g.world.load(low);g.world.settings(low);
  const out:any={};for(const name of ['tree-broadleaf','tree-maple','tree-cedar','bush','reeds','grass-tuft','pine']){const root=g.world.templates.get(name);let tris=0;const box={min:[1e9,1e9,1e9],max:[-1e9,-1e9,-1e9]};
   root.updateMatrixWorld(true);root.traverse((o:any)=>{if(!o.isMesh)return;const geo=o.geometry;tris+=(geo.index?geo.index.count:geo.attributes.position.count)/3;const p=geo.attributes.position,v=new (o.position.constructor)();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);for(const [k,c] of [[0,'x'],[1,'y'],[2,'z']] as const){box.min[k]=Math.min(box.min[k],v[c]);box.max[k]=Math.max(box.max[k],v[c]);}}});
   out[name]={tris,height:+(box.max[1]-box.min[1]).toFixed(2),width:+Math.max(box.max[0]-box.min[0],box.max[2]-box.min[2]).toFixed(2)};}
  void THREE;return out;},low);
 const detailed=await size(false),mobile=await size(true);
 // Packed (quantized) vertices must not collapse into the unit cube when the load step merges them.
 expect(detailed['tree-broadleaf'].height).toBeGreaterThan(7);expect(detailed['tree-cedar'].height).toBeGreaterThan(11);expect(detailed.bush.width).toBeGreaterThan(1.7);
 expect(mobile['tree-broadleaf'].height).toBeGreaterThan(7);expect(mobile.bush.width).toBeGreaterThan(1.5);
 for(const name of ['tree-broadleaf','tree-maple','tree-cedar']){expect(detailed[name].tris).toBeLessThan(1800);expect(mobile[name].tris).toBeLessThan(mobile.pine.tris);}
});

test('ground cover is walk-through, stays off roads, water and cover, and skips snow',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const {projectRoute}=await import('/src/three/stage-layout.ts');const out:any={};
  for(const [m,label] of [[0,'grove'],[2,'river'],[7,'snow']] as const){g.start(m,1);
   const meshes:any[]=[];g.world.arena.traverse((o:any)=>{if(o.isInstancedMesh&&o.name.startsWith('GroundDressing'))meshes.push(o);});
   const p=new (g.world.scene.position.constructor)(),bad={road:0,cover:0,water:0};let items=0;
   for(const mesh of meshes){if(mesh.name!=='GroundDressing:grass-tuft'&&mesh.name!=='GroundDressing:bush')continue;
    for(let i=0;i<mesh.count;i++){const mat=new (g.world.camera.matrixWorld.constructor)();mesh.getMatrixAt(i,mat);p.setFromMatrixPosition(mat);items++;
     if(projectRoute(g.world.layout.points,{x:p.x,z:p.z}).distance<4.9)bad.road++;
     if(g.world.covers.some((c:any)=>c.hp>0&&Math.abs(p.x-c.x)<c.w/2&&Math.abs(p.z-c.z)<c.d/2))bad.cover++;
     if(label==='river'&&Math.abs(p.z-32)<4.5)bad.water++;}}
   out[label]={names:[...new Set(meshes.map((m:any)=>m.name))].sort(),items,bad,shadows:meshes.some((m:any)=>m.castShadow),dressingCovers:g.world.covers.filter((c:any)=>['grass-tuft','bush','reeds'].includes(c.kind)).length};
  }
  return out;});
 expect(r.grove.names).toEqual(['GroundDressing:bush','GroundDressing:grass-tuft']);
 expect(r.river.names).toEqual(['GroundDressing:bush','GroundDressing:grass-tuft','GroundDressing:reeds']);
 expect(r.snow.names).toEqual([]);
 for(const k of ['grove','river']){expect(r[k].items).toBeGreaterThan(150);expect(r[k].bad).toEqual({road:0,cover:0,water:0});expect(r[k].shadows).toBe(false);expect(r[k].dressingCovers).toBe(0);}
});

test('ground cover keeps off bog holes, the ridge mud pit and city asphalt',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const {terrainRegions,insideRegion}=await import('/src/three/terrain.ts');const out:any={};
  for(const [m,label] of [[15,'marsh'],[3,'ridge'],[13,'city']] as const){g.start(m,1);
   const p=new (g.world.scene.position.constructor)(),mat=new (g.world.camera.matrixWorld.constructor)(),regions=terrainRegions(g.world.environment.biome);let items=0,bad=0;
   g.world.arena.traverse((o:any)=>{if(!o.isInstancedMesh||!['GroundDressing:grass-tuft','GroundDressing:bush'].includes(o.name))return;
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,mat);p.setFromMatrixPosition(mat);items++;
     const inBog=regions.some((r:any)=>insideRegion({x:p.x,z:p.z},r)),inPit=label==='ridge'&&Math.hypot(p.x-36,p.z-17)<10.5,onRoad=label==='city'&&([-34,34].some(x=>Math.abs(p.x-x)<5.2)||[-34,-10,14,38].some(z=>Math.abs(p.z-z)<3.6));
     if(inBog||inPit||onRoad)bad++;}});
   out[label]={items,bad};}
  return out;});
 for(const k of ['marsh','ridge','city'])expect(r[k].items,k).toBeGreaterThan(20);
 expect(r).toMatchObject({marsh:{bad:0},ridge:{bad:0},city:{bad:0}});
});

test('a destroyed variant tree hides only its own instance, and detail changes keep the mix',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.start(0,1);
  const variant=g.world.covers.find((c:any)=>c.scenery&&c.model==='tree-maple'),twin=g.world.covers.find((c:any)=>c!==variant&&c.scenery?.parts===variant.scenery.parts);
  const hp=twin.hp;g.hitCover(variant,1e6);
  const hidden=()=>variant.scenery.parts.every((p:any)=>p.instanceMatrix.array[variant.scenery.index*16]===0);
  const first=variant.hp<=0&&hidden(),neighbour=twin.hp===hp&&twin.scenery.parts.every((p:any)=>p.instanceMatrix.array[twin.scenery.index*16]!==0);
  const before=g.world.covers.filter((c:any)=>c.model).length;
  await g.world.load(true);g.world.settings(true);const swapped=variant.scenery.parts.every((p:any)=>!!p.userData.modelAsset)&&hidden();
  await g.world.load(false);g.world.settings(false);
  return {first,neighbour,swapped,mix:g.world.covers.filter((c:any)=>c.model).length===before,kind:variant.kind};});
 expect(r).toEqual({first:true,neighbour:true,swapped:true,mix:true,kind:'pine'});
});

test('Large skirmish fields plant the same tree mix in their outer ring',async({page})=>{
 await ready(page);
 const r=await page.evaluate(()=>{const g=(window as any).__steel;g.skirmishDraft={maps:[0],speed:1,teams:1,size:0,field:1};g.startSkirmish();
  const ring=g.world.covers.filter((c:any)=>c.kind==='pine'&&(Math.abs(c.x)>72||Math.abs(c.z)>60));
  return {ring:ring.length,models:[...new Set(ring.map((c:any)=>c.model??'pine'))].sort(),parts:[...new Set(ring.map((c:any)=>c.model??'pine'))].every((m:string)=>{let found=false;g.world.arena.traverse((o:any)=>{if(o.isInstancedMesh&&o.name===`OuterRing:${m==='pine'?'pine':m}`)found=true;});return found;})};});
 expect(r.ring).toBeGreaterThan(15);expect(r.models).toEqual(['pine','tree-broadleaf','tree-maple']);expect(r.parts).toBe(true);
});

test('without the reused models every tree stays a pine and the game still starts',async({page})=>{
 await ready(page);
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;
  for(const name of ['tree-broadleaf','tree-maple','tree-cedar','grass-tuft','bush','reeds'])g.world.templates.delete(name);
  g.start(0,1);
  const trees=g.world.covers.filter((c:any)=>c.kind==='pine');let dressing=0;g.world.arena.traverse((o:any)=>{if(o.name?.startsWith('GroundDressing'))dressing++;});
  return {trees:trees.length,variants:trees.filter((c:any)=>c.model).length,dressing,phase:g.phase};});
 expect(r.trees).toBeGreaterThan(10);expect(r).toMatchObject({variants:0,dressing:0,phase:'playing'});
});
