import {test,expect} from '@playwright/test';
import * as T from 'three';
import {SceneryBatches} from '../src/three/scenery-batches';
import {EnemyBatches} from '../src/three/enemy-batches';

test('scenery batching preserves cover transforms, independent destruction and shared assets',()=>{
 const scene=new T.Scene(),arena=new T.Group();scene.add(arena);
 const geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();
 let disposals=0;geometry.addEventListener('dispose',()=>disposals++);material.addEventListener('dispose',()=>disposals++);
 const roots=[new T.Group(),new T.Group(),new T.Group()];
 for(const [i,root] of roots.entries()){
  root.position.set(i===2?80:i*4,0,0);root.rotation.y=i*.4;root.scale.set(1,2,1);arena.add(root);
  const part=new T.Mesh(geometry,material);part.position.y=2;part.castShadow=true;part.receiveShadow=true;part.userData.modelAsset='house';root.add(part);
 }
 const manager=new SceneryBatches(scene);manager.rebuild(arena);
 const batch=scene.children.find(o=>o.name==='ScenerySurfaceBatch') as T.InstancedMesh;
 expect(batch.count).toBe(2);expect(batch.geometry).toBe(geometry);expect((batch.material as T.Material).userData.instancedFrom).toBe(material.uuid);expect((batch.material as T.MeshStandardMaterial).color).toEqual(material.color);
 expect(batch.castShadow&&batch.receiveShadow).toBe(true);
 const m=new T.Matrix4();batch.getMatrixAt(1,m);
 expect(m.elements.every((v,i)=>Math.abs(v-roots[1].children[0].matrixWorld.elements[i])<1e-5)).toBe(true);
 expect(roots[2].children[0].layers.mask).toBe(1); // Distant singleton keeps its own culling.
 roots[0].visible=false;manager.update();expect(batch.count).toBe(1);
 arena.visible=false;manager.update();expect(batch.count).toBe(0);expect(batch.visible).toBe(false);
 arena.visible=true;manager.update();expect(batch.count).toBe(1);
 roots[1].removeFromParent();manager.update();expect(batch.count).toBe(0);
 manager.clear();expect(scene.children.filter(o=>o.name==='ScenerySurfaceBatch')).toHaveLength(0);
 for(const root of roots)expect(root.children[0].layers.mask).toBe(1);
 expect(disposals).toBe(0);geometry.dispose();material.dispose();
});

test('health instances retain individual team color, health width and retirement ownership',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,1,.1,100);camera.position.set(0,8,15);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const manager=new EnemyBatches(scene),roots=[new T.Group(),new T.Group()];
 const bars=roots.map((root,i)=>{
  scene.add(root);root.position.x=i*2;const bar=new T.Mesh(new T.PlaneGeometry(2.8,.16),new T.MeshBasicMaterial({color:i?'#33aaee':'#ffaa33',depthTest:false}));
  bar.userData.batchHealthBar=true;bar.renderOrder=5;bar.scale.x=i?.25:.8;root.add(bar);manager.add(root);return bar;
 });
 scene.updateMatrixWorld(true);manager.update(camera);
 const batch=scene.children.find(o=>o.userData.healthBarBatch) as T.InstancedMesh;
 expect(batch.count).toBe(2);expect(batch.renderOrder).toBe(5);expect(batch.castShadow).toBe(false);
 for(let i=0;i<2;i++){
  const color=new T.Color(),matrix=new T.Matrix4();batch.getColorAt(i,color);batch.getMatrixAt(i,matrix);
  for(const axis of ['r','g','b'] as const)expect(color[axis]).toBeCloseTo(bars[i].material.color[axis],5);
  expect(matrix.elements[0]).toBeCloseTo(bars[i].scale.x,5);
 }
 let sharedDisposed=false;batch.geometry.addEventListener('dispose',()=>sharedDisposed=true);
 manager.remove(roots[0]);roots[0].removeFromParent();bars[0].geometry.dispose();bars[0].material.dispose();manager.update(camera);
 expect(batch.count).toBe(1);expect(sharedDisposed).toBe(false);expect(bars[0].layers.mask).toBe(1);
 bars[1].visible=false;manager.update(camera);expect(batch.count).toBe(0);
 bars[1].visible=true;manager.update(camera);expect(batch.count).toBe(1);
 manager.clear();expect(scene.children.some(o=>o.userData.healthBarBatch)).toBe(false);expect(sharedDisposed).toBe(false);
 bars[1].geometry.dispose();bars[1].material.dispose();batch.geometry.dispose();(batch.material as T.Material).dispose();
});

test('all backgrounds rebuild with bounded resources and dense scenes stay within draw budgets',async({page})=>{
 test.setTimeout(240000);
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{
  const g=(window as any).__steel,w=g.world;g.frame=()=>{};g.save.difficulty='crazy';
  const render=()=>{w.target.set(0,0,0);g.player.visual.root.position.set(0,0,0);w.update(0,g.player.visual.root.position);};
  const memory=()=>({...w.renderer.info.memory,programs:w.renderer.info.programs.length});
  const lowMemory:any[]=[],highCalls:any[]=[];
  await w.load(true);w.settings(true);
  for(let pass=0;pass<2;pass++){
   for(let mission=0;mission<16;mission++){
    let seed=42;const random=Math.random;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    try{g.start(mission,2);}finally{Math.random=random;}
    render();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   }
   lowMemory.push(memory());
  }
  for(const low of [false,true,false]){
   await w.load(low);w.settings(low);
   for(const mission of [12,13]){g.start(mission,2);render();highCalls.push({low,mission,calls:w.renderer.info.render.calls});await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
  }
  const cover=w.covers.find((c:any)=>Number.isFinite(c.hp)&&c.hp>0&&c.scenery);
  if(!cover)throw new Error('Expected destructible instanced cover');
  g.hitCover(cover,99999);render();const removed=!cover.mesh.visible&&cover.scenery.parts.every((part:any)=>[0,5,10].every(k=>part.instanceMatrix.array[cover.scenery.index*16+k]===0));
  return {lowMemory,highCalls,removed,lost:w.renderer.getContext().isContextLost()};
 });
 console.log('RENDER_BATCH_REGRESSION',JSON.stringify(result));
 expect(result.removed).toBe(true);expect(result.lost).toBe(false);
 expect(result.lowMemory[1].geometries).toBeLessThanOrEqual(result.lowMemory[0].geometries+4);
 expect(result.lowMemory[1].textures).toBeLessThanOrEqual(result.lowMemory[0].textures+2);
 expect(result.lowMemory[1].programs).toBeLessThanOrEqual(result.lowMemory[0].programs+2);
 for(const row of result.highCalls)expect(row.calls).toBeLessThan(row.mission===12?400:600);
});
