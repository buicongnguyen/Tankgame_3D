import {GuidedBarrage,BARRAGE} from './barrage';
import type {Game} from './game';
import type {Save} from './campaign';
export const AUTO_PACK={price:40,rounds:6} as const;
export function buyAutoPack(save:Save){
 if(save.autoPack||save.credits<AUTO_PACK.price)return false;
 save.credits-=AUTO_PACK.price;save.autoPack=AUTO_PACK.rounds;return true;
}
/** A paid magazine belongs to one deployment; only an unissued pack is persisted. */
export class AutoMissiles {
 ammo=0;cooldown=0;
 guided=new GuidedBarrage({...BARRAGE,count:1,range:42,blast:3.5,damage:160,warning:.15,flight:.7,stagger:0,maxPerTarget:1},true);
 fire(g:Game){
  if(g.phase!=='playing'||g.player.dead||this.ammo<=0||this.cooldown>0)return false;
  const p=g.player.visual.root.position;this.guided.origin={x:p.x,z:p.z};
  const target=this.guided.candidates(g).sort((a,b)=>a.visual.root.position.distanceToSquared(p)-b.visual.root.position.distanceToSquared(p))[0];
  if(!target){g.radioMessage('AUTO / No vehicles within 42 m. Missile retained.',3);return false;}
  this.guided.launch(g,[target]);this.ammo--;this.cooldown=1.6;
  g.radioMessage(`AUTO / Vehicle locked · ${this.ammo} missiles left.`,2);return true;
 }
 update(g:Game,dt:number){if(g.phase!=='playing')return;this.cooldown=Math.max(0,this.cooldown-dt);this.guided.update(g,dt);}
 clear(){this.guided.clear();this.ammo=0;this.cooldown=0;}
}
