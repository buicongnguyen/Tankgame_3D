import {test,expect} from '@playwright/test';
import {routePattern} from '../src/three/route-patterns';
import {stageLayout} from '../src/three/stage-layout';
import {levelMission} from '../src/three/campaign';
import {DIFFICULTIES} from '../src/three/difficulty';
import {segmentBox,circleBox} from '../src/three/rules';

test('S, mirrored S, L and U have distinct whole-map geometry and fair travel time',()=>{
 const s=routePattern(4,0)!,mirror=routePattern(4,1)!,l=routePattern(5,0)!,u=routePattern(4,2)!;
 expect(s.length).toBe(388);expect(l.length).toBe(188);expect(u.length).toBe(276);
 expect(mirror.points).toEqual(s.points.map(p=>({x:-p.x,z:p.z})));
 const points=s.points;expect(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))).toBe(100);expect(Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z))).toBe(88);
 expect(new Set(points.filter(p=>p.x&&p.z).map(p=>`${Math.sign(p.x)},${Math.sign(p.z)}`)).size).toBe(4);
 expect(l.points[0].x).toBe(l.points[2].x);expect(l.points[2].z).toBe(l.points.at(-1)!.z);
 expect(u.points[0].z).toBe(u.points.at(-1)!.z);expect(u.points[2].z).not.toBe(u.points[0].z);
 let changed=0;for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){const p=routePattern(stage,level);if(!p)continue;changed++;const m=levelMission(stage,level);expect(m.parTime).toBeGreaterThan(p.length/(m.kind==='escort'?3.4:9)+30);}expect(changed).toBe(23);
});

test('natural landforms preserve every route, shoulder and volcano across all difficulties',()=>{
 for(const difficulty of DIFFICULTIES)for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){
  const layout=stageLayout(stage,level,levelMission(stage,level).kind,difficulty);
  if(layout.shape!=='winding')expect(layout.landforms.length,`${stage}/${level}/${difficulty}`).toBeGreaterThan(0);
  for(const p of layout.landforms){
   for(let i=1;i<layout.points.length;i++)expect(segmentBox(layout.points[i-1],layout.points[i],p,2.3),`${stage}/${level}`).toBeNull();
   for(const supply of layout.supplies)expect(circleBox(supply,supply.kind==='mine'?2:2.85,p)).toBe(false);
   if(stage===10)expect(Math.abs(p.x+28)<(p.w+23)/2&&Math.abs(p.z+38)<(p.d+23)/2).toBe(false);
  }
 }
});

test('every shaped Crazy level keeps all enemies and supply connections clear',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const issues=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.difficulty='crazy';const {circleBox,segmentBox}=await import('/src/three/rules.ts');const {projectRoute,alongRoute}=await import('/src/three/stage-layout.ts');const {routePattern}=await import('/src/three/route-patterns.ts');const issues:any[]=[];
  for(let stage=0;stage<16;stage++)for(let level=0;level<3;level++){if(!routePattern(stage,level))continue;g.start(stage,level);const covers=g.world.covers.filter((c:any)=>c.hp>0);
   for(const u of [g.player,...g.enemies])if(covers.some((c:any)=>circleBox(u.visual.root.position,g.unitRadius(u),c)))issues.push({stage,level,unit:u.role});
   for(const a of g.world.activities.filter((a:any)=>a.kind!=='mine')){const anchor=alongRoute(g.world.layout.points,projectRoute(g.world.layout.points,a).progress);if(covers.some((c:any)=>segmentBox(anchor,a,c,1.4)!==null))issues.push({stage,level,access:a.kind});}
   for(const c of covers.filter((c:any)=>c.natural))if(c.hp!==Infinity)issues.push({stage,level,destructible:true});
  }return issues;
 });expect(issues).toEqual([]);
});

test('natural cover stops cannon and laser, survives bombardment and retains Low detail collision',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();
 const result=await page.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};g.start(4,0);const cover=g.world.covers.find((c:any)=>c.natural);g.world.covers=[cover];g.enemies=[];g.player.visual.root.position.set(cover.x,0,cover.z+14);g.player.aim=Math.PI;g.syncVisual(g.player);const target=g.makeUnit(cover.x,cover.z-12,'heavy');target.visual.root.position.set(cover.x,0,cover.z-12);target.hp=target.max=10000;g.enemies=[target];
  for(let shot=0;shot<10;shot++){g.shoot(g.player,true);for(let n=0;n<40;n++)g.updateShots(1/60);}g.special.fire(g,3);const protectedTarget=target.hp===10000,revision=g.world.navigationRevision;g.hitCover(cover,999999);const solid=cover.hp===Infinity&&cover.mesh.visible&&revision===g.world.navigationRevision;
  const old=g.world.arena.getObjectByName('RouteLandforms').children[0],matrix=Array.from(old.instanceMatrix.array);await g.world.load(true);g.world.settings(true);g.player.visual.root.position.set(cover.x,0,cover.z+cover.d/2+1.35);for(let i=0;i<20;i++)g.moveUnit(g.player,0,-.9,1/60);const collision=g.player.visual.root.position.z>=cover.z+cover.d/2+1.25;
  g.player.visual.root.position.set(cover.x+cover.w/2+1.5,0,cover.z+cover.d/2+1.35);for(let i=0;i<20;i++)g.moveUnit(g.player,0,-.9,1/60);const flank=g.player.visual.root.position.z<cover.z-cover.d/2;
  return {protectedTarget,solid,instanced:old.isInstancedMesh,stable:matrix.every((v,i)=>v===old.instanceMatrix.array[i]),collision,flank,low:g.world.low};
 });expect(Object.values(result).every(Boolean),JSON.stringify(result)).toBe(true);
});
