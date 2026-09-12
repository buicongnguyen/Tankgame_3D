import {test,expect} from '@playwright/test';
import {MISSIONS,levelMission} from '../src/three/campaign';
import {stageLayout} from '../src/three/stage-layout';
import {roadVertices} from '../src/three/road-geometry';

test('travel stages increase route length with each level and O roads close without overlap',()=>{
 for(let stage=0;stage<MISSIONS.length;stage++){const layouts=[0,1,2].map(level=>stageLayout(stage,level,levelMission(stage,level).kind));expect(layouts[1].length,`stage ${stage}`).toBeGreaterThan(layouts[0].length);expect(layouts[2].length,`stage ${stage}`).toBeGreaterThan(layouts[1].length);
  for(const layout of layouts)if(layout.closed){expect(layout.shape).toBe('O');expect(layout.points[0]).toEqual(layout.points.at(-1));expect(layout.length).toBeCloseTo(225.6);const v=roadVertices(layout.points);let area=0;for(let i=0;i<v.length;i+=9)area+=Math.abs((v[i+3]-v[i])*(v[i+8]-v[i+2])-(v[i+6]-v[i])*(v[i+5]-v[i+2]))/2;expect(area).toBeCloseTo(layout.length*8);}
 }
});

test('O patrols wake from either direction without waking the opposite branch or relocating units',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};return [0,3].map(group=>{g.start(6,1);g.encounters.update(g);const quiet=g.enemies.filter((u:any)=>[1,2].includes(u.encounter.group)).every((u:any)=>!u.encounter.active);const before=g.enemies.map((u:any)=>u.visual.root.position.clone()),target=g.enemies.find((u:any)=>u.encounter.group===group);g.player.visual.root.position.set(target.encounter.anchor.x,0,target.encounter.anchor.z);g.encounters.update(g);const active=g.enemies.filter((u:any)=>u.encounter.group===group).every((u:any)=>u.encounter.active),far=g.enemies.filter((u:any)=>u.encounter.group===(group===0?2:1)).every((u:any)=>!u.encounter.active),stable=g.enemies.every((u:any,i:number)=>u.visual.root.position.equals(before[i]));return {quiet,active,far,stable,notComplete:g.objectiveProgress()<1};});});expect(r.every((v:any)=>Object.values(v).every(Boolean)),JSON.stringify(r)).toBe(true);
});

// Keep a reserve away from the circuit: an empty battlefield now completes the escort early.
for(const reverse of [false,true])test(`O convoy waits for a free choice and completes ${reverse?'left':'right'} circuit`,async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const r=await page.evaluate(async reverse=>{const g=(window as any).__steel;g.frame=()=>{};g.start(2,1);for(const e of g.enemies)e.dead=true;const reserve=g.enemies.at(-1);reserve.dead=false;reserve.visual.root.position.set(0,0,0);const start=g.world.layout.points[0];g.updateConvoy(1);g.updateHud();const waited=g.objectiveProgress()<1&&g.convoyDistance===0&&g.convoyReverse===null&&g.el('objective').textContent.includes('CHOOSE LEFT OR RIGHT');g.player.visual.root.position.set(start.x+(reverse?-5:5),0,start.z);g.updateConvoy(0);const selected=g.convoyReverse===reverse;const {alongRoute}=await import('/src/three/stage-layout.ts');const {circleBox}=await import('/src/three/rules.ts');let n=0,clipped=false;
  while(g.convoyDistance<g.world.layout.length-.001&&n++<2000){const p=g.convoy.position,next=alongRoute(g.convoyPath(),g.convoyDistance+.1),a=Math.atan2(next.x-p.x,next.z-p.z);g.player.visual.root.position.set(p.x+Math.cos(a)*4,0,p.z-Math.sin(a)*4);g.updateConvoy(.1);if(g.world.covers.some((c:any)=>c.hp>0&&circleBox(g.convoy.position,2.3,c)))clipped=true;}
  return {waited,selected,clipped,complete:g.objectiveProgress()===1,atGate:Math.hypot(g.convoy.position.x-start.x,g.convoy.position.z-start.z)<.01,seconds:n*.1};
 },reverse);expect(r.waited&&r.selected&&r.complete&&r.atGate,JSON.stringify(r)).toBe(true);expect(r.clipped).toBe(false);expect(r.seconds).toBeLessThan(levelMission(2,1).parTime);
});
