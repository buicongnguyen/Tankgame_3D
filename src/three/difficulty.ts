export type Difficulty='easy'|'normal'|'hard'|'crazy';
export const DIFFICULTIES:Difficulty[]=['easy','normal','hard','crazy'];
export const MODES={easy:{health:1.5,enemies:1,bosses:1,label:'Easy',hint:'+50% hull · 1× enemies'},normal:{health:1,enemies:1,bosses:1,label:'Normal',hint:'Standard hull · 1× enemies'},hard:{health:1,enemies:2,bosses:2,label:'Hard',hint:'2× enemies · 2 finale bosses'},crazy:{health:1,enemies:4,bosses:4,label:'Crazy',hint:'4× enemies · 4 finale bosses'}};
export function normalizeDifficulty(value:unknown):Difficulty|null{const aliases:Record<string,Difficulty>={story:'easy',standard:'normal',veteran:'hard'};return typeof value==='string'?(DIFFICULTIES.includes(value as Difficulty)?value as Difficulty:Object.hasOwn(aliases,value)?aliases[value]:null):null;}
export const mode=(value:string)=>MODES[normalizeDifficulty(value)??'normal'];
