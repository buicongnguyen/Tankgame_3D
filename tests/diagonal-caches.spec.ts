import {test,expect} from '@playwright/test';
import {routePattern} from '../src/three/route-patterns';
import {roadVertices} from '../src/three/road-geometry';
import {stageLayout,routeSample,roadDistance,overlapsReservation} from '../src/three/stage-layout';

test('45-degree S spans the arena with a continuous narrow road and room between lanes',()=>{
 const layout=stageLayout(7,1,'escort'),vertices=roadVertices(layout.points,layout.rotation);
 expect(layout.shape).toBe('S-45');expect(layout.length).toBeCloseTo(302.64);
 const selected=[];for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++)if(routePattern(stage,level)?.shape==='S-45')selected.push([stage,level]);
 expect(selected).toEqual([[2,2],[4,1],[5,2],[7,1],[11,2],[13,1],[14,1],[15,2]]);
 for(let i=1;i<layout.points.length;i++){const a=layout.points[i-1],b=layout.points[i];expect(Math.abs(a.x-b.x)).toBeCloseTo(Math.abs(a.z-b.z));}
 const cross=(ax:number,az:number,bx:number,bz:number)=>ax*bz-az*bx;
 const onRoad=(x:number,z:number)=>{for(let i=0;i<vertices.length;i+=9){const ax=vertices[i],az=vertices[i+2],bx=vertices[i+3],bz=vertices[i+5],cx=vertices[i+6],cz=vertices[i+8];const signs=[cross(bx-ax,bz-az,x-ax,z-az),cross(cx-bx,cz-bz,x-bx,z-bz),cross(ax-cx,az-cz,x-cx,z-cz)];if(signs.every(n=>n>=-1e-6)||signs.every(n=>n<=1e-6))return true;}return false;};
 for(let meters=0;meters<=layout.length;meters+=.75){const p=routeSample(layout.points,meters);for(const lateral of [-3.9,0,3.9])expect(onRoad(p.x+p.dz*lateral,p.z-p.dx*lateral),`road gap at ${meters}`).toBe(true);}
 let area=0;for(let i=0;i<vertices.length;i+=9)area+=Math.abs(cross(vertices[i+3]-vertices[i],vertices[i+5]-vertices[i+2],vertices[i+6]-vertices[i],vertices[i+8]-vertices[i+2]))/2;
 expect(area).toBeCloseTo(layout.length*8+64); // square-capped polyline union; no doubled faces at turns
 for(let i=0;i<vertices.length;i+=3){expect(Math.abs(vertices[i])).toBeLessThan(72);expect(Math.abs(vertices[i+2])).toBeLessThan(60);expect(roadDistance(layout.points,{x:vertices[i],z:vertices[i+2]})).toBeLessThan(5.66);}
 const p=routeSample(layout.points,39),corridor={reserved:[],corridors:[layout.corridors[0]]};
 expect(onRoad(p.x+p.dz*9,p.z-p.dx*9)).toBe(false);
 expect(overlapsReservation(corridor,{x:p.x,z:p.z,w:2,d:2})).toBe(true);
 expect(overlapsReservation(corridor,{x:p.x+p.dz*12,z:p.z-p.dx*12,w:4,d:4})).toBe(false);
 expect(overlapsReservation(corridor,{x:p.x+p.dz*8,z:p.z-p.dx*8,w:14,d:10})).toBe(true);
});

test('road caches have nearby guards in every normal journey and awaken them on approach',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};const {levelMission}=await import('/src/three/campaign.ts');const {isWeaponSupply}=await import('/src/three/stage-layout.ts');const {distance}=await import('/src/three/rules.ts');const issues:any[]=[];
  for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){if(levelMission(stage,level).kind==='defense')continue;g.start(stage,level);
   for(const cache of g.world.layout.supplies.filter((s:any)=>isWeaponSupply(s.kind))){const guards=g.enemies.filter((u:any)=>u.encounter?.group===cache.guardGroup);if(!guards.some((u:any)=>distance(u.visual.root.position,cache)<20))issues.push({stage,level,cache:cache.kind,reason:'no nearby guard'});
    g.player.visual.root.position.set(cache.x,0,cache.z);g.encounters.update(g);if(!guards.length||guards.some((u:any)=>!u.encounter.active))issues.push({stage,level,cache:cache.kind,reason:'guard asleep'});
   }
  }
  g.start(7,1);const cache=g.world.activities.find((a:any)=>a.kind==='laser'),before=g.specialAmmo[0];g.player.visual.root.position.set(cache.x,0,cache.z);g.updateEnemies(.01);const guardsActive=g.enemies.some((u:any)=>!u.dead&&u.encounter.active&&distance(u.visual.root.position,cache)<20);g.updateActivities(.01);g.updateActivities(.01);
  return {issues,guardsActive,collectedOnce:cache.spent&&g.specialAmmo[0]===before+12&&g.weapon===3};
 });expect(result.issues).toEqual([]);expect(result.guardsActive&&result.collectedOnce).toBe(true);
});

test('camera previews the next S bend in desktop and portrait views',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const issues=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(7,1);const {routeSample}=await import('/src/three/stage-layout.ts');const issues:any[]=[];
  for(const portrait of [false,true]){g.world.camera.aspect=portrait?.5:1.6;for(let meters=0;meters<=g.world.layout.length;meters+=2){const a=routeSample(g.world.layout.points,meters),b=routeSample(g.world.layout.points,meters+12),d=Math.hypot(b.x-a.x,b.z-a.z);if(d<.01)continue;const offset=g.world.cameraOffset(a),dz=offset.z-(portrait?16:0),dot=(offset.x*(b.x-a.x)+dz*(b.z-a.z))/(8*d);if(dot<.999||!Number.isFinite(offset.x+offset.z))issues.push({portrait,meters,dot});}
   const end=g.world.cameraOffset(g.world.layout.points.at(-1));if(!Number.isFinite(end.x+end.z))issues.push({portrait,end});
  }return issues;
 });expect(issues).toEqual([]);
});
