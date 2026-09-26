import {parseSave,SAVE_KEY} from './campaign';
import type {Save} from './campaign';
import {loadProfiles,PROFILES_KEY} from './profiles';
import type {ProfileBook} from './profiles';
import {pilotName} from './leaderboard';

export const PROFILE_STATE_KEY='steel-front-3d-state-v2';
export type SaveFailure='conflict'|'storage'|'unsupported';
export type SaveOutcome={ok:true}|{ok:false;reason:SaveFailure};
/** All profiles, the selected campaign and its name commit in ONE localStorage write.
 * Legacy profile/name keys are migration inputs only, never independently committed.
 * The lock covers compare + write across tabs; the queue preserves call order within a tab. */
export class ProfileStorage {
 save:Save;book:ProfileBook;unavailable=false;pending=0;
 private raw:string|null=null;private legacySave:string|null=null;private legacy:string|null=null;private migrated=false;private revision=0;
 private queue:Promise<SaveOutcome>=Promise.resolve({ok:true});
 constructor(){
  try{this.raw=localStorage.getItem(PROFILE_STATE_KEY);this.legacySave=localStorage.getItem(SAVE_KEY);this.legacy=localStorage.getItem(PROFILES_KEY);}catch{this.unavailable=true;}
  this.save=parseSave(this.raw??this.legacySave);
  let data:any=null;try{data=JSON.parse(this.raw??this.legacySave??'null');}catch{/* legacy parser supplies a fresh campaign */}
  this.migrated=data?.profileVersion===2;
  this.book=loadProfiles(this.migrated?JSON.stringify(data.profileBook):this.legacy);
  this.revision=this.migrated&&Number.isSafeInteger(data.profileRevision)?data.profileRevision:0;
  if(!this.migrated)this.book.slots[this.book.active].name=pilotName();
 }
 /** Read storage again, not the event's potentially delayed value. */
 private differs(){return localStorage.getItem(PROFILE_STATE_KEY)!==this.raw||this.raw===null&&(localStorage.getItem(SAVE_KEY)!==this.legacySave||localStorage.getItem(PROFILES_KEY)!==this.legacy);}
 changed(){try{return this.differs();}catch{return false;}}
 commit(save:Save,book:ProfileBook):Promise<SaveOutcome>{
  const campaign=JSON.stringify(save),snapshot=JSON.stringify({...save,profileVersion:2,profileBook:book});
  const write=async():Promise<SaveOutcome>=>{
   // An unsafe read/compare/write fallback would reintroduce the lost-update race.
   if(!navigator.locks)return {ok:false,reason:'unsupported'};
   try{return await navigator.locks.request(PROFILE_STATE_KEY,()=>{
    if(this.unavailable)return {ok:false,reason:'storage'} as const;
    if(this.differs())return {ok:false,reason:'conflict'} as const;
    const next=JSON.stringify({...JSON.parse(snapshot),profileRevision:this.revision+1});
    localStorage.setItem(PROFILE_STATE_KEY,next); // throwing leaves the entire previous record intact
    this.raw=next;this.migrated=true;this.revision++;
    // Compatibility mirror only. Cached older builds may write this key; it is no longer authoritative.
    try{localStorage.setItem(SAVE_KEY,campaign);}catch{/* the atomic record already saved successfully */}
    return {ok:true} as const;
   });}catch{return {ok:false,reason:'storage'};}
  };
  this.pending++;this.queue=this.queue.then(write,write).finally(()=>{this.pending--;});return this.queue;
 }
 flush(){return this.queue;}
}
