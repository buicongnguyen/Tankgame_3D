import type {Game} from './game';
import type {Mission} from './campaign';
import type {StageLayout} from './stage-layout';
import {routeLength,routeSample} from './stage-layout';
import {distance} from './rules';
export const TRAINING=[
 {name:'First Tracks',bounds:{x:16,z:24},points:[{x:0,z:18},{x:0,z:-18}],rifles:3,tanks:0,reward:10},
 {name:'First Armor',bounds:{x:26,z:16},points:[{x:-20,z:0},{x:20,z:0}],rifles:4,tanks:2,reward:20},
 {name:'Signal Drill',bounds:{x:22,z:20},points:[{x:0,z:14},{x:0,z:-13}],rifles:4,tanks:2,reward:30},
] as const;
export function compactLayout(id:number):StageLayout{
 const t=id===3?{points:[{x:0,z:25},{x:0,z:-25}]}:TRAINING[id],points=t.points.map(p=>({...p})),length=routeLength(points),heading=Math.atan2(points[1].x-points[0].x,points[1].z-points[0].z);
 return {shape:'winding',closed:false,rotation:0,corridors:[{a:points[0],b:points[1],width:6}],landforms:[],points,length,spawn:id===2?{x:4,z:-13}:{...points[0]},heading,barriers:id===1?[{x:0,z:5,w:6,d:1.8}]:id===3?[{x:-9,z:0,w:6,d:1.8}]:[],breaches:[],supplies:id===1?[{kind:'laser',x:-7,z:0}]:[],reserved:[],encounters:[routeSample(points,length*.4),routeSample(points,length*.8)],southbound:false,direction:id===1?'east':'north'};
}
export class TrainingSession {
 moved=false;switched=false;shielded=false;struck=false;collected=false;finished=false;reward=0;
 readonly id:number;
 constructor(id:number){this.id=id;}
 get definition(){return TRAINING[this.id];}
 mission():Mission{return {name:this.definition.name,sector:'KESTREL TRAINING',kind:this.id===2?'defense':'assault',biome:'grove',parTime:0,briefing:'A short training exercise. Follow one hint at a time.',radio:'IVO / We will take this one step at a time.',debrief:'Lesson complete.',objective:'Follow the training hint',count:this.definition.tanks,duration:0,reward:this.definition.reward};}
 canFire(){return this.id!==2||this.shielded&&this.struck;}
 action(g:Game,a:string){if(a==='shield'&&g.shieldTime>0)this.shielded=true;if(this.id===1&&a==='4'&&g.weapon===3&&g.world.activities.some(a=>a.kind==='laser'&&a.spent))this.collected=this.switched=true;}
 update(g:Game){
  this.moved ||= distance(g.player.visual.root.position,g.world.layout.spawn)>3;
  this.collected ||= g.world.activities.some(a=>a.kind==='laser'&&a.spent);
  const ready=this.id===0?this.moved:this.id===1?this.moved:this.shielded&&this.struck;
  const firstClear=g.enemies.filter(e=>e.encounter?.group===0).every(e=>e.dead);
  for(const e of g.enemies)if(e.encounter){
   e.encounter.active=ready&&(e.encounter.group===0||firstClear&&(this.id!==1||this.switched));
   const pending=e.encounter.group>0&&!e.encounter.active;
   if(e.pending!==pending){e.pending=pending;g.syncVisual(e);}
  }
 }
 ready(g:Game){return this.moved&&(this.id!==0||g.shotsFired>0)&&(this.id!==1||this.switched)&&(this.id!==2||this.shielded&&this.struck)&&g.enemies.every(e=>e.dead)&&(this.id===2||distance(g.player.visual.root.position,g.world.layout.points.at(-1)!)<5);}
 hint(g:Game):{text:string;target:string}{
  const touch=matchMedia('(pointer: coarse)').matches;
  if(this.id===2){if(!this.shielded)return {text:touch?'Tap Shield to protect the uplink approach.':'Press Q to raise your shield.',target:'shield'};if(!this.struck)return {text:touch?'Tap Strike to call guided missiles.':'Press R to call a guided strike.',target:'artillery'};}
  if(!this.moved)return {text:touch?'Drag the left stick to drive along the arrows.':'Hold WASD or the arrow keys to drive.',target:'move-pad'};
  if(this.id===1&&!this.collected)return {text:'Collect the cyan laser case on the marked path.',target:''};
  if(this.id===1&&!this.switched)return {text:touch?'Tap Switch Gun, then select Laser.':'Press 4 to select the laser you collected.',target:'weapon'};
  if(g.enemies.some(e=>!e.dead)||this.id===0&&g.shotsFired===0)return {text:touch?'Drag the right stick toward a hostile to aim and fire.':'Aim with mouse or IJKL; hold Space to fire.',target:'aim-pad'};
  return {text:'Follow the amber arrows into the exit ring.',target:''};
 }
}
