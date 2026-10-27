import {test,expect} from '@playwright/test';
import * as T from 'three';
import {cacheTransforms,cacheTransformChildren,setTransformCachingEnabled} from '../src/three/transform-cache';
import {EnemyBatches} from '../src/three/enemy-batches';
import {writeMatrix,writeColor,uploadRange} from '../src/three/buffer-updates';
import {CoverGrid} from '../src/three/cover-grid';
import {circleBox} from '../src/three/rules';

test('cached transforms match native transforms through animation, reparenting, explicit updates and manual matrices',()=>{
 const original=new T.Group(),rig=new T.Group(),turret=new T.Group(),muzzle=new T.Object3D(),other=new T.Group();
 rig.name='rig';turret.name='turret';muzzle.name='muzzle';other.name='other';muzzle.position.set(0,1,3);turret.add(muzzle);rig.add(turret);original.add(rig,other);
 const cached=original.clone(true);cacheTransforms(cached);
 const compare=()=>{const a:T.Object3D[]=[],b:T.Object3D[]=[];original.traverse(o=>a.push(o));cached.traverse(o=>b.push(o));expect(b).toHaveLength(a.length);for(let i=0;i<a.length;i++)for(let j=0;j<16;j++)expect(b[i].matrixWorld.elements[j]).toBeCloseTo(a[i].matrixWorld.elements[j],10);};
 for(let frame=0;frame<36;frame++){
  for(const root of [original,cached]){
   const r=root.getObjectByName('rig')!,t=root.getObjectByName('turret')!,m=root.getObjectByName('muzzle')!,p=root.getObjectByName('other')!;
   if(frame<10){root.position.x=frame*.02;r.position.z=frame*.3;r.rotation.y=frame*.13;t.rotation.y=-frame*.07;r.scale.set(1+frame*.01,1,.9);}
   if(frame===10)p.add(r);
   if(frame===11)p.position.set(4,2,-3);
   if(frame===12){t.pivot=new T.Vector3(.5,1,0);t.rotation.x=.2;}
   if(frame===13){t.pivot=null;t.scale.y=1.3;}
   if(frame===14){r.matrixAutoUpdate=false;r.matrix.makeTranslation(9,2,4);r.matrixWorldNeedsUpdate=true;}
   if(frame===15){r.matrix.makeRotationY(.6);r.matrixWorldNeedsUpdate=true;}
   if(frame===16)r.matrixAutoUpdate=true;
   if(frame===17){t.position.x=2;t.updateMatrix();}
   if(frame===18){root.rotation.z=.1;m.updateWorldMatrix(true,false);}
   if(frame===19)root.visible=false;
   if(frame===20)root.visible=true;
   if(frame===26){r.matrixWorldAutoUpdate=false;r.matrixWorld.makeTranslation(100,3,7);}
   if(frame===27)r.matrixWorldAutoUpdate=true;
   if(root===cached&&frame===22)setTransformCachingEnabled(root,false);
   if(root===cached&&frame===24)setTransformCachingEnabled(root,true);
   root.updateMatrixWorld(frame===21);
  }
  compare();
 }
 const add=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());cacheTransformChildren(cached);cached.add(add);cached.updateMatrixWorld();add.position.x=7;cached.updateMatrixWorld();expect(add.getWorldPosition(new T.Vector3()).x).not.toBe(0);
 add.geometry.dispose();add.material.dispose();
});

test('enemy batch growth, hidden changes and middle removal preserve every remaining matrix',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(90,1,.1,100);camera.position.set(0,15,20);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const geometry=new T.BoxGeometry(),material=new T.MeshBasicMaterial(),manager=new EnemyBatches(scene),roots:T.Group[]=[];
 const add=()=>{const root=new T.Group(),part=new T.Mesh(geometry,material);root.position.x=(roots.length%9)-4;part.userData.modelAsset='test';root.add(part);scene.add(root);manager.add(root);roots.push(root);};
 for(let i=0;i<17;i++)add();const update=()=>{scene.updateMatrixWorld(true);manager.update(camera);};update();
 const first=scene.children.find(o=>o.name==='EnemySurfaceBatch') as T.InstancedMesh;first.instanceMatrix.clearUpdateRanges();
 roots[0].position.z=2;update();roots[16].position.z=3;update();
 expect(first.instanceMatrix.updateRanges).toEqual([{start:0,count:17*16}]);
 roots[1].visible=false;update();expect(first.count).toBe(16);
 // Changes made while the batch is off-screen must be present when it comes back.
 camera.lookAt(0,15,50);camera.updateMatrixWorld();roots[2].position.z=4;update();expect(first.count).toBe(0);
 camera.lookAt(0,0,0);camera.updateMatrixWorld();update();expect(first.count).toBe(16);
 let disposed=0;first.addEventListener('dispose',()=>disposed++);
 for(let i=0;i<20;i++)add();update();expect(disposed).toBe(1);
 const batch=scene.children.find(o=>o.name==='EnemySurfaceBatch') as T.InstancedMesh;expect(batch.count).toBe(36);
 const expected=roots.filter(r=>r.visible).map(r=>r.children[0].matrixWorld),matrix=new T.Matrix4();
 for(let i=0;i<expected.length;i++){batch.getMatrixAt(i,matrix);expect(matrix.elements.every((n,j)=>Math.abs(n-expected[i].elements[j])<1e-5)).toBe(true);}
 batch.instanceMatrix.clearUpdateRanges();const version=batch.instanceMatrix.version;update();expect(batch.instanceMatrix.version).toBe(version);
 manager.clear();geometry.dispose();material.dispose();
});

