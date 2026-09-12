import {clamp,UPGRADE_CAP} from './rules';
import type {Save} from './campaign';
export interface WeaponDefinition {name:string;label:string;description:string;price:number;damage:number;speed:number;reload:number;splash:number;ammoSlot?:number;capacity?:number;rocket?:boolean;arc?:boolean;}
export const WEAPONS:WeaponDefinition[]=[
 {name:'120 mm cannon',label:'CANNON',description:'Heavy shot. Four base hits break a concrete section.',price:0,damage:44,speed:48,reload:.85,splash:0},
 {name:'30 mm autocannon',label:'AUTOCANNON',description:'Rapid single shots. Free after First Light.',price:120,damage:13,speed:58,reload:.19,splash:0},
 {name:'Siege rockets',label:'SIEGE ROCKETS',description:'Heavy missiles. Wide blast damages nearby cover.',price:180,damage:140,speed:34,reload:1.6,splash:6.5,rocket:true},
 {name:'Pulse laser',label:'LASER',description:'12 shots. Pierces enemies + one concrete wall without breaking it.',price:360,damage:150,speed:0,reload:.6,splash:0,ammoSlot:0,capacity:12},
 {name:'Arc rockets',label:'ARC ROCKET',description:'6 rockets. Flies over cover; heavy area damage.',price:420,damage:240,speed:0,reload:2.4,splash:8,ammoSlot:1,capacity:6,rocket:true,arc:true},
 {name:'Multi-barrel machine gun',label:'MACHINE GUN',description:'Two rounds together. Four barrels unlock at weapon level 10.',price:280,damage:8,speed:62,reload:.28,splash:0},
 {name:'Micro missiles',label:'MICRO MISSILES',description:'Compact, fast missiles with a small splash. Unlimited ammo.',price:340,damage:60,speed:46,reload:.7,splash:3.5,rocket:true},
 {name:'Triple arc launcher',label:'TRIPLE ARC',description:'Three rockets together, over cover. Only 3 volleys per mission.',price:720,damage:180,speed:0,reload:3.2,splash:5.5,ammoSlot:2,capacity:3,rocket:true,arc:true},
];
const level=(n:number|undefined)=>clamp(n??0,0,UPGRADE_CAP);
export const weaponLevel=(save:Save,id:number)=>level(save.weaponLevels?.[id]);
export const weaponUpgradeCost=(n:number)=>60+n*25;
export const weaponDamage=(save:Save,id:number)=>1+weaponLevel(save,id)*.05;
export const barrels=(save:Save,id:number)=>id===5?(weaponLevel(save,id)>=10?4:2):1;
export function powerMultiplier(save:Save){const n=level(save.upgrades.power);return 1+Math.min(n,3)*.2+Math.max(0,n-3)*.06;}
export function reloadMultiplier(save:Save,id:number){const n=level(save.upgrades.reload);return (1-Math.min(n,3)*.13)/(1+Math.max(0,n-3)*.04)/(1+weaponLevel(save,id)*.01);}
export const engineMultiplier=(save:Save)=>1+level(save.upgrades.engine)*.03;
export const shieldBonus=(save:Save)=>level(save.upgrades.shield)*.12;
export const shieldCooldown=(save:Save)=>14/(1+level(save.upgrades.shield)*.025);
export function reloadSeconds(save:Save,id:number){return Math.max(id===5?.14:id===1?.09:.18,WEAPONS[id].reload*reloadMultiplier(save,id));}
