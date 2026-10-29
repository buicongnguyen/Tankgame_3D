import type {Game} from './game';
/** Only released waves take part in collision, combat and target selection. */
/** After the last wave arrives (and any boss with it is destroyed), holding the uplink for the mission's duration
 *  wins: the briefing's "hold for 45 seconds". */
const hold=(g:Game)=>g.missionData().duration??45;
const bossAlive=(g:Game)=>g.enemies.some(e=>e.role==='boss'&&!e.dead&&!e.pending);
export class DefenseWaves {
 wave=-1;nextAt=7;total=4;holdFrom=Infinity;
 reset(){this.wave=-1;this.nextAt=7;this.holdFrom=Infinity;}
 /** 0..1 share of the final hold already survived. */
 holdProgress(g:Game){return Number.isFinite(this.holdFrom)?Math.min(1,(g.elapsed-this.holdFrom)/hold(g)):0;}
 update(g:Game){
  if(g.training||g.missionData().kind!=='defense')return;
  const current=g.enemies.filter(e=>Math.min(3,e.encounter?.group??0)===this.wave),living=current.filter(e=>!e.dead).length;
  if(this.wave>=0&&this.wave<this.total-1&&!Number.isFinite(this.nextAt)&&living<=Math.floor(current.length*(g.save.difficulty==='easy'?.25:.4)))this.nextAt=g.elapsed+9;
  if(this.wave<this.total-1&&g.elapsed>=this.nextAt){
   this.wave++;this.nextAt=Infinity;
   for(const u of g.enemies)if(Math.min(3,u.encounter?.group??0)===this.wave){u.pending=false;u.encounter!.active=true;u.encounter!.wakeAt=undefined;g.syncVisual(u);}
   g.radioMessage(`UPLINK / Wave ${this.wave+1} approaching from the map edges.`,4);
  }
  // The final hold starts as soon as the last wave is in and no boss is left standing.
  if(this.wave===this.total-1&&!Number.isFinite(this.holdFrom)&&!bossAlive(g))this.holdFrom=g.elapsed;
 }
 text(g:Game){const hp=Math.max(0,Math.ceil(g.relayHealth/g.relayMax*100)),hostiles=`${g.enemies.filter(e=>!e.dead&&!e.pending).length} HOSTILES`,next=Number.isFinite(this.nextAt)?`NEXT IN ${Math.max(0,Math.ceil(this.nextAt-g.elapsed))}s`:Number.isFinite(this.holdFrom)?`HOLD ${Math.max(0,Math.ceil(hold(g)-(g.elapsed-this.holdFrom)))}s · ${hostiles}`:this.wave===this.total-1&&bossAlive(g)?`DESTROY BOSS · ${hostiles}`:hostiles;
  return `UPLINK ${hp}% · WAVE ${Math.max(0,this.wave+1)}/${this.total}\n${next}`;
 }
}
