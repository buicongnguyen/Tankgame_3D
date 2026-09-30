import type {Cover,World} from './world';
/** Stage covers bucketed into 8 m cells, so movement and line checks read only the covers near them.
 *  Covers never move or resize after a stage is built; destroyed ones keep their place and callers skip
 *  them with their own hp test. The grid rebuilds when the cover list, its length or the navigation
 *  revision changes. */
const CELL=8;
type Grid={source:Cover[];length:number;revision:number;cells:Map<number,Cover[]>;all:Cover[]};
const grids=new WeakMap<World,Grid>();
const key=(ix:number,iz:number)=>(ix+4096)*8192+iz+4096;
function grid(world:World):Grid{
 let g=grids.get(world);const covers=world.covers;
 if(g&&g.source===covers&&g.length===covers.length&&g.revision===world.navigationRevision)return g;
 g={source:covers,length:covers.length,revision:world.navigationRevision,cells:new Map(),all:covers};
 for(const c of covers){
  const x1=Math.floor((c.x-c.w/2)/CELL),x2=Math.floor((c.x+c.w/2)/CELL),z1=Math.floor((c.z-c.d/2)/CELL),z2=Math.floor((c.z+c.d/2)/CELL);
  for(let ix=x1;ix<=x2;ix++)for(let iz=z1;iz<=z2;iz++){const k=key(ix,iz);let list=g.cells.get(k);if(!list)g.cells.set(k,list=[]);list.push(c);}
 }
 grids.set(world,g);return g;
}
/** Every cover whose box overlaps the rectangle [x1,x2] x [z1,z2] (and possibly a few more). A cover spanning
 *  several cells can appear more than once, which is harmless for the `some` tests that use this. */
export function coversNear(world:World,x1:number,z1:number,x2:number,z2:number):Cover[]{
 const g=grid(world),ix1=Math.floor(x1/CELL),ix2=Math.floor(x2/CELL),iz1=Math.floor(z1/CELL),iz2=Math.floor(z2/CELL);
 // A query wider than a quarter of the stage is cheaper as a plain scan.
 if((ix2-ix1+1)*(iz2-iz1+1)>64)return g.all;
 if(ix1===ix2&&iz1===iz2)return g.cells.get(key(ix1,iz1))??[];
 const out:Cover[]=[];
 for(let ix=ix1;ix<=ix2;ix++)for(let iz=iz1;iz<=iz2;iz++){const list=g.cells.get(key(ix,iz));if(list)for(const c of list)out.push(c);}
 return out;
}
