import {MISSIONS} from './campaign';
const KEY='steel-front-leaderboard-v1',PILOT='steel-front-pilot-v1';
export const RULES_VERSION=2;
export interface RecordEntry {rules?:number;pilot:string;mission:number;level:number;difficulty:string;score:number;seconds:number;health:number;date:string}
export function scoreRun(seconds:number,health:number,target:number){
 if(![seconds,health,target].every(Number.isFinite)||seconds<0||health<0||health>100||target<0)throw new Error('Invalid result');
 return 1000+Math.round(health*10)+(target>0?Math.round(1000*Math.max(0,1-seconds/target)):0);
}
export function bestRecords(rows:RecordEntry[],entry:RecordEntry){
 const same=(r:RecordEntry)=>r.pilot===entry.pilot&&r.mission===entry.mission&&r.level===entry.level&&r.difficulty===entry.difficulty&&(r.rules??1)===(entry.rules??1);
 const old=rows.find(same);if(old&&(old.score>entry.score||(old.score===entry.score&&old.seconds<=entry.seconds)))return rows;
 return [...rows.filter(r=>!same(r)),entry];
}
export function pilotName(){try{return localStorage.getItem(PILOT)||'Pilot';}catch{return 'Pilot';}}
let memory:RecordEntry[]=[];let storageWarning=false;
function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(value))memory=value.filter(r=>r&&typeof r.pilot==='string'&&Number.isInteger(r.mission)&&r.mission>=0&&r.mission<MISSIONS.length&&Number.isInteger(r.level)&&r.level>=0&&r.level<3&&['easy','normal','hard','crazy'].includes(r.difficulty)&&Number.isFinite(r.score)&&Number.isFinite(r.seconds)&&Number.isFinite(r.health));}catch{storageWarning=true;}return memory;}
export function recordRun(mission:number,level:number,difficulty:string,seconds:number,health:number,target:number){
 memory=bestRecords(read(),{rules:RULES_VERSION,pilot:pilotName(),mission,level,difficulty,seconds,health,score:scoreRun(seconds,health,target),date:new Date().toISOString()});
 try{localStorage.setItem(KEY,JSON.stringify(memory));}catch{storageWarning=true;}
}
export function showLeaderboard(root:HTMLElement,mission:number,level:number,difficulty:string,back:()=>void){
 root.innerHTML='<section class="panel" style="width:min(720px,94vw);max-height:85dvh;overflow:auto"><span class="eyebrow">LOCAL LEADERBOARD</span><h1>Best pilots</h1><p>Saved on this device. Campaign loadouts apply. Rankings use current mission rules; older records remain saved separately.</p><label>Pilot name <input id="rank-name" maxlength="20" aria-label="Pilot name"></label><button id="rank-save">Save name</button><p id="rank-message" role="status"></p><div style="display:flex;gap:8px;flex-wrap:wrap"><select id="rank-stage" aria-label="Stage"></select><select id="rank-level" aria-label="Level"></select><select id="rank-mode" aria-label="Difficulty"></select><select id="rank-rules" aria-label="Rules version"><option value="2">Current rules</option><option value="1">Legacy rules</option></select></div><div id="rank-list" style="overflow-x:auto;margin:16px 0"></div><p>Score: 1,000 for completion + up to 1,000 for health + up to 1,000 for speed where a target time exists. Best run only; retries do not accumulate points.</p><button id="rank-back">Back</button></section>';
 const name=root.querySelector<HTMLInputElement>('#rank-name')!;name.value=pilotName();
 const stage=root.querySelector<HTMLSelectElement>('#rank-stage')!,lv=root.querySelector<HTMLSelectElement>('#rank-level')!,mode=root.querySelector<HTMLSelectElement>('#rank-mode')!;
 MISSIONS.forEach((m,i)=>stage.add(new Option(m.name,String(i))));[0,1,2].forEach(i=>lv.add(new Option(`Level ${i+1}`,String(i))));['easy','normal','hard','crazy'].forEach(m=>mode.add(new Option(m,m)));
 stage.value=String(mission);lv.value=String(level);mode.value=difficulty;
 const rules=root.querySelector<HTMLSelectElement>('#rank-rules')!;
 const render=()=>{const rows=read().filter(r=>r.mission===+stage.value&&r.level===+lv.value&&r.difficulty===mode.value&&(r.rules??1)===+rules.value).sort((a,b)=>b.score-a.score||a.seconds-b.seconds||a.pilot.localeCompare(b.pilot)).slice(0,100);const host=root.querySelector('#rank-list')!;host.replaceChildren();if(!rows.length){host.textContent='Complete a mission to set the first record.';return;}const table=document.createElement('table');table.style.width='100%';const header=table.createTHead().insertRow();['Rank','Pilot','Score','Time','Health'].forEach(label=>{const th=document.createElement('th');th.textContent=label;header.append(th);});const body=table.createTBody();rows.forEach((r,i)=>{const row=body.insertRow();[String(i+1),r.pilot,r.score.toLocaleString(),`${Math.ceil(r.seconds)}s`,`${r.health}%`].forEach(v=>row.insertCell().textContent=v);});host.append(table);};
 [stage,lv,mode,rules].forEach(s=>s.onchange=render);render();
 root.querySelector<HTMLButtonElement>('#rank-save')!.onclick=()=>{const value=name.value.trim().replace(/[\u0000-\u001f]/g,'').slice(0,20);const message=root.querySelector('#rank-message')!;if(!value){message.textContent='Enter a pilot name.';return;}try{localStorage.setItem(PILOT,value);message.textContent='Name saved for your next mission. Previous records keep their names.';}catch{message.textContent='Browser storage is unavailable.';}};
 root.querySelector<HTMLButtonElement>('#rank-back')!.onclick=back;
 if(storageWarning)root.querySelector('#rank-message')!.textContent='Storage unavailable or unreadable. New results may last only this session.';
}
