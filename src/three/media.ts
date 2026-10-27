/** Media queries read every frame or every stage: each is evaluated once and then kept current by its change
 *  event, instead of re-running matchMedia (which showed up in phone frame profiles). */
function follow(query:string){
 const list=typeof matchMedia==='function'?matchMedia(query):null;let value=!!list?.matches;
 list?.addEventListener?.('change',event=>{value=event.matches;});
 return ()=>value;
}
export const coarsePointer=follow('(pointer:coarse)');
export const reducedMotion=follow('(prefers-reduced-motion: reduce)');
