// Imports reused KITEFALL / Hoshi Valley models (the owner's own Blender art) as Steel Front detail tiers.
// Trees: the detailed tier is the full tree simplified to about half its triangles; the mobile tier is
// KITEFALL's own hand-made LOD. Ground dressing: the original is the detailed tier, a simplified copy the
// mobile tier. Everything is meshopt-compressed; World.load decodes it.
//
// The exports are committed, so ordinary builds never run this. To regenerate:
//   node tools/import-kitefall-assets.mjs            (KITEFALL at ../3D_game_fighting, or set KITEFALL_DIR)
// The model list and simplify settings live in src/three/reused-models.json.
import {mkdirSync,readFileSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const HERE=path.resolve(import.meta.dirname,'..');
const KITEFALL=path.resolve(process.env.KITEFALL_DIR??path.join(HERE,'../3D_game_fighting'));
const {_note,...REUSED}=JSON.parse(readFileSync(path.join(HERE,'src/three/reused-models.json'),'utf8'));
const require=createRequire(path.join(KITEFALL,'package.json'));
const load=async name=>import(pathToFileURL(require.resolve(name)).href);
const {NodeIO,PropertyType,Logger}=await load('@gltf-transform/core');
const {ALL_EXTENSIONS}=await load('@gltf-transform/extensions');
const {dedup,meshopt,simplify,weld}=await load('@gltf-transform/functions');
const {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier}=await load('meshoptimizer');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
io.setLogger(new Logger(Logger.Verbosity.WARN));

const pack=async(source,ratio,target,error=.02)=>{
 const doc=await io.read(path.join(KITEFALL,'public/models',`${source}.glb`));
 const steps=[];if(ratio<1)steps.push(weld(),simplify({simplifier:MeshoptSimplifier,ratio,error,lockBorder:false}));
 steps.push(dedup({propertyTypes:[PropertyType.ACCESSOR,PropertyType.MESH]}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 await doc.transform(...steps);
 const asset=doc.getRoot().getAsset();asset.extras={...(asset.extras??{}),source:`KITEFALL public/models/${source}.glb (Blender, Hoshi Valley art)`};
 mkdirSync(path.dirname(target),{recursive:true});await io.write(target,doc);
 return statSync(target).size;
};
let total=0;
for(const [name,m] of Object.entries(REUSED)){
 const a=await pack(m.high,m.highRatio,path.join(HERE,'public/models',`${name}.glb`)),b=await pack(m.low,m.lowRatio,path.join(HERE,'public/models/low',`${name}.glb`),m.lowError);total+=a;
 console.log(`${name.padEnd(16)} detailed ${String(a).padStart(6)} B  mobile ${String(b).padStart(6)} B`);
}
console.log(`Reused detailed exports: ${total} bytes`);
