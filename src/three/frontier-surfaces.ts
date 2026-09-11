import * as T from 'three';
import type {World} from './world';
import type {Biome} from './terrain';
const textures=new Map<string,T.CanvasTexture>();
/** Small repeatable surface maps; generated once and shared across stage rebuilds. */
export function groundTexture(kind:string){
 let texture=textures.get(kind);if(texture)return texture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const grain=Math.sin(x*127.1+y*311.7)*43758.5453,random=grain-Math.floor(grain);
  const wave=kind==='desert'?Math.sin(y*.22+Math.sin(x*.09)*1.4)*11:kind==='glacier'?Math.sin(y*.04+x*.07)*6:0;
  const c=228+random*18+wave,i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=c;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(12,10);texture.anisotropy=4;textures.set(kind,texture);return texture;
}
/** Shared GLB geometry with one instanced draw per surface; outside gameplay bounds. */
export function frontierBoundary(world:World,biome:Biome){
 const name=biome==='glacier'?'glacier':biome==='jungle'?'jungle-tree':biome==='city'?'cityblock':biome==='desert'?'hill':'volcanic-rock';
 const positions:T.Vector3[]=[];const spacing=biome==='city'?14:biome==='jungle'?8:6;
 for(const side of [-1,1])for(let z=-61;z<=61;z+=spacing)positions.push(new T.Vector3(side*(biome==='city'?80:77),0,z));
 for(let x=-70;x<=70;x+=spacing)positions.push(new T.Vector3(x,0,biome==='city'?-69:-66));
 const model=world.templates.get(name)!;model.updateMatrixWorld(true);const inv=model.matrixWorld.clone().invert(),transform=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3();
 model.traverse(obj=>{if(!(obj instanceof T.Mesh))return;const instances=new T.InstancedMesh(obj.geometry,obj.material,positions.length);Object.assign(instances.userData,obj.userData);instances.name='Frontier boundary';instances.castShadow=false;instances.receiveShadow=false;
  for(let i=0;i<positions.length;i++){
   const s=biome==='volcanic'?2.4+(i%3)*.3:biome==='desert'?.64:biome==='jungle'?1.15+(i%3)*.08:biome==='city'?1:1.2;
   rotation.setFromAxisAngle(new T.Vector3(0,1,0),biome==='city'?0:i*2.399);scale.set(s,biome==='city'?s*(.86+(i%3)*.14):s,s);transform.compose(positions[i],rotation,scale);transform.multiply(inv.clone().multiply(obj.matrixWorld));instances.setMatrixAt(i,transform);
  }
  instances.computeBoundingSphere();world.arena.add(instances);
 });
}
export function sandRipples(){
 const positions:number[]=[];
 for(let row=-4;row<=4;row++){
  const z=row*.18,extent=Math.sqrt(1-(Math.abs(z)+.055)**2)*.94;
  for(let i=0;i<20;i++){
   const x1=-extent+extent*2*i/20,x2=-extent+extent*2*(i+1)/20,z1=z+Math.sin(x1*8+row)*.035,z2=z+Math.sin(x2*8+row)*.035;
   positions.push(x1,z1,0,x2,z2,0,x2,z2+.012,0,x1,z1,0,x2,z2+.012,0,x1,z1+.012,0);
  }
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
}
