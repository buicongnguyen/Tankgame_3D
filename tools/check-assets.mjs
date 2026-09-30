import fs from 'node:fs';
import assert from 'node:assert/strict';
const names=JSON.parse(fs.readFileSync('src/three/model-catalog.json','utf8'));
// Reused Hoshi Valley models (the owner's KITEFALL Blender art), imported by tools/import-kitefall-assets.mjs:
// meshopt-compressed with their own budget, and their source recorded in asset.extras.
const REUSED=Object.keys(JSON.parse(fs.readFileSync('src/three/reused-models.json','utf8'))).filter(k=>!k.startsWith('_'));let reusedBytes=0,reusedLowBytes=0;
let supportBytes=0,jetBytes=0,airliftBytes=0,quadcopterBytes=0,flameBytes=0,total=0,lowTotal=0,highTriangles=0,lowTriangles=0;
for(const name of names){
  const b=fs.readFileSync(`public/models/${name}.glb`);total+=b.length;
  assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  if(REUSED.includes(name)){reusedBytes+=b.length;assert.ok(json.asset.extras?.source?.includes('KITEFALL'),`${name} must record its KITEFALL source`);assert.ok(json.extensionsUsed?.includes('EXT_meshopt_compression'),`${name} must stay meshopt-compressed`);}
  else assert.ok(json.asset.generator.includes('Blender'));
  assert.ok(!json.images?.some(i=>i.uri));
  if(['glacier','volcano','volcanic-rock','palm','jungle-tree','cityblock'].includes(name)){
    assert.ok(json.materials.some(m=>m.normalTexture),`${name} needs its authored normal detail`);
    for(const img of json.images??[]){const v=json.bufferViews[img.bufferView],start=28+b.readUInt32LE(12)+(v.byteOffset??0),data=b.subarray(start,start+v.byteLength);assert.equal(img.mimeType,'image/png');assert.ok(data.readUInt32BE(16)<=128&&data.readUInt32BE(20)<=128,`${name} texture exceeded its mobile budget`);}
  }

  if((name.startsWith('convoy-')||name==='relay')){supportBytes+=b.length;assert.ok(b.length<(name==='relay'?65_000:50_000),'Support asset budget');if(name!=='relay')for(const node of ['Hull','Turret','Muzzle'])assert.ok(json.nodes.some(n=>n.name===node));}
  if(name==='boss-jet'){jetBytes=b.length;assert.ok(jetBytes<60_000,'Jet budget: 60 KB');}
  if(name==='boss-quadcopter'){quadcopterBytes=b.length;assert.ok(b.length<180_000);for(const node of ['Rotor0','Rotor1','Rotor2','Rotor3','LaunchMuzzle0','LaunchMuzzle1','LaunchMuzzle2'])assert.ok(json.nodes.some(n=>n.name===node),`Missing quadcopter ${node}`);}
  if(name==='airlift'){airliftBytes=b.length;assert.ok(b.length<55_000,'Airlift budget: 55 KB');for(const node of ['Hull','Turret','Muzzle','Rotor0','Rotor1','Ramp'])assert.ok(json.nodes.some(n=>n.name===node),`Missing airlift ${node}`);}
  if(name==='flame'){flameBytes=b.length;assert.ok(b.length<16_000);assert.ok(json.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!==undefined)));}
  let triangles=0;
  for(const mesh of json.meshes)for(const p of mesh.primitives)triangles+=(p.indices!==undefined?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count)/3;
  assert.ok(triangles<(name==='tank'?12000:name.startsWith('boss-')?4500:3000));
  if(['tank','rifleman','rocketeer','scout-jeep'].includes(name)||name.startsWith('boss-'))for(const node of ['Hull','Turret','Muzzle'])assert.ok(json.nodes.some(n=>n.name===node),`Missing ${node}`);
  if(name.startsWith('boss-'))for(const node of ['LightGun','LightMuzzle'])assert.ok(json.nodes.some(n=>n.name===node),`${name} missing ${node}`);
  if(name==='boss-quad-mech')for(let i=0;i<4;i++)assert.ok(json.nodes.some(n=>n.name===`GunMuzzle${i}`));
  if(['boss-siege-mech','boss-missile-truck'].includes(name))for(let i=0;i<2;i++)assert.ok(json.nodes.some(n=>n.name===`LaunchMuzzle${i}`));
  const low=fs.readFileSync(`public/models/low/${name}.glb`);lowTotal+=low.length;
  assert.equal(low.readUInt32LE(0),0x46546c67);assert.equal(low.readUInt32LE(8),low.length);
  const lowJson=JSON.parse(low.subarray(20,20+low.readUInt32LE(12)).toString());
  assert.ok(REUSED.includes(name)?lowJson.asset.extras?.source?.includes('KITEFALL'):lowJson.asset.generator.includes('Blender'));
  if(REUSED.includes(name)){reusedLowBytes+=low.length;assert.ok(lowJson.extensionsUsed?.includes('EXT_meshopt_compression'),`${name} mobile tier must stay meshopt-compressed`);
    const names=doc=>doc.materials.map(m=>m.name).sort().join(),attrs=doc=>[...new Set(doc.meshes.flatMap(m=>m.primitives.flatMap(p=>Object.keys(p.attributes))))].sort().join();
    assert.equal(names(lowJson),names(json),`${name} tiers must share material names`);assert.equal(attrs(lowJson),attrs(json),`${name} tiers must share vertex attributes`);}assert.ok(!lowJson.images?.some(i=>i.uri));
  let simpler=0;for(const mesh of lowJson.meshes)for(const p of mesh.primitives)simpler+=(p.indices!==undefined?lowJson.accessors[p.indices].count:lowJson.accessors[p.attributes.POSITION].count)/3;
  if(name==='flame'){assert.ok(low.length<5_000);assert.ok(triangles<=200&&simpler<=30);assert.ok(lowJson.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!==undefined)));}
  assert.ok(simpler>0&&simpler<triangles,`${name} must actually simplify geometry`);
  for(const node of json.nodes.filter(n=>/^(Hull|Turret|Muzzle|Exhaust|Core|Rotor[0-3]?|TailRotor|LeftLeg|RightLeg|Leg[0-9][LR]|Arm[LR]|Launcher[LR]|LightGun|LightMuzzle|GunMuzzle[0-3]|LaunchMuzzle[012]|Wheel[FR][LR]|Ramp)$/.test(n.name))){
    const other=lowJson.nodes.find(n=>n.name===node.name);assert.ok(other,`${name} low tier is missing ${node.name}`);
    for(const [field,fallback] of [['translation',[0,0,0]],['scale',[1,1,1]]]){
      const a=node[field]??fallback,c=other[field]??fallback;
      assert.ok(a.every((value,i)=>Math.abs(value-c[i])<.00001),`${name}/${node.name} ${field} changed`);
    }
    const a=node.rotation??[0,0,0,1],c=other.rotation??[0,0,0,1];
    assert.ok(Math.abs(Math.abs(a.reduce((sum,value,i)=>sum+value*c[i],0))-1)<.00001,`${name}/${node.name} rotation changed`);
  }
  highTriangles+=triangles;lowTriangles+=simpler;
  console.log(`${name}: ${triangles} detailed / ${simpler} low triangles, valid ${REUSED.includes(name)?'reused Hoshi Valley':'Blender'} GLBs`);
}
// Reserve 180 KB for the four-rotor rig; retain the existing scene and flame budgets.
assert.ok(total-flameBytes-quadcopterBytes-jetBytes-supportBytes-airliftBytes-reusedBytes<4_000_000);assert.ok(supportBytes<155_000);assert.ok(reusedBytes<100_000,'Reused Hoshi Valley budget: 100 KB');assert.ok(reusedLowBytes<60_000,'Reused Hoshi Valley mobile budget: 60 KB');assert.ok(total-reusedBytes<4_411_000);console.log(`Total runtime GLBs: ${total} bytes`);

