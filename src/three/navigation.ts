import type {World} from './world';
import type {Point,Box} from './rules';
import {circleBox,clamp,distance,segmentBox,segmentCircle} from './rules';
/** Shared small flow fields, rebuilt only when cover changes or a target enters a new cell. */
// A moving circle has rounded obstacle corners, matching the actual vehicle collision.
// Square-expanded rays falsely trapped vehicles already beside a corner.
function sweptCircle(a:Point,b:Point,c:Box,r:number){
 if(segmentBox(a,b,c,r)===null)return false;
 if(segmentBox(a,b,{...c,w:c.w+r*2})!==null||segmentBox(a,b,{...c,d:c.d+r*2})!==null)return true;
 return [-1,1].some(x=>[-1,1].some(z=>segmentCircle(a,b,{x:c.x+x*c.w/2,z:c.z+z*c.d/2},r)!==null));
}
export class GroundNavigation {
 readonly radius:number;
 constructor(radius=1.25){this.radius=radius;}
 revision=-1;free=new Uint8Array(47*39);edges=new Uint8Array(47*39);fields=new Map<number,Int16Array>();
 point(id:number):Point{return {x:-69+id%47*3,z:-57+Math.floor(id/47)*3};}
 cell(p:Point){return clamp(Math.round((p.z+57)/3),0,38)*47+clamp(Math.round((p.x+69)/3),0,46);}
 neighbors(id:number){const x=id%47,z=Math.floor(id/47);return [x>0?id-1:-1,x<46?id+1:-1,z>0?id-47:-1,z<38?id+47:-1];}
 next(world:World,from:Point,target:Point):Point|null{
  const covers=world.covers.filter(c=>c.hp>0);
  if(this.revision!==world.navigationRevision){
   this.revision=world.navigationRevision;this.fields.clear();this.edges.fill(0);
   for(let id=0;id<this.free.length;id++)this.free[id]=Number(!covers.some(c=>circleBox(this.point(id),this.radius+.15,c)));
   for(let id=0;id<this.free.length;id++)if(this.free[id])this.neighbors(id).forEach((other,d)=>{if(other>=0&&this.free[other]&&!covers.some(c=>sweptCircle(this.point(id),this.point(other),c,this.radius+.15)))this.edges[id]|=1<<d;});
  }
  let goal=this.cell(target);
  if(!this.free[goal]){let best=Infinity;for(let id=0;id<this.free.length;id++)if(this.free[id]){const d=distance(target,this.point(id));if(d<best){best=d;goal=id;}}}
  let field=this.fields.get(goal);
  if(!field){
   field=new Int16Array(this.free.length).fill(-1);field[goal]=0;const queue=[goal];
   for(let h=0;h<queue.length;h++){const id=queue[h];this.neighbors(id).forEach((other,d)=>{if(this.edges[id]&(1<<d)&&field![other]<0){field![other]=field![id]+1;queue.push(other);}});}
   if(this.fields.size>=8)this.fields.clear();this.fields.set(goal,field);
  }
  const cell=this.cell(from),x=cell%47,z=Math.floor(cell/47);let result:Point|null=null,best=Infinity;
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
   const xx=x+dx,zz=z+dz;if(xx<0||xx>=47||zz<0||zz>=39)continue;const id=zz*47+xx;if(field[id]<0)continue;
   const p=this.point(id),d=distance(from,p),score=field[id]*3+d;
   if(d>.4&&score<best&&!covers.some(c=>sweptCircle(from,p,c,this.radius-.001))){best=score;result=p;}
  }return result;
 }
}