test('selective uploads retain pending changes and compare values at Float32 precision',()=>{
 const matrix=new T.Matrix4().makeRotationY(.73),attribute=new T.InstancedBufferAttribute(new Float32Array(16*8),16);
 expect(writeMatrix(attribute,2,matrix)).toBe(true);uploadRange(attribute,32,48);const version=attribute.version;
 expect(writeMatrix(attribute,2,matrix)).toBe(false);expect(attribute.version).toBe(version);
 // Neither range has reached the GPU yet: an intervening hidden frame must retain both.
 writeMatrix(attribute,6,matrix);uploadRange(attribute,96,112);expect(attribute.updateRanges).toEqual([{start:32,count:80}]);
 for(let i=0;i<300;i++)uploadRange(attribute,64,80);expect(attribute.updateRanges).toHaveLength(1);
 attribute.clearUpdateRanges();uploadRange(attribute,0,16);expect(attribute.updateRanges).toEqual([{start:0,count:16}]);
 const color=new T.Color(.123456789,.987654321,.456789123),colors=new T.InstancedBufferAttribute(new Float32Array(6),3);
 expect(writeColor(colors,1,color)).toBe(true);expect(writeColor(colors,1,color)).toBe(false);
});

test('cover grid agrees with linear collision across boundaries, damage and map rebuilds',()=>{
 let seed=4242;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const covers=Array.from({length:400},()=>({x:random()*320-160,z:random()*280-140,w:random()*18+.1,d:random()*18+.1,hp:100}));
 covers.push({x:0,z:120,w:340,d:6,hp:Infinity});const grid=new CoverGrid();
 for(let i=0;i<6000;i++){
  const x=random()*400-200,z=random()*340-170,radius=i%9===0?0:random()*6;
  if(i===1000)for(let j=0;j<100;j++)covers[j].hp=0;
  if(i===2000)covers.push({x:12,z:-12,w:5,d:8,hp:100});
  if(i===3000){covers[0].x=60;covers[0].hp=100;}
  expect(grid.blocked(covers,i>=3000?1:0,x,z,radius)).toBe(covers.some(c=>c.hp>0&&circleBox({x,z},radius,c)));
 }
 const next=[{x:12,z:12,w:2,d:2,hp:100}];expect(grid.blocked(next,1,10,12,1)).toBe(false);expect(grid.blocked(next,1,10.01,12,1)).toBe(true);grid.clear();
});

test('instance buffers remain clean when paused, update after movement, and effects expire and restart',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(()=>{
  const g=(window as any).__steel,w=g.world;g.frame=()=>{};g.save.difficulty='crazy';g.start(13,2);w.settings(true);w.fx.clear();g.player.visual.root.position.set(0,0,0);w.target.set(0,0,0);
  const render=()=>w.update(0,g.player.visual.root.position);render();render();
  const versions=()=>w.scene.children.filter((o:any)=>o.name==='EnemySurfaceBatch').map((o:any)=>[o.instanceMatrix.version,o.instanceColor?.version]);
  const before=versions();render();const stable=JSON.stringify(before)===JSON.stringify(versions());
  const enemy=g.enemies.find((u:any)=>u.role==='raider');enemy.visual.root.position.set(3,0,0);enemy.heading=.73;g.syncVisual(enemy);render();const moved=JSON.stringify(before)!==JSON.stringify(versions());
  const point=g.player.visual.root.position.clone().setY(1);g.flame.add(g,point,.2,8);g.flame.render(g,.05);render();
  const mesh=g.flame.mesh,flameVersions=()=>[mesh.instanceMatrix.version,mesh.instanceColor.version,g.flame.fade.version];const active=flameVersions();g.flame.render(g,0);render();const paused=JSON.stringify(active)===JSON.stringify(flameVersions());
  g.flame.render(g,10);render();const expired=mesh.count===0&&!mesh.visible;const empty=flameVersions();g.flame.render(g,1);render();const quiet=JSON.stringify(empty)===JSON.stringify(flameVersions());
  g.flame.add(g,point,.8,6);g.flame.render(g,.05);render();const reused=mesh.visible&&mesh.count===1;
  w.fx.impact(point,true);w.fx.update(10,w.camera);const particlesExpired=w.fx.particles.length===0;w.fx.impact(point,true);w.fx.update(.05,w.camera);render();const particlesReused=w.fx.particles.length>0;
  return {stable,moved,paused,expired,quiet,reused,particlesExpired,particlesReused,lost:w.renderer.getContext().isContextLost()};
 });
 expect(result).toEqual({stable:true,moved:true,paused:true,expired:true,quiet:true,reused:true,particlesExpired:true,particlesReused:true,lost:false});
});
