import {circleBox} from './rules';
import type {Box} from './rules';
import type {Cover,World} from './world';
type Obstacle=Box&{hp:number};
/** Static cover broad phase. Exact contact and sight tests remain with callers.
 * Move/resize cover only together with a navigationRevision increment. */
export class CoverGrid<C extends Obstacle=Obstacle>{
 private source:C[]|undefined;private revision=-1;private length=-1;
 private cells=new Map<string,C[]>();private point={x:0,z:0};
 private readonly size:number;
 constructor(size=12){this.size=size;}
 clear(){this.source=undefined;this.cells.clear();this.revision=-1;this.length=-1;}
 private ensure(covers:C[],revision:number){
  if(this.source===covers&&this.revision===revision&&this.length===covers.length)return;
  this.clear();this.source=covers;this.revision=revision;this.length=covers.length;
  for(const c of covers){
   const x0=Math.floor((c.x-c.w/2)/this.size),x1=Math.floor((c.x+c.w/2)/this.size),z0=Math.floor((c.z-c.d/2)/this.size),z1=Math.floor((c.z+c.d/2)/this.size);
   for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+':'+z,cell=this.cells.get(key);if(cell)cell.push(c);else this.cells.set(key,[c]);}
  }
 }
 near(covers:C[],revision:number,x1:number,z1:number,x2:number,z2:number):C[]{
  this.ensure(covers,revision);
  const a=Math.floor(x1/this.size),b=Math.floor(x2/this.size),c=Math.floor(z1/this.size),d=Math.floor(z2/this.size);
  if((b-a+1)*(d-c+1)>64)return covers;
  if(a===b&&c===d)return this.cells.get(a+':'+c)??[];
  const out:C[]=[];for(let x=a;x<=b;x++)for(let z=c;z<=d;z++){const cell=this.cells.get(x+':'+z);if(cell)for(const cover of cell)out.push(cover);}return out;
 }
 some(covers:C[],revision:number,x1:number,z1:number,x2:number,z2:number,test:(cover:C)=>boolean):boolean{
  this.ensure(covers,revision);
  const a=Math.floor(x1/this.size),b=Math.floor(x2/this.size),c=Math.floor(z1/this.size),d=Math.floor(z2/this.size);
  if((b-a+1)*(d-c+1)>64){for(const cover of covers)if(test(cover))return true;return false;}
  for(let x=a;x<=b;x++)for(let z=c;z<=d;z++){const cell=this.cells.get(x+':'+z);if(cell)for(const cover of cell)if(test(cover))return true;}return false;
 }
 blocked(covers:C[],revision:number,x:number,z:number,radius:number){
  this.point.x=x;this.point.z=z;
  return this.some(covers,revision,x-radius,z-radius,x+radius,z+radius,c=>c.hp>0&&circleBox(this.point,radius,c));
 }
}
const grids=new WeakMap<World,CoverGrid<Cover>>();
export function coverGridFor(world:World){let grid=grids.get(world);if(!grid){grid=new CoverGrid<Cover>(8);grids.set(world,grid);}return grid;}
/** Duplicate candidates across cells are harmless for the existing boolean sight checks. */
export function coversNear(world:World,x1:number,z1:number,x2:number,z2:number){return coverGridFor(world).near(world.covers,world.navigationRevision,x1,z1,x2,z2);}
export function someCoverNear(world:World,x1:number,z1:number,x2:number,z2:number,test:(cover:Cover)=>boolean){return coverGridFor(world).some(world.covers,world.navigationRevision,x1,z1,x2,z2,test);}
