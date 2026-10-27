import './ui-polish.css';
// Keyboard users keep their focus rings on touch screens; everyone else sees none from programmatic focus.
// Typing in a text field (including a phone keyboard, which also sends key events) does not count.
const root=document.documentElement;
addEventListener('keydown',event=>{
 const target=event.target instanceof Element?event.target:null;
 if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.key==='Unidentified'||event.key==='Process'||target?.closest('input,textarea,select,[contenteditable]'))return;
 root.dataset.input='keys';
},true);
addEventListener('pointerdown',()=>{delete root.dataset.input;},true);
// Warm the icon cache once the page is idle, so the shop opens with its tab icons and coins already drawn.
const icons=import.meta.glob<string>('./ui-icons/*.webp',{eager:true,query:'?url',import:'default'});
const warm=()=>{for(const url of Object.values(icons))new Image().src=url;};
if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:3000});else setTimeout(warm,1500);
