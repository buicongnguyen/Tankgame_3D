import * as T from 'three';
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
