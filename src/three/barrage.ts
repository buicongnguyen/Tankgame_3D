import {BOUNDS} from './activities';
import type {Point} from './rules';
export const BARRAGE={count:12,ring:18,blast:8,damage:85,warning:1.2,stagger:.1,cooldown:28} as const;
export const BARRAGE_INNER=BARRAGE.ring-BARRAGE.blast;
/** Fixed call coordinates. Omit off-map bombs; clamping would collapse the central gap. */
export function barrageTargets(origin:Point){
 return Array.from({length:BARRAGE.count},(_,i)=>{
  // Opposite pairs spread the arrival around the tank instead of sweeping one flank first.
  const slot=Math.floor(i/2)+(i%2)*(BARRAGE.count/2),angle=slot*Math.PI*2/BARRAGE.count;
  return {x:origin.x+Math.sin(angle)*BARRAGE.ring,z:origin.z+Math.cos(angle)*BARRAGE.ring,time:BARRAGE.warning+i*BARRAGE.stagger};
 }).filter(p=>Math.abs(p.x)<=BOUNDS.x&&Math.abs(p.z)<=BOUNDS.z);
}
