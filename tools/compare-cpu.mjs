import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),option=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const baseline=option('--baseline',null),out=option('--out','test-results/performance-ab/results');
if(!baseline)throw new Error('Pass --baseline <folder containing original game.ts, enemy-batches.ts and flamethrower.ts>');
const temporary='test-results/performance-ab/modules';await mkdir(temporary,{recursive:true});await mkdir(out,{recursive:true});
for(const file of ['game.ts','enemy-batches.ts','flamethrower.ts']){const source=await readFile(path.join(baseline,file),'utf8');await writeFile(path.join(temporary,file),source.replace(/from (['"])\.\//g,'from $1/src/three/'));}
const browser=await chromium.launch({args:[...(process.platform==='win32'?['--use-angle=d3d11']:[]),'--enable-gpu','--ignore-gpu-blocklist']});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();await page.goto(option('--url','http://127.0.0.1:5178/?e2e'));await page.waitForFunction(()=>window.__steel?.phase==='menu');
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.evaluate(async()=>{
  const [{Game},{EnemyBatches},{Flamethrower},{setTransformCachingEnabled}]=await Promise.all([import('/test-results/performance-ab/modules/game.ts'),import('/test-results/performance-ab/modules/enemy-batches.ts'),import('/test-results/performance-ab/modules/flamethrower.ts'),import('/src/three/transform-cache.ts')]);
  const g=window.__steel;g.frame=()=>{};g.save.sound=false;g.save.difficulty='crazy';g.save.weapons=[8];
  const current={move:g.moveUnit,batch:g.world.enemyBatches.update,flame:g.flame.render};
  window.__selectArm=optimized=>{
   setTransformCachingEnabled(g.world.scene,optimized);
   g.moveUnit=optimized?current.move:Game.prototype.moveUnit;g.world.enemyBatches.update=optimized?current.batch:EnemyBatches.prototype.update;g.flame.render=optimized?current.flame:Flamethrower.prototype.render;
   if(!optimized){for(const b of g.world.enemyBatches.batches.values()){b.mesh.instanceMatrix.clearUpdateRanges();b.mesh.instanceColor?.clearUpdateRanges();}g.flame.fade.clearUpdateRanges();g.flame.mesh?.instanceMatrix.clearUpdateRanges();g.flame.mesh?.instanceColor?.clearUpdateRanges();}
  };
 });
 for(const motion of [false,true])for(const control of [true,false]){
  const rows=[];
  for(let pair=0;pair<12;pair++)for(const arm of pair%2?['B','A']:['A','B']){
   const optimized=control||arm==='B';
   const values=await page.evaluate(async({optimized,motion})=>{
    const g=window.__steel,w=g.world;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    g.start(13,2);g.player.hp=g.player.max=1e9;g.player.visual.root.position.set(0,0,0);w.target.set(0,0,0);g.weapon=8;g.specialAmmo[3]=1e6;
    if(motion){g.input.keys.add('Space');for(const u of g.enemies){u.hp=u.max=1e9;if(u.encounter)u.encounter.active=true;}}else g.input.keys.clear();
    const samples=[];
    for(let i=0;i<14;i++){
     await new Promise(requestAnimationFrame);window.__selectArm(optimized);w.renderer.getContext().finish();
     const start=performance.now();if(motion){g.step(1/60);if(i%12===0)w.fx.impact(g.player.visual.root.position.clone().setY(1),true);}const simulated=performance.now();g.flame.render(g,motion?1/60:0);w.update(motion?1/60:0,g.player.visual.root.position);const done=performance.now();
     if(i>=8)samples.push({simulation:simulated-start,render:done-simulated,total:done-start,draws:w.renderer.info.render.calls});
    }
    return samples;
   },{optimized,motion});
   rows.push({pair,arm,optimized,values});
  }
  const median=a=>{a.sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
  const ratios=[];for(let pair=0;pair<12;pair++){const a=rows.find(r=>r.pair===pair&&r.arm==='A'),b=rows.find(r=>r.pair===pair&&r.arm==='B');ratios.push(median(b.values.map(v=>v.total))/median(a.values.map(v=>v.total)));}
  const result={motion,control,medianRatio:median(ratios),ratios,rows};results.push(result);console.log(JSON.stringify({motion,control,medianRatio:result.medianRatio,ratios}));
 }
 await context.close();
}finally{await browser.close();}
await writeFile(path.join(out,'timings.json'),JSON.stringify({note:'12 interleaved A/B pairs, six measured frames after eight warm-up frames per arm; no counters or CPU profiler. High detail mobile-sized 844x390, DPR2, CPU4. Null control uses optimized code on both arms. CPU submission timing, not physical-phone FPS.',results},null,2));
