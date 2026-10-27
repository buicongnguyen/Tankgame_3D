import {circleBox} from './rules';
import type {Box} from './rules';
type Obstacle=Box&{hp:number};
/** Broad phase for static cover. The original circle/box test decides actual contact. */
export class CoverGrid<C extends Obstacle=Obstacle>{
  private source:C[]|undefined;private revision=-1;private length=-1;
  private cells=new Map<string,C[]>();private point={x:0,z:0};
  private readonly size=12;
  clear(){this.source=undefined;this.cells.clear();this.revision=-1;this.length=-1;}
  private rebuild(covers:C[],revision:number){
    this.clear();this.source=covers;this.revision=revision;this.length=covers.length;
    for(const cover of covers){
      const x0=Math.floor((cover.x-cover.w/2)/this.size),x1=Math.floor((cover.x+cover.w/2)/this.size);
      const z0=Math.floor((cover.z-cover.d/2)/this.size),z1=Math.floor((cover.z+cover.d/2)/this.size);
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
        const key=x+':'+z,cell=this.cells.get(key);if(cell)cell.push(cover);else this.cells.set(key,[cover]);
      }
    }
  }
  blocked(covers:C[],revision:number,x:number,z:number,radius:number){
    if(this.source!==covers||this.revision!==revision||this.length!==covers.length)this.rebuild(covers,revision);
    this.point.x=x;this.point.z=z;
    const x0=Math.floor((x-radius)/this.size),x1=Math.floor((x+radius)/this.size),z0=Math.floor((z-radius)/this.size),z1=Math.floor((z+radius)/this.size);
    for(let zz=z0;zz<=z1;zz++)for(let xx=x0;xx<=x1;xx++){
      const cell=this.cells.get(xx+':'+zz);if(!cell)continue;
      for(const cover of cell)if(cover.hp>0&&circleBox(this.point,radius,cover))return true;
    }
    return false;
  }
}
