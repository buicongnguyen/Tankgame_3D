import fs from 'node:fs';
import assert from 'node:assert/strict';
const names=JSON.parse(fs.readFileSync('src/three/model-catalog.json','utf8'));
let total=0,lowTotal=0,highTriangles=0,lowTriangles=0;
for(const name of names){
  const b=fs.readFileSync(`public/models/${name}.glb`);total+=b.length;
  assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  assert.ok(json.asset.generator.includes('Blender'));
  assert.ok(!json.images?.some(i=>i.uri));
  if(['glacier','volcano','volcanic-rock','palm','jungle-tree','cityblock'].includes(name)){
    assert.ok(json.materials.some(m=>m.normalTexture),`${name} needs its authored normal detail`);
    for(const img of json.images??[]){const v=json.bufferViews[img.bufferView],start=28+b.readUInt32LE(12)+(v.byteOffset??0),data=b.subarray(start,start+v.byteLength);assert.equal(img.mimeType,'image/png');assert.ok(data.readUInt32BE(16)<=128&&data.readUInt32BE(20)<=128,`${name} texture exceeded its mobile budget`);}
  }

  let triangles=0;
  for(const mesh of json.meshes)for(const p of mesh.primitives)triangles+=(p.indices!==undefined?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count)/3;
  assert.ok(triangles<(name==='tank'?12000:name.startsWith('boss-')?4500:3000));
  if(['tank','rifleman','rocketeer','boss-rail','boss-missile','boss-walker','boss-helicopter','boss-spider','boss-laser'].includes(name))for(const node of ['Hull','Turret','Muzzle'])assert.ok(json.nodes.some(n=>n.name===node),`Missing ${node}`);
  const low=fs.readFileSync(`public/models/low/${name}.glb`);lowTotal+=low.length;
  assert.equal(low.readUInt32LE(0),0x46546c67);assert.equal(low.readUInt32LE(8),low.length);
  const lowJson=JSON.parse(low.subarray(20,20+low.readUInt32LE(12)).toString());
  assert.ok(lowJson.asset.generator.includes('Blender'));assert.ok(!lowJson.images?.some(i=>i.uri));
  let simpler=0;for(const mesh of lowJson.meshes)for(const p of mesh.primitives)simpler+=(p.indices!==undefined?lowJson.accessors[p.indices].count:lowJson.accessors[p.attributes.POSITION].count)/3;
  assert.ok(simpler>0&&simpler<triangles,`${name} must actually simplify geometry`);
  for(const node of json.nodes.filter(n=>/^(Hull|Turret|Muzzle|Exhaust|Core|Rotor|TailRotor|LeftLeg|RightLeg|Leg[0-9][LR])$/.test(n.name))){
    const other=lowJson.nodes.find(n=>n.name===node.name);assert.ok(other,`${name} low tier is missing ${node.name}`);
    for(const [field,fallback] of [['translation',[0,0,0]],['scale',[1,1,1]]]){
      const a=node[field]??fallback,c=other[field]??fallback;
      assert.ok(a.every((value,i)=>Math.abs(value-c[i])<.00001),`${name}/${node.name} ${field} changed`);
    }
    const a=node.rotation??[0,0,0,1],c=other.rotation??[0,0,0,1];
    assert.ok(Math.abs(Math.abs(a.reduce((sum,value,i)=>sum+value*c[i],0))-1)<.00001,`${name}/${node.name} rotation changed`);
  }
  highTriangles+=triangles;lowTriangles+=simpler;
  console.log(`${name}: ${triangles} detailed / ${simpler} low triangles, valid Blender GLBs`);
}
assert.ok(total<4_000_000);console.log(`Total runtime GLBs: ${total} bytes`);

assert.ok(lowTotal<2_000_000);assert.ok(lowTriangles<highTriangles*.4);
console.log(`Low tier: ${lowTotal} bytes; ${lowTriangles} / ${highTriangles} triangles (${Math.round((1-lowTriangles/highTriangles)*100)}% fewer)`);
