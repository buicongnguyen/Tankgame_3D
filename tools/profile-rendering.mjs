// Adapted from Claude's smooth-dense-scenes raw WebGL / attribution workflow.
// node tools/profile-rendering.mjs --out test-results/render-review/before [--all]
// Deterministic draw budgets, not a physical phone FPS benchmark.
import {chromium} from 'playwright';
import {REVISION} from 'three';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),option=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const out=option('--out','test-results/render-review/current'),url=option('--url','http://127.0.0.1:5178/?e2e');await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:[...(process.platform==='win32'?['--use-angle=d3d11']:[]),'--enable-gpu','--ignore-gpu-blocklist']});
const reports=[];
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
 await context.addInitScript(()=>{let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);window.__resetRandom=()=>seed=42;});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('[data-action=deploy]').waitFor();await page.evaluate(()=>window.__steel.frame=()=>{});
 if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 for(const low of [false,true])for(const mission of args.includes('--all')?Array.from({length:16},(_,i)=>i):[0,9,12,13]){
  const result=await page.evaluate(async({mission,low})=>{
   const g=window.__steel,w=g.world;await w.load(low);w.settings(low);g.save.low=low;g.save.difficulty='crazy';window.__resetRandom();g.start(mission,2);g.player.visual.root.position.set(0,0,0);w.target.set(0,0,0);w.update(0,g.player.visual.root.position);g.updateHud();g.radioTimer=0;g.radio.classList.remove('visible');
   // Count actual GL draws (not RAF ticks) plus their Three.js attribution.
   const gl=w.renderer.getContext(),originals={},direct=w.renderer.renderBufferDirect,rows=new Map();let calls=0,triangles=0,instanced=0,main=0,shadow=0;
   for(const key of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){originals[key]=gl[key];gl[key]=function(...a){calls++;const instances=key.endsWith('Instanced'),arrays=key.startsWith('drawArrays'),count=arrays?a[2]:a[1],copies=instances?(arrays?a[3]:a[4]):1;if(instances)instanced++;if(a[0]===gl.TRIANGLES)triangles+=count*copies/3;return originals[key].apply(this,a);};}
   w.renderer.renderBufferDirect=function(camera,scene,geometry,material,object,...rest){const pass=material.isMeshDepthMaterial||material.isMeshDistanceMaterial?'shadow':'main';if(pass==='shadow')shadow++;else main++;const label=pass+':'+(object.userData.modelAsset||object.name||object.type);rows.set(label,(rows.get(label)||0)+1);return direct.call(this,camera,scene,geometry,material,object,...rest);};
   const samples=[];try{for(let i=0;i<9;i++){await new Promise(requestAnimationFrame);calls=triangles=instanced=main=shadow=0;rows.clear();const start=performance.now();w.renderer.render(w.scene,w.camera);samples.push({calls,triangles,instanced,main,shadow,cpuSubmitMs:performance.now()-start,threeCalls:w.renderer.info.render.calls});}}
   finally{for(const key in originals)gl[key]=originals[key];w.renderer.renderBufferDirect=direct;}
   const gpu=gl.getExtension('WEBGL_debug_renderer_info');let geometryBytes=0,instanceBytes=0;const buffers=new Set();w.scene.traverse(o=>{if(o.geometry){for(const a of Object.values(o.geometry.attributes)){const array=a.array??a.data?.array;if(array&&!buffers.has(array.buffer)){buffers.add(array.buffer);geometryBytes+=array.byteLength;}}const a=o.geometry.index?.array;if(a&&!buffers.has(a.buffer)){buffers.add(a.buffer);geometryBytes+=a.byteLength;}}for(const a of [o.instanceMatrix,o.instanceColor])if(a?.array&&!buffers.has(a.array.buffer)){buffers.add(a.array.buffer);instanceBytes+=a.array.byteLength;}});
   return {samples:samples.slice(3),top:[...rows].sort((a,b)=>b[1]-a[1]).slice(0,12),geometryBytes,instanceBytes,memory:{...w.renderer.info.memory},pixelRatio:w.renderer.getPixelRatio(),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],gpu:gpu?gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL):'unknown',phase:g.phase,terrain:w.environment.biome};
  },{mission,low});
  const id=`${mobile?'mobile':'desktop'}-${low?'low':'high'}-${mission}`,report={id,mission,mobile,low,threeRevision:REVISION,cpuThrottle:mobile?4:1,...result,errors:[...errors]};reports.push(report);
  if(!low&&[12,13].includes(mission)){await page.screenshot({path:path.join(out,id+'.png'),animations:'disabled'});await page.screenshot({path:path.join(out,id+'-control.png'),animations:'disabled'});}
  console.log(id,JSON.stringify(result.samples.at(-1)));
 }
 await context.close();
}}finally{await browser.close();}
await writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));
// Optional deterministic image/count comparison, including identical-build controls.
const compare=option('--compare',null);
if(compare){
 const prior=JSON.parse(await readFile(path.join(compare,'report.json'),'utf8'));
 const comparison={draws:[],images:[]};
 for(const current of reports){
  const old=prior.find(row=>row.id===current.id);if(!old)continue;
  const median=(rows,key)=>rows.map(row=>row[key]).sort((a,b)=>a-b)[Math.floor(rows.length/2)];
  comparison.draws.push({id:current.id,before:median(old.samples,'calls'),after:median(current.samples,'calls'),trianglesBefore:median(old.samples,'triangles'),trianglesAfter:median(current.samples,'triangles')});
 }
 const {default:sharp}=await import('sharp');
 for(const row of reports.filter(row=>!row.low&&[12,13].includes(row.mission))){
  for(const control of [true,false]){
   const a=await sharp(path.join(control?out:compare,row.id+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const b=await sharp(path.join(out,row.id+(control?'-control':'')+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw new Error(`Screenshot sizes differ: ${row.id}`);
   let changed=0,over2=0,over8=0,maxDelta=0;
   for(let i=0;i<a.data.length;i+=4){let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(a.data[i+c]-b.data[i+c]));if(delta)changed++;if(delta>2)over2++;if(delta>8)over8++;maxDelta=Math.max(maxDelta,delta);}
   comparison.images.push({id:row.id,control,pixels:a.info.width*a.info.height,changed,over2,over8,maxDelta});
  }
 }
 await writeFile(path.join(out,'comparison.json'),JSON.stringify(comparison,null,2));
 console.log('Comparison saved:',path.join(out,'comparison.json'));
}
