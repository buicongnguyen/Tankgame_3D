import {SKIN_PALETTES} from './skin-palettes';
import type {Save} from './campaign';
export const SKINS=[
 {id:'classic',name:'Kestrel',price:0,bonus:'Standard performance',speed:1,damage:1,shield:3},
 {id:'sunburst',name:'Sunburst',price:0,bonus:'Free color scheme',speed:1,damage:1,shield:3},
 {id:'volt',name:'Volt Runner',price:300,bonus:'+18% movement speed',speed:1.18,damage:1,shield:3},
 {id:'guardian',name:'Azure Guardian',price:350,bonus:'+1.5 seconds of shield',speed:1,damage:1,shield:4.5},
 {id:'inferno',name:'Crimson Fury',price:450,bonus:'+15% weapon damage',speed:1,damage:1.15,shield:3},
] as const;
export type SkinId=keyof typeof SKIN_PALETTES;
export const getSkin=(id:string)=>SKINS.find(s=>s.id===id)??SKINS[0];
export const skinPalette=(id:string)=>SKIN_PALETTES[getSkin(id).id];
export function buySkin(save:Save,id:string){const skin=SKINS.find(s=>s.id===id);if(!skin||skin.price===0||save.skins.includes(id)||save.credits<skin.price)return false;save.credits-=skin.price;save.skins.push(id);save.skin=id;return true;}
