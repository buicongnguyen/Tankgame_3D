import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),option=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const out=option('--out','test-results/performance-work/current'),url=option('--url','http://127.0.0.1:5178/?e2e');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:[...(process.platform==='win32'?['--use-angle=d3d11']:[]),'--enable-gpu','--ignore-gpu-blocklist']});
const reports=[];
try{for(const preset of [{id:'desktop-high-city',mobile:false,low:false,mission:13},{id:'mobile-high-city',mobile:true,low:false,mission:13},{id:'mobile-low-city',mobile:true,low:true,mission:13},{id:'mobile-high-jungle',mobile:true,low:false,mission:12}]){
 const context=await browser.newContext({viewport:preset.mobile?{width:844,height:390}:{width:1440,height:900},deviceScaleFactor:preset.mobile?2:1,isMobile:preset.mobile,hasTouch:preset.mobile});
 await context.addInitScript(()=>{let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);window.__resetRandom=()=>seed=42;});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.__steel?.phase==='menu');
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:preset.mobile?4:1});
 await page.evaluate(async({low})=>{const g=window.__steel;g.frame=()=>{};g.save.sound=false;await g.world.load(low);g.world.settings(low);g.save.low=low;g.save.difficulty='crazy';},preset);
 for(const motion of [false,true]){
  const id=preset.id+(motion?'-combat':'-stationary');
  await page.evaluate(({mission,motion})=>{
   const g=window.__steel,w=g.world;window.__resetRandom();g.start(mission,2);g.player.hp=g.player.max=1e9;g.player.visual.root.position.set(0,0,0);w.target.set(0,0,0);g.radioTimer=0;g.radio.classList.remove('visible');
   if(motion){for(const u of g.enemies){u.hp=u.max=1e9;if(u.encounter)u.encounter.active=true;}g.save.weapons=[8];g.weapon=8;g.specialAmmo[3]=1e6;g.input.keys.add('Space');}
   let frame=0;
   window.__workStep=()=>{const start=performance.now();if(motion){g.step(1/60);if(frame++%12===0)w.fx.impact(g.player.visual.root.position.clone().setY(1),true);}const simulated=performance.now();g.flame.render(g,motion?1/60:0);w.update(motion?1/60:0,g.player.visual.root.position);return {simulationMs:simulated-start,renderMs:performance.now()-simulated};};
  },{...preset,motion});
  const result=await page.evaluate(async()=>{
   const g=window.__steel,w=g.world,gl=w.renderer.getContext(),matrix=w.scene.matrix.constructor.prototype,originals=[];let counts;
   const reset=()=>counts={draws:0,shadowDraws:0,triangles:0,compose:0,multiply:0,invert:0,bufferData:0,allocationBytes:0,bufferSubData:0,uploadBytes:0};
   const wrap=(object,key,body)=>{const original=object[key];originals.push(()=>object[key]=original);object[key]=function(...a){body(...a);return original.apply(this,a);};};
   const bytes=(data,offset=0,length)=>typeof data==='number'?data:data?((length||((data.length??data.byteLength)-offset))*(data.BYTES_PER_ELEMENT??1)):0;
   for(let i=0;i<10;i++){await new Promise(requestAnimationFrame);window.__workStep();}
   for(const [key,count] of [['compose','compose'],['multiplyMatrices','multiply'],['invert','invert']])wrap(matrix,key,()=>counts[count]++);
   for(const key of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced'])wrap(gl,key,(...a)=>{counts.draws++;const arrays=key.startsWith('drawArrays'),instances=key.endsWith('Instanced')?(arrays?a[3]:a[4]):1;if(a[0]===gl.TRIANGLES)counts.triangles+=(arrays?a[2]:a[1])*instances/3;});
   wrap(w.renderer,'renderBufferDirect',(_camera,_scene,_geometry,material)=>{if(material.isMeshDepthMaterial||material.isMeshDistanceMaterial)counts.shadowDraws++;});
   wrap(gl,'bufferData',(_target,data,_usage,offset,length)=>{counts.bufferData++;counts.allocationBytes+=bytes(data,offset,length);});
   wrap(gl,'bufferSubData',(_target,_destination,data,offset,length)=>{counts.bufferSubData++;counts.uploadBytes+=bytes(data,offset,length);});
   const samples=[];try{for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);reset();const timing=window.__workStep();samples.push({...counts,...timing});}}finally{for(const restore of originals.reverse())restore();}
   let nodes=0,visible=0,geometryBytes=0,instanceBytes=0;const seen=new Set();w.scene.traverse(o=>{nodes++;const add=(a,instance=false)=>{const b=a?.array??a?.data?.array;if(b&&!seen.has(b.buffer)){seen.add(b.buffer);if(instance)instanceBytes+=b.byteLength;else geometryBytes+=b.byteLength;}};if(o.geometry){Object.values(o.geometry.attributes).forEach(a=>add(a));add(o.geometry.index);}add(o.instanceMatrix,true);add(o.instanceColor,true);});w.scene.traverseVisible(()=>visible++);
   const gpu=gl.getExtension('WEBGL_debug_renderer_info');
   return {samples,nodes,visible,geometryBytes,instanceBytes,memory:{...w.renderer.info.memory,programs:w.renderer.info.programs.length},gpu:gpu?gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL):'unknown',pixelRatio:w.renderer.getPixelRatio(),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],enemies:g.enemies.length,particles:w.fx.particles.length,phase:g.phase,lost:gl.isContextLost()};
  });
  if(!motion){await page.screenshot({path:path.join(out,id+'.png')});await page.screenshot({path:path.join(out,id+'-control.png')});}
  // Sampling without operation-count wrappers; source attribution, not an A/B FPS claim.
  await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:250});await cdp.send('Profiler.start');
  const timings=await page.evaluate(async()=>{const a=[];for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);a.push(window.__workStep());}return a;});
  const {profile}=await cdp.send('Profiler.stop');await writeFile(path.join(out,id+'.cpuprofile'),JSON.stringify(profile));
  const costs=new Map(),lookup=new Map(profile.nodes.map(n=>[n.id,n]));profile.samples.forEach((id,i)=>{const f=lookup.get(id).callFrame,key=`${f.functionName||'(anonymous)'} ${f.url.split('/').pop()}:${f.lineNumber+1}`;costs.set(key,(costs.get(key)||0)+profile.timeDeltas[i]/1000);});
  const perf=await cdp.send('Performance.getMetrics');
  const report={...preset,id,motion,cpuThrottle:preset.mobile?4:1,...result,timings,topSelf:[...costs].sort((a,b)=>b[1]-a[1]).slice(0,25),cdpMetrics:perf.metrics,errors:[...errors]};reports.push(report);
  const avg=k=>+(result.samples.reduce((s,row)=>s+row[k],0)/result.samples.length).toFixed(2);
  console.log(JSON.stringify({id,draws:avg('draws'),shadows:avg('shadowDraws'),compose:avg('compose'),multiply:avg('multiply'),uploads:avg('bufferSubData'),bytes:avg('uploadBytes'),particles:result.particles,memory:result.memory}));
 }
 await context.close();
}}finally{await browser.close();}
await writeFile(path.join(out,'report.json'),JSON.stringify({note:'Counters are instrumented; timings are separate unwrapped CPU-profile samples, not proven FPS improvements.',reports},null,2));
