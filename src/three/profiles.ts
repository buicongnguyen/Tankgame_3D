import type {Save} from './campaign';
import {MISSIONS} from './campaign';
import {MODES} from './difficulty';
import {getSkin} from './skins';

/** Three save profiles on one device. The active profile's progress stays in SAVE_KEY exactly as before,
 *  so existing campaigns become Profile 1 untouched; this book keeps every profile's name and the
 *  progress of the profiles that are not in use. */
export const PROFILES_KEY='steel-front-3d-profiles-v1';
export const PROFILE_SLOTS=3;
export interface ProfileSlot {name:string;save:string|null;played:number;}
export interface ProfileBook {active:number;slots:ProfileSlot[];}

/** Profile 1 keeps the leaderboard's historical default name. */
export const defaultProfileName=(i:number)=>i===0?'Pilot':`Pilot ${i+1}`;
export function cleanProfileName(raw:unknown,i:number){
 const name=typeof raw==='string'?raw.replace(/[\u0000-\u001f]/g,'').trim().slice(0,20):'';
 return name||defaultProfileName(i);
}
export function loadProfiles():ProfileBook{
 let raw:unknown=null;try{raw=JSON.parse(localStorage.getItem(PROFILES_KEY)??'null');}catch{/* unreadable: start a fresh book */}
 const book=raw&&typeof raw==='object'?raw as {active?:unknown;slots?:unknown}:{};
 const stored=Array.isArray(book.slots)?book.slots:[];
 const slots=Array.from({length:PROFILE_SLOTS},(_,i)=>{
  const s=stored[i]&&typeof stored[i]==='object'?stored[i] as Record<string,unknown>:{};
  return {name:cleanProfileName(s.name,i),save:typeof s.save==='string'?s.save:null,played:typeof s.played==='number'&&Number.isFinite(s.played)?s.played:0};
 });
 const active=Number.isInteger(book.active)&&(book.active as number)>=0&&(book.active as number)<PROFILE_SLOTS?book.active as number:0;
 slots[active].save=null; // the profile in use lives in SAVE_KEY
 return {active,slots};
}
export function storeProfiles(book:ProfileBook){try{localStorage.setItem(PROFILES_KEY,JSON.stringify(book));return true;}catch{return false;}}

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export function profileSummary(save:Save){
 const cleared=save.cleared.filter(Boolean).length;
 return `Stage ${save.mission+1} · ${cleared} / ${MISSIONS.length} cleared · ${save.credits.toLocaleString('en-US')} CR · ${MODES[save.difficulty].label} · ${getSkin(save.skin).name}`;
}
/** Header button on the command screen. */
export function profileChip(book:ProfileBook,name:string){
 return `<button class="profile-chip" data-action="profiles" aria-label="Profile ${book.active+1} of ${PROFILE_SLOTS}: ${esc(name)}. Switch or start a new game"><span>PROFILE ${book.active+1}</span><strong>${esc(name)}</strong><b aria-hidden="true">→</b></button>`;
}

export interface ProfileView {book:ProfileBook;saves:(Save|null)[];names:string[];editing:number|null;}
export function profilesPanel(v:ProfileView){
 const played=(t:number)=>t?`Last played ${new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}`:'';
 const cards=v.saves.map((save,i)=>{
  const active=i===v.book.active,name=esc(v.names[i]);
  const title=v.editing===i
   ?`<label class="profile-rename">Profile name <input id="profile-name" maxlength="20" value="${name}" aria-label="Profile ${i+1} name" autocomplete="off"></label>`
   :`<h2>${name}</h2>`;
  const actions=v.editing===i?`<div class="profile-actions"><button class="primary" data-action="profile-name-save" data-value="${i}">SAVE NAME</button><button data-action="profiles">Cancel</button></div>`:save
   ?`<div class="profile-actions">${active?'<button class="primary" data-action="menu">CONTINUE →</button>':`<button class="primary" data-action="profile-use" data-value="${i}">PLAY THIS PROFILE →</button>`}<button data-action="profile-rename" data-value="${i}">Rename</button><button class="quiet" data-action="profile-reset" data-value="${i}">Reset</button></div>`
   :`<div class="profile-actions"><button class="primary" data-action="profile-use" data-value="${i}">NEW GAME →</button><button data-action="profile-rename" data-value="${i}">Rename</button></div>`;
  return `<article class="profile-card${active?' active':''}${save?'':' empty'}"><div class="profile-head"><span class="eyebrow">PROFILE ${i+1}</span>${active?'<span class="profile-tag">IN USE</span>':''}</div>${title}<p>${save?profileSummary(save):'Empty slot · start a fresh campaign with its own progress.'}</p>${save&&v.book.slots[i].played?`<small>${played(v.book.slots[i].played)}</small>`:''}${actions}</article>`;
 }).join('');
 return `<section class="panel pause-panel profiles-panel"><span class="eyebrow">PILOT PROFILES</span><h1>Choose your profile</h1><p>Each profile keeps its own stages, credits, upgrades, skins and leaderboard name. Sound and graphics settings belong to this device and apply to every profile.</p><div class="profile-list">${cards}</div><button data-action="menu">Back to command</button></section>`;
}
export function resetPrompt(name:string,i:number){
 return `<section class="panel pause-panel profiles-panel"><span class="eyebrow">RESET PROFILE ${i+1}</span><h1>Start ${esc(name)} over?</h1><p>This clears ${esc(name)}'s unlocked operations, credits, upgrades and skins. Other profiles, leaderboard records and device settings are untouched.</p><button class="primary" data-action="profiles">KEEP THIS PROFILE</button><button data-action="profile-reset-confirm" data-value="${i}">Reset ${esc(name)}</button></section>`;
}