assert.ok(lowTotal<2_000_000);assert.ok(lowTriangles<highTriangles*.4);
console.log(`Low tier: ${lowTotal} bytes; ${lowTriangles} / ${highTriangles} triangles (${Math.round((1-lowTriangles/highTriangles)*100)}% fewer)`);
// Menu icons rendered by tools/blender/build_ui_icons.py: square, transparent, all referenced and small.
const {default:sharp}=await import('sharp');
const ICONS=['credit','coins','trophy','gear','shell','tank','supply','spray'],polish=fs.readFileSync('src/three/ui-polish.css','utf8');let iconBytes=0;
assert.deepEqual(fs.readdirSync('src/three/ui-icons').sort(),ICONS.map(icon=>`${icon}.webp`).sort(),'Only the rendered menu icons live in src/three/ui-icons');
for(const icon of ICONS){const file=`src/three/ui-icons/${icon}.webp`,meta=await sharp(file).metadata();iconBytes+=fs.statSync(file).size;
 assert.equal(meta.format,'webp',file);assert.equal(meta.width,160,file);assert.equal(meta.height,160,file);assert.ok(meta.hasAlpha,`${file} needs a transparent background`);
 assert.ok(polish.includes(`./ui-icons/${icon}.webp`),`${icon} icon is not used by ui-polish.css`);}
assert.ok(iconBytes<64_000,'Menu icon budget: 64 KB');console.log(`Menu icons: ${ICONS.length} WebP, ${iconBytes} bytes`);
