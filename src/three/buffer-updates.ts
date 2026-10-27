import type {BufferAttribute,Color,Matrix4} from 'three';

/** Float32 comparisons prevent unchanged double-precision poses looking dirty forever. */
export function writeMatrix(attribute:BufferAttribute,index:number,matrix:Matrix4){
  const array=attribute.array,offset=index*16;let changed=false;
  for(let i=0;i<16;i++){const value=Math.fround(matrix.elements[i]);if(array[offset+i]!==value){array[offset+i]=value;changed=true;}}
  return changed;
}
export function writeColor(attribute:BufferAttribute,index:number,color:Color){
  const array=attribute.array,offset=index*3,r=Math.fround(color.r),g=Math.fround(color.g),b=Math.fround(color.b);
  if(array[offset]===r&&array[offset+1]===g&&array[offset+2]===b)return false;
  array[offset]=r;array[offset+1]=g;array[offset+2]=b;return true;
}
export function writeScalar(attribute:BufferAttribute,index:number,value:number){
  value=Math.fround(value);if(attribute.array[index]===value)return false;attribute.array[index]=value;return true;
}
/** One bounded component range, unioned with work not yet uploaded due to culling.
 * Three clears ranges after bufferSubData. Do not discard an earlier hidden change. */
export function uploadRange(attribute:BufferAttribute,start:number,end:number){
  if(end<=start)return;
  for(const pending of attribute.updateRanges){start=Math.min(start,pending.start);end=Math.max(end,pending.start+pending.count);}
  attribute.clearUpdateRanges();attribute.addUpdateRange(start,end-start);attribute.needsUpdate=true;
}
