import fs from 'node:fs';
import assert from 'node:assert/strict';
const names=['tank','transport','barricade','crate','barrel','relay'];
let total=0;
for(const name of names){
  const b=fs.readFileSync(`public/models/${name}.glb`);total+=b.length;
  assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  assert.ok(json.asset.generator.includes('Blender'));
  assert.ok(!json.images?.some(i=>i.uri));
  let triangles=0;
  for(const mesh of json.meshes)for(const p of mesh.primitives)triangles+=(p.indices!==undefined?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count)/3;
  assert.ok(triangles<(name==='tank'?12000:3000));
  if(name==='tank')for(const node of ['Hull','Turret','Muzzle'])assert.ok(json.nodes.some(n=>n.name===node),`Missing ${node}`);
  console.log(`${name}: ${triangles} triangles, ${b.length} bytes, valid Blender GLB`);
}
assert.ok(total<3_000_000);console.log(`Total runtime GLBs: ${total} bytes`);
