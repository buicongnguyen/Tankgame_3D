/** Fullscreen is opt-in and must be requested directly from a user gesture. */
let busy=false;
const orientation=()=>screen.orientation as ScreenOrientation & {lock?:(mode:string)=>Promise<void>};
export function fullscreenButton(){return `<button class="fullscreen-button" data-action="fullscreen" aria-pressed="${!!document.fullscreenElement}">${document.fullscreenElement?'EXIT FULLSCREEN':'⛶ FULLSCREEN'}</button>`;}
export function installFullscreen(){
 const notice=document.createElement('div');notice.className='fullscreen-notice';notice.setAttribute('role','status');notice.hidden=true;document.body.append(notice);
 let timer:ReturnType<typeof setTimeout>;
 const message=(text:string)=>{clearTimeout(timer);notice.textContent=text;notice.hidden=false;timer=setTimeout(()=>notice.hidden=true,7000);};
 const sync=()=>{for(const button of document.querySelectorAll<HTMLButtonElement>('[data-action="fullscreen"]')){button.textContent=document.fullscreenElement?'EXIT FULLSCREEN':'⛶ FULLSCREEN';button.setAttribute('aria-pressed',String(!!document.fullscreenElement));button.disabled=busy;}};
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){try{orientation()?.unlock();}catch{/* Some browsers do not allow orientation control. */}}sync();});
 document.addEventListener('click',async event=>{
  if(!(event.target instanceof Element)||!event.target.closest('[data-action="fullscreen"]')||busy)return;
  if(!document.fullscreenElement&&(!document.documentElement.requestFullscreen||document.fullscreenEnabled===false)){
   message('Fullscreen is unavailable here. Rotate your phone to landscape. On iPhone, use Share → Add to Home Screen for an app-style view.');return;
  }
  busy=true;sync();
  try{
   if(document.fullscreenElement){await document.exitFullscreen();}
   else{
    await document.documentElement.requestFullscreen({navigationUI:'hide'});
    if(matchMedia('(pointer:coarse)').matches){
     try{const screenMode=orientation();if(!screenMode?.lock)throw new Error('No orientation lock');await screenMode.lock('landscape');}
     catch{message('Fullscreen is on. Rotate your phone to landscape.');}
    }
   }
  }catch{message('The browser could not enter fullscreen. You can still play by rotating your phone to landscape.');}
  finally{busy=false;sync();}
 });
}
