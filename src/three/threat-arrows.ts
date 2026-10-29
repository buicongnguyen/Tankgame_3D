import * as T from 'three';
import type {Game} from './game';

/** Red arrows on the screen edge pointing at enemies that are aiming at the player from off-screen. A portrait
 *  phone shows only ~24 m to either side while enemies fire from 38 m, so without these, flank fire comes from
 *  nowhere. At most four, nearest first; plain DOM, no text, never in menus. */
const MAX=4,RANGE=42,INSET=30;
export class ThreatArrows{
 private root?:HTMLElement;private arrows:HTMLElement[]=[];private readonly v=new T.Vector3();
 private readonly list:{x:number;y:number;d:number}[]=[];
 private ensure(){
  if(this.root)return;
  const root=document.createElement('div');root.className='threat-arrows';root.setAttribute('aria-hidden','true');
  Object.assign(root.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'6'});
  for(let i=0;i<MAX;i++){const a=document.createElement('div');
   Object.assign(a.style,{position:'absolute',left:'0',top:'0',width:'0',height:'0',borderTop:'11px solid transparent',borderBottom:'11px solid transparent',borderLeft:'20px solid #ff5a44',filter:'drop-shadow(0 0 3px #000a)',display:'none',willChange:'transform'});
   root.append(a);this.arrows.push(a);}
  document.body.append(root);this.root=root;
 }
 /** Every rendered frame, after the camera is placed. */
 update(g:Game){
  this.list.length=0;
  if(g.phase==='playing'&&!g.player.dead){
   const p=g.player.visual.root.position,cam=g.world.camera,w=innerWidth,h=innerHeight;
   for(const e of g.enemies){
    if(e.dead||e.pending||!e.visual.beam.visible)continue;
    const q=e.visual.root.position,dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);if(d>(e.role==='boss'?52:RANGE))continue;   // boss beams reach 52 m
    // Only warnings aimed at the player (a beam may also point at the transport or an ally).
    if(Math.abs(Math.atan2(Math.sin(Math.atan2(dx,dz)-e.aim),Math.cos(Math.atan2(dx,dz)-e.aim)))>.35)continue;
    const s=this.v.copy(q).project(cam);let x=(s.x+1)/2*w,y=(1-s.y)/2*h;if(s.z>1){x=w-x;y=h-y;}
    if(s.z<=1&&x>=INSET&&x<=w-INSET&&y>=INSET&&y<=h-INSET)continue;   // on screen: the beam itself is the warning
    this.list.push({x,y,d});
   }
   this.list.sort((a,b)=>a.d-b.d);
  }
  if(!this.list.length&&!this.root)return;
  this.ensure();
  const cx=innerWidth/2,cy=innerHeight/2;
  this.arrows.forEach((a,i)=>{const t=this.list[i];if(!t){a.style.display='none';return;}
   // From the screen centre toward the threat, clamped to the edge.
   const dx=t.x-cx,dy=t.y-cy,k=Math.min((cx-INSET)/Math.max(1e-6,Math.abs(dx)),(cy-INSET)/Math.max(1e-6,Math.abs(dy)));
   const ax=cx+dx*k,ay=cy+dy*k,angle=Math.atan2(dy,dx);
   a.style.display='block';a.style.transform=`translate(${ax-10}px,${ay-11}px) rotate(${angle}rad)`;a.style.opacity=String(Math.max(.55,1-t.d/RANGE*.5));});
 }
 clear(){for(const a of this.arrows)a.style.display='none';}
}
