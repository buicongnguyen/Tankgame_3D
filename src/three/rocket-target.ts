import {clamp} from './rules';
import type {Point} from './rules';
import {BOUNDS} from './activities';
// Direction-only controls need a distance; mouse aiming already supplies one.
export function rocketTarget(origin:Point,aim:Point,enemies:Point[],directional:boolean):Point{
 const dx=aim.x-origin.x,dz=aim.z-origin.z,length=Math.hypot(dx,dz);
 const range=Math.min(45,length),ux=length?dx/length:0,uz=length?dz/length:-1;
 let target={x:origin.x+ux*range,z:origin.z+uz*range},best=Infinity;
 for(const enemy of enemies){const ex=enemy.x-origin.x,ez=enemy.z-origin.z,distance=Math.hypot(ex,ez);
  // Do not pull the blast onto the player or acquire targets beyond weapon range.
  if(distance<10||distance>45)continue;
  const alignment=(ex*ux+ez*uz)/distance,miss=Math.hypot(enemy.x-aim.x,enemy.z-aim.z);
  if(directional?alignment<Math.cos(Math.PI/10):miss>3)continue;
  const score=directional?distance+(1-alignment)*100:miss;
  if(score<best){best=score;target={x:enemy.x,z:enemy.z};}
 }
 return {x:clamp(target.x,-BOUNDS.x,BOUNDS.x),z:clamp(target.z,-BOUNDS.z,BOUNDS.z)};
}
