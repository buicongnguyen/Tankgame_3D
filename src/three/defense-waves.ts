import type {Game} from './game';
/** Only released waves take part in collision, combat and target selection. */
export class DefenseWaves {
 wave=-1;nextAt=7;total=4;
 reset(){this.wave=-1;this.nextAt=7;}
 update(g:Game){
  if(g.training||g.missionData().kind!=='defense')return;
  const current=g.enemies.filter(e=>Math.min(3,e.encounter?.group??0)===this.wave),living=current.filter(e=>!e.dead).length;
  if(this.wave>=0&&this.wave<this.total-1&&!Number.isFinite(this.nextAt)&&living<=Math.floor(current.length*(g.save.difficulty==='easy'?.25:.4)))this.nextAt=g.elapsed+9;
  if(this.wave<this.total-1&&g.elapsed>=this.nextAt){
   this.wave++;this.nextAt=Infinity;
   for(const u of g.enemies)if(Math.min(3,u.encounter?.group??0)===this.wave){u.pending=false;u.encounter!.active=true;u.encounter!.wakeAt=undefined;g.syncVisual(u);}
   g.radioMessage(`UPLINK / Wave ${this.wave+1} approaching from the map edges.`,4);
  }
 }
 text(g:Game){const hp=Math.max(0,Math.ceil(g.relayHealth/3)),next=Number.isFinite(this.nextAt)?`NEXT IN ${Math.max(0,Math.ceil(this.nextAt-g.elapsed))}s`:`${g.enemies.filter(e=>!e.dead&&!e.pending).length} HOSTILES`;
  return `UPLINK ${hp}% · WAVE ${Math.max(0,this.wave+1)}/${this.total}\n${next}`;
 }
}
