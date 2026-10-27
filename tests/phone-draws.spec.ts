import {test,expect,type Page} from '@playwright/test';

/** Structural guards for the phone frame: what the scene asks three.js to do every frame. */
async function battle(page:Page,stage:number,level=0){
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 await page.evaluate(({stage,level})=>{const g=(window as any).__steel;g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='normal';g.start(stage,level);g.clearOpening?.();},{stage,level});
}

test('model covers draw instanced, keep their damage tint and destruction, and decals merge per colour',async({page})=>{
 await battle(page,13,2);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world;
  // No cover is drawn as its own model clone any more: each keeps an empty group and an instance slot.
  const clones=w.covers.filter((c:any)=>{let meshes=0;c.mesh.traverse((o:any)=>{if(o.isMesh)meshes++;});return meshes>0;}).length;
  const kinds=new Set(w.covers.filter((c:any)=>c.scenery).map((c:any)=>c.kind));
  const block=w.covers.find((c:any)=>c.kind==='cityblock'&&c.scenery),{parts,index}=block.scenery,part=parts[0];
  const tint=()=>part.instanceColor.array[index*3];const fresh=tint();
  g.hitCover(block,block.hp/2);const worn=tint();const revision=w.navigationRevision;
  g.hitCover(block,1e6);const gone=parts.every((p:any)=>[0,5,10].every(k=>p.instanceMatrix.array[index*16+k]===0));
  const plain=w.arena.children.filter((o:any)=>o.isMesh&&!o.isInstancedMesh&&o.geometry.type==='PlaneGeometry').length;
  return {clones,kinds:[...kinds].sort(),fresh,worn,gone,hidden:!block.mesh.visible,rerouted:w.navigationRevision===revision+1,plain};});
 expect(r.clones).toBe(0);
 for(const kind of ['cityblock','house','fuelcrate'])expect(r.kinds).toContain(kind);
 expect(r.fresh).toBe(1);expect(r.worn).toBeLessThan(1);expect(r.gone&&r.hidden&&r.rerouted).toBe(true);
 expect(r.plain).toBeLessThan(4);   // ~98 street planes merged into a few colour batches
});

test('no material switches shader program between draws or rebuilds every frame',async({page})=>{
 await battle(page,13,2);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,p=g.player.visual.root.position;
  // Material shared by plain and instanced meshes (or with and without instance colour) flips program on every draw.
  const sig=new Map<any,Set<string>>();w.scene.traverseVisible((o:any)=>{if(!o.isMesh)return;for(const m of [].concat(o.material)){let s=sig.get(m);if(!s)sig.set(m,s=new Set());s.add(o.isInstancedMesh?(o.instanceColor?'instanced+colour':'instanced'):'plain');}});
  const mixed=[...sig].filter(([,s])=>s.size>1).map(([m,s])=>`${m.name||m.type}: ${[...s].join(', ')}`);
  // A transparent double-sided material drawn in two passes is marked for rebuild twice per frame.
  const versions=new Map([...sig.keys()].map((m:any)=>[m,m.version]));for(let i=0;i<3;i++)w.update(1/60,p);
  const rebuilt=[...versions].filter(([m,v])=>m.version!==v).map(([m])=>m.name||m.type);
  return {mixed,rebuilt};});
 expect(r.mixed).toEqual([]);expect(r.rebuilt).toEqual([]);
});

test('scenery built with the stage is frozen; pickups still hover and battle additions still move',async({page})=>{
 await battle(page,1,0);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,w=g.world,p=g.player.visual.root.position;
  const pickups=new Set(w.activities.map((a:any)=>a.mesh));let frozen=0,live=0;
  for(const child of w.arena.children)if(!pickups.has(child))child.traverse((o:any)=>{if(o.matrixAutoUpdate)live++;else frozen++;});
  // A frozen object still has its correct world placement after the first render.
  w.update(1/60,p);const cover=w.covers.find((c:any)=>c.kind==='house')??w.covers[0];const e=cover.mesh.matrixWorld.elements;
  const placed=Math.abs(e[12]-cover.mesh.position.x)<1e-6&&Math.abs(e[14]-cover.mesh.position.z)<1e-6;
  const hover=w.activities.find((a:any)=>a.hover!==undefined&&!a.spent);let bob=null;
  if(hover){const y0=hover.mesh.matrixWorld.elements[13];for(let i=0;i<20;i++)w.update(1/30,p);bob=Math.abs(hover.mesh.matrixWorld.elements[13]-y0);}
  const wreck=new w.arena.constructor();w.arena.add(wreck);wreck.position.set(3,0,4);w.update(1/60,p);
  const moved=wreck.matrixWorld.elements[12]===3&&wreck.matrixWorld.elements[14]===4;wreck.removeFromParent();
  return {frozen,live,placed,bob,moved,roots:[w.scene,w.arena,w.entities].every((o:any)=>!o.matrixAutoUpdate)};});
 expect(r.frozen).toBeGreaterThan(20);expect(r.live).toBe(0);expect(r.placed).toBe(true);expect(r.moved).toBe(true);expect(r.roots).toBe(true);
 if(r.bob!==null)expect(r.bob).toBeGreaterThan(.001);
});

test('a heavy explosion barrage draws its particles in at most five instanced draws',async({page})=>{
 await battle(page,13,2);
 const r=await page.evaluate(()=>{const g=(window as any).__steel,fx=g.world.fx,p=g.player.visual.root.position.clone();fx.clear();
  for(let i=0;i<12;i++)fx.impact(p.clone().setX(p.x+i),true);fx.update(1/60,g.world.camera);
  const draws=fx.root.children.filter((m:any)=>m.isInstancedMesh&&m.count>0).length,meshes=fx.root.children.length;
  const live=fx.particles.length,drawn=fx.root.children.reduce((s:number,m:any)=>s+m.count,0);
  fx.update(10,g.world.camera);return {draws,meshes,live,drawn,after:fx.root.children.reduce((s:number,m:any)=>s+m.count,0)};});
 expect(r.live).toBeGreaterThan(100);expect(r.drawn).toBe(r.live);expect(r.draws).toBeLessThanOrEqual(5);expect(r.meshes).toBe(5);expect(r.after).toBe(0);
});
