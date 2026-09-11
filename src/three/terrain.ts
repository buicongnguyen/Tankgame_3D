import type {Point} from './rules';
export type Biome='grove'|'village'|'river'|'ridge'|'industrial'|'wastes'|'snow'|'glacier'|'volcanic'|'desert'|'jungle'|'city'|'quake'|'marsh';
export interface TerrainRegion extends Point {rx:number;rz:number;kind:'ice'|'sand'|'mud';}
export const ICE:TerrainRegion[]=[[-24,30,12,9],[23,26,13,9],[-27,2,15,10],[27,-2,14,11],[-23,-27,12,10],[25,-36,14,11],[-49,45,10,7],[49,43,9,8]].map(([x,z,rx,rz])=>({x,z,rx,rz,kind:'ice'}));
export const SAND:TerrainRegion[]=[[-23,30,11,8],[23,14,11,9],[-25,-5,12,9],[25,-34,12,10],[-48,42,8,7],[51,-3,9,11]].map(([x,z,rx,rz])=>({x,z,rx,rz,kind:'sand'}));
ICE.push(...[[-49,15,14,13],[49,16,14,13],[-49,-17,14,15],[49,-25,14,13],[-23,49,12,8],[24,48,12,9],[-24,-48,14,8]].map(([x,z,rx,rz])=>({x,z,rx,rz,kind:'ice' as const})));
SAND.push(...[[-46,-29,12,10],[47,37,12,9],[-22,-45,11,9],[23,48,11,8],[47,-43,12,10],[-48,12,11,10]].map(([x,z,rx,rz])=>({x,z,rx,rz,kind:'sand' as const})));
export const MUD:TerrainRegion[]=[[-24,30,12,9],[25,13,12,11],[-26,-8,13,12],[25,-35,12,12],[-49,40,11,10],[49,-14,12,11],[-49,-40,12,10]].map(([x,z,rx,rz])=>({x,z,rx,rz,kind:'mud'}));
export const terrainRegions=(biome:Biome)=>biome==='glacier'?ICE:biome==='desert'?SAND:biome==='marsh'?MUD:[];
export const insideRegion=(p:Point,r:TerrainRegion)=>((p.x-r.x)/r.rx)**2+((p.z-r.z)/r.rz)**2<=1;
export const terrainAt=(biome:Biome,p:Point)=>terrainRegions(biome).find(r=>insideRegion(p,r))?.kind;
export function terrainSpeed(biome:Biome,x:number,z:number){
 if(terrainAt(biome,{x,z})==='sand')return .25;
 if(terrainAt(biome,{x,z})==='mud')return .18;
 if(biome==='river'&&Math.abs(z-32)<4&&![-35,0,35].some(bridge=>Math.abs(x-bridge)<4.4))return .45;
 if(biome==='snow'&&Math.abs(x)>8.5)return .72;
 if(biome==='ridge'&&Math.hypot(x-36,z-17)<10)return .6;
 return 1;
}
/** Velocity is in meters/second; callers provide the requested displacement. */
export function tractionMotion(biome:Biome,p:Point,velocity:Point,dx:number,dz:number,dt:number,recovery=false):Point{
 if(dt<=0)return {x:0,z:0};
 const speed=recovery&&terrainAt(biome,p)==='mud'?.65:terrainSpeed(biome,p.x,p.z),ice=terrainAt(biome,p)==='ice';
 const response=ice?1-Math.exp(-dt*4):1;
 velocity.x+=(dx/dt*speed-velocity.x)*response;velocity.z+=(dz/dt*speed-velocity.z)*response;
 if(Math.abs(velocity.x)<.01)velocity.x=0;if(Math.abs(velocity.z)<.01)velocity.z=0;
 return {x:velocity.x*dt,z:velocity.z*dt};
}
export function terrainLabel(biome:Biome,p:Point){const kind=terrainAt(biome,p);return kind==='mud'?'MUD HOLE · STEER OUT':kind==='sand'?'SAND TRAP · ¼ SPEED':kind==='ice'?'ICE · LOW GRIP':terrainSpeed(biome,p.x,p.z)<1?'ROUGH GROUND · REDUCED SPEED':'FRONT ARMOR ONLINE';}
