import {rotatePoint} from './route-patterns';
import type {Point} from './rules';
// Build a single non-overlapping surface in the route's orthogonal local frame,
// then rotate it into the arena. Keeping turns coplanar avoids snow flicker.
export function roadVertices(points:Point[],rotation=0,width=8):number[]{
 const local=points.map(p=>{const q=rotatePoint(p,-rotation);return {x:Math.round(q.x*1e8)/1e8,z:Math.round(q.z*1e8)/1e8};});
 const half=width/2,rectangles=local.slice(1).map((p,i)=>{const a=local[i];return {left:Math.min(a.x,p.x)-half,right:Math.max(a.x,p.x)+half,top:Math.min(a.z,p.z)-half,bottom:Math.max(a.z,p.z)+half};});
 const xs=[...new Set(rectangles.flatMap(r=>[r.left,r.right]))].sort((a,b)=>a-b),zs=[...new Set(rectangles.flatMap(r=>[r.top,r.bottom]))].sort((a,b)=>a-b),vertices:number[]=[];
 for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){
  const l=xs[i-1],r=xs[i],t=zs[j-1],b=zs[j],x=(l+r)/2,z=(t+b)/2;
  if(rectangles.some(a=>x>a.left&&x<a.right&&z>a.top&&z<a.bottom))for(const [x,z] of [[l,t],[l,b],[r,t],[r,t],[l,b],[r,b]]){const p=rotatePoint({x,z},rotation);vertices.push(p.x,.105,p.z);}
 }
 return vertices;
}
