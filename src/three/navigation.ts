import type {Cover} from './world';
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
/** Covers are indexed per cell when they come within this range of the cell centre. It bounds every
 *  query below: cell clearance (1.4 m), a 3 m edge sweep, and next()'s up-to-8.5 m local sweep. */
const REACH=8;
export class GroundNavigation {
 readonly radius:number;
 constructor(radius=1.25){this.radius=radius;}
 private coverSource?:Cover[];private near:Cover[][]=[];
 // Grid of 3 m cells sized from the battlefield bounds (47 x 39 on the standard 144 x 120 m map).
 cols=47;rows=39;x0=-69;z0=-57;
 revision=-1;free=new Uint8Array(47*39);edges=new Uint8Array(47*39);fields=new Map<number,Int16Array>();
 point(id:number):Point{return {x:this.x0+id%this.cols*3,z:this.z0+Math.floor(id/this.cols)*3};}
 cell(p:Point){return clamp(Math.round((p.z-this.z0)/3),0,this.rows-1)*this.cols+clamp(Math.round((p.x-this.x0)/3),0,this.cols-1);}
 neighbors(id:number){const x=id%this.cols,z=Math.floor(id/this.cols),c=this.cols;return [x>0?id-1:-1,x<c-1?id+1:-1,z>0?id-c:-1,z<this.rows-1?id+c:-1];}
 private rebuild(world:World){
  // Cells sit on multiples of 3 m (the original lattice), so small training and compact maps keep their exact cells.
  const nx=Math.floor((world.bounds.x-1.5)/3),nz=Math.floor((world.bounds.z-1.5)/3),cols=nx*2+1,rows=nz*2+1;
  if(cols!==this.cols||rows!==this.rows){this.cols=cols;this.rows=rows;this.x0=-nx*3;this.z0=-nz*3;this.free=new Uint8Array(cols*rows);this.edges=new Uint8Array(cols*rows);}
  this.coverSource=world.covers;this.revision=world.navigationRevision;this.fields.clear();this.edges.fill(0);
  this.near=Array.from({length:cols*rows},()=>[]);
  for(const c of world.covers){if(c.hp<=0)continue;
   const x1=clamp(Math.floor((c.x-c.w/2-REACH-this.x0)/3),0,cols-1),x2=clamp(Math.ceil((c.x+c.w/2+REACH-this.x0)/3),0,cols-1);
   const z1=clamp(Math.floor((c.z-c.d/2-REACH-this.z0)/3),0,rows-1),z2=clamp(Math.ceil((c.z+c.d/2+REACH-this.z0)/3),0,rows-1);
   for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)this.near[z*cols+x].push(c);
  }
  const clearance=this.radius+.15;
  for(let id=0;id<this.free.length;id++){const p=this.point(id);this.free[id]=Number(Math.abs(p.x)<world.bounds.x-this.radius&&Math.abs(p.z)<world.bounds.z-this.radius&&!this.near[id].some(c=>circleBox(p,clearance,c)));}
  for(let id=0;id<this.free.length;id++)if(this.free[id])this.neighbors(id).forEach((other,d)=>{if(other>=0&&this.free[other]&&!this.near[id].some(c=>sweptCircle(this.point(id),this.point(other),c,clearance)))this.edges[id]|=1<<d;});
 }
 next(world:World,from:Point,target:Point):Point|null{
  if(this.revision!==world.navigationRevision||this.coverSource!==world.covers)this.rebuild(world);
  let goal=this.cell(target);
  if(!this.free[goal]){let best=Infinity;for(let id=0;id<this.free.length;id++)if(this.free[id]){const d=distance(target,this.point(id));if(d<best){best=d;goal=id;}}}
  let field=this.fields.get(goal);
  if(!field){
   field=new Int16Array(this.free.length).fill(-1);field[goal]=0;const queue=[goal];
   for(let h=0;h<queue.length;h++){const id=queue[h];this.neighbors(id).forEach((other,d)=>{if(this.edges[id]&(1<<d)&&field![other]<0){field![other]=field![id]+1;queue.push(other);}});}
   if(this.fields.size>=32)this.fields.delete(this.fields.keys().next().value!);this.fields.set(goal,field);
  }
  else{this.fields.delete(goal);this.fields.set(goal,field);}
  const cell=this.cell(from),x=cell%this.cols,z=Math.floor(cell/this.cols),around=this.near[cell];let result:Point|null=null,best=Infinity;
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
   const xx=x+dx,zz=z+dz;if(xx<0||xx>=this.cols||zz<0||zz>=this.rows)continue;const id=zz*this.cols+xx;if(field[id]<0)continue;
   const p=this.point(id),d=distance(from,p),score=field[id]*3+d;
   if(d>.4&&score<best&&!around.some(c=>sweptCircle(from,p,c,this.radius-.001))&&!this.near[id].some(c=>sweptCircle(from,p,c,this.radius-.001))){best=score;result=p;}
  }return result;
 }
}
