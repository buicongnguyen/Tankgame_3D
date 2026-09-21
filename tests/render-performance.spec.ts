import {test,expect} from '@playwright/test';
import {segmentBox,circleBox} from '../src/three/rules';

test('allocation-free collision math preserves slab intersections and contact boundaries',()=>{
 const reference=(a:{x:number;z:number},b:{x:number;z:number},box:{x:number;z:number;w:number;d:number},padding:number)=>{let near=0,far=1;for(const [start,delta,center,half] of [[a.x,b.x-a.x,box.x,box.w/2+padding],[a.z,b.z-a.z,box.z,box.d/2+padding]]){if(Math.abs(delta)<1e-10){if(start<center-half||start>center+half)return null;}else{let t1=(center-half-start)/delta,t2=(center+half-start)/delta;if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return null;}}return near;};
 let seed=456;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<2000;i++){const a={x:random()*100-50,z:random()*100-50},b={x:i%7?a.x+random()*60-30:a.x,z:i%9?a.z+random()*60-30:a.z},box={x:random()*60-30,z:random()*60-30,w:random()*12,d:random()*12},padding=random()*4;expect(segmentBox(a,b,box,padding)).toBe(reference(a,b,box,padding));}
 expect(circleBox({x:2,z:0},1,{x:0,z:0,w:2,d:2})).toBe(false);expect(circleBox({x:1.99,z:0},1,{x:0,z:0,w:2,d:2})).toBe(true);
});

test('batched enemy rigs keep poses, visibility, detail swaps and clean retries',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='crazy';g.start(13,2);const root=g.enemies.find((u:any)=>u.role==='raider').visual.root;const p=root.position;g.player.visual.root.position.set(p.x,0,p.z+8);g.world.target.copy(p);g.world.update(0,p);const batches=()=>g.world.scene.children.filter((o:any)=>o.name==='EnemySurfaceBatch');const count=()=>batches().reduce((sum:number,o:any)=>sum+o.count,0);const before=count();
 const unit=g.enemies.find((u:any)=>u.visual.root===root);unit.heading=.7;g.syncVisual(unit);g.world.update(0,p);let part:any;root.traverse((o:any)=>{if(o.isMesh&&o.userData.modelAsset)part=o;});const batch=batches().find((o:any)=>o.geometry===part.geometry&&o.material===part.material);const matrix=part.matrixWorld.clone();let matching=false;for(let i=0;i<batch.count;i++){const m=matrix.clone();batch.getMatrixAt(i,m);if(m.elements.every((v:number,j:number)=>Math.abs(v-matrix.elements[j])<.0001))matching=true;}
 root.visible=false;g.world.update(0,p);const hidden=count()<before;root.visible=true;await g.world.load(true);g.world.settings(true);g.world.update(0,p);const low=count()>0;await g.world.load(false);g.world.settings(false);g.world.update(0,p);const restored=count()===before;g.start(0);g.world.update(0,g.player.visual.root.position);return {matching,hidden,low,restored,bounded:batches().length<80,calls:g.world.renderer.info.render.calls};
 });expect(result.matching&&result.hidden&&result.low&&result.restored&&result.bounded).toBe(true);expect(result.calls).toBeLessThan(1000);
});

test('camera look-ahead changes smoothly at route bends and resets on deployment',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};const w=g.world;w.cameraOffset=()=>({x:8,z:0});g.start(0);const p=g.player.visual.root.position;w.cameraOffset=()=>({x:-8,z:0});w.update(1/60,p);const gradual=w.smoothLead.x>0;// Allow Chromium's software GPU to drain between frames, as in actual gameplay.
 // Three simulated seconds at the mobile render cadence.
 for(let i=0;i<90;i++){w.update(1/30,p);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
 w.renderer.getContext().finish();const settled=Math.abs(w.smoothLead.x+8)<.01;g.start(0);return {gradual,settled,reset:w.smoothLead.x===-8};});expect(r).toEqual({gradual:true,settled:true,reset:true});
});
