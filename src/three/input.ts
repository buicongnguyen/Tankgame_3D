import * as T from 'three';
export class Input {
  keys=new Set<string>(); mouse=new T.Vector2(); hasMouse=false; firing=false;
  move={x:0,z:0}; aim={x:0,z:-1}; touchFiring=false; touchAiming=false; hasTouchAim=false;
  onAction: (action:string)=>void=()=>{};
  onPause: ()=>void=()=>{};
  onBackground: ()=>void=()=>{};
  private resetters:(()=>void)[]=[];
  active=false;
  constructor(canvas:HTMLCanvasElement){
    window.addEventListener('keydown',e=>{
      if(e.target instanceof HTMLElement && ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
      if(e.code==='Escape'){e.preventDefault();if(!e.repeat)this.onPause();return;}
      if(!this.active)return;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);
      if(!e.repeat){if(e.code==='KeyR')this.onAction('artillery');if(e.code==='KeyQ')this.onAction('shield');if(e.code==='KeyE')this.onAction('repair');if(e.code.startsWith('Digit'))this.onAction(e.code.slice(-1));}
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    const pointer=(e:PointerEvent)=>{const r=canvas.getBoundingClientRect();this.hasTouchAim=false;this.mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.hasMouse=true;};
    canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pointer(e);});
    canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0){pointer(e);this.firing=true;canvas.setPointerCapture(e.pointerId);}});
    canvas.addEventListener('pointerup',()=>this.firing=false);
    canvas.addEventListener('pointercancel',()=>this.firing=false);
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('resize',()=>this.reset());
    window.addEventListener('blur',()=>{this.reset();this.onBackground();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.reset();this.onBackground();}});
  }
  reset(){for(const reset of this.resetters)reset();this.hasTouchAim=false;this.hasMouse=false;this.keys.clear();this.firing=false;this.touchFiring=false;this.touchAiming=false;this.move={x:0,z:0};document.querySelectorAll<HTMLElement>('.stick-nub').forEach(n=>n.style.transform='translate(0px, 0px)');}
  movement(){return {x:(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.move.x,z:(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.move.z};}
  bindStick(element:HTMLElement,type:'move'|'aim'){
    let owner:number|null=null;
    const nub=element.querySelector<HTMLElement>('.stick-nub')!;
    const update=(e:PointerEvent)=>{
      const r=element.getBoundingClientRect(),max=Math.max(1,(r.width-nub.offsetWidth)/2-3);
      let x=(e.clientX-r.left-r.width/2)/max,z=(e.clientY-r.top-r.height/2)/max;
      const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
      nub.style.transform=`translate(${x*max}px,${z*max}px)`;
      if(type==='move'){
        // Remap the radial dead zone so a resting thumb stays still without losing analog speed.
        const strength=Math.max(0,(Math.min(1,length)-.15)/.85),magnitude=Math.hypot(x,z)||1;
        this.move={x:x/magnitude*strength,z:z/magnitude*strength};
      }else{
        this.touchAiming=length>.15;
        if(this.touchAiming){const magnitude=Math.hypot(x,z);this.aim={x:x/magnitude,z:z/magnitude};this.hasTouchAim=true;}
        // Separate engage/release thresholds prevent firing from flickering at the boundary.
        this.touchFiring=length>(this.touchFiring?.22:.32);
        element.classList.toggle('firing',this.touchFiring);
      }
    };
    element.addEventListener('pointerdown',e=>{if(owner!==null||!this.active||e.button!==0)return;owner=e.pointerId;element.classList.add('engaged');element.setPointerCapture(owner);update(e);e.preventDefault();});
    element.addEventListener('pointermove',e=>{if(this.active&&e.pointerId===owner)update(e);});
    const release=(e:PointerEvent)=>{if(e.pointerId!==owner)return;owner=null;element.classList.remove('engaged','firing');nub.style.transform='translate(0px, 0px)';if(type==='move')this.move={x:0,z:0};else{this.touchFiring=false;this.touchAiming=false;}};
    this.resetters.push(()=>{const pointerId=owner;owner=null;element.classList.remove('engaged','firing');if(pointerId!==null&&element.hasPointerCapture(pointerId))element.releasePointerCapture(pointerId);nub.style.transform='translate(0px, 0px)';});
    element.addEventListener('pointerup',release);element.addEventListener('pointercancel',release);element.addEventListener('lostpointercapture',release);
  }
}
