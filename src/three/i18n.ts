import {VI_TEXT,VI_PATTERNS} from './locales/vi';

export type Language='en'|'vi';
export const LANGUAGE_KEY='steel-front-language-v1';
export function isLanguage(value:unknown):value is Language{return value==='en'||value==='vi';}
let language:Language='en';
try{const saved=localStorage.getItem(LANGUAGE_KEY);if(isLanguage(saved))language=saved;}catch{/* The choice still works for this session. */}
export const getLanguage=()=>language;
export const locale=()=>language==='vi'?'vi-VN':'en-US';
const cache=new Map<string,string>();
const folded=new Map(Object.entries(VI_TEXT).map(([en,vi])=>[en.toLowerCase(),vi]));
const paragraphs=Object.entries(VI_TEXT).filter(([en])=>en.length>60&&/[.!?]$/.test(en)).sort((a,b)=>b[0].length-a[0].length);
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Prefer the most specific phrase: "Buy and equip ..." before "Buy ...".
const patterns=[...VI_PATTERNS].sort((a,b)=>b[0].replace(/\{\w+\}/g,'').length-a[0].replace(/\{\w+\}/g,'').length).map(([en,vi])=>{
 const names:string[]=[];let start=0,pattern='';
 for(const part of en.matchAll(/\{(\w+)\}/g)){pattern+=escape(en.slice(start,part.index))+(['n','count','total','cost','seconds','killed','done','barrels','m','more','duration'].includes(part[1])?'([\\d.,+−-]+)':'(.+?)');names.push(part[1]);start=part.index!+part[0].length;}
 const body='^'+pattern+escape(en.slice(start));
 return {regex:new RegExp(body+'$','i'),prefix:en.length>80&&en.endsWith('.')?new RegExp(body+'(?= |$)','i'):null,names,vi};
});
/** Useful to audit new UI copy in development; never grows during production play. */
export const translationGaps=new Set<string>();
function translate(source:string,depth=0):string{
 if(depth>8||!/[A-Za-z]/.test(source))return source;
 const exact=Object.hasOwn(VI_TEXT,source)?VI_TEXT[source]:undefined;if(exact!==undefined)return exact;
 const known=folded.get(source.toLowerCase());if(known!==undefined)return source===source.toUpperCase()?known.toLocaleUpperCase('vi'):source===source.toLowerCase()?known.toLocaleLowerCase('vi'):known;
 const decorated=source.match(/^([➜⛶·\s]*)(.*?)([→▴↗\s]*)$/);if(decorated&&(decorated[1]||decorated[3]))return decorated[1]+translate(decorated[2],depth+1)+decorated[3];
 for(const {regex,names,vi} of patterns){const match=source.match(regex);if(!match)continue;
  // A dynamic field must not swallow adjacent HUD fields or whole sentences.
  // Player names are literal data; the reward suffix deliberately contains a separator.
  if(names.some((name,i)=>!name.startsWith('raw_')&&name!=='suffix'&&/(?:\n| · | → | \/ | — |[.!?]\s)/.test(match[i+1])))continue;
  return vi.replace(/\{(\w+)\}/g,(_,name:string)=>{const value=match[names.indexOf(name)+1]??'';return name.startsWith('raw_')?value:translate(value,depth+1);});
 }
 if(source.length>60){
  for(const [en,vi] of paragraphs)if(source.startsWith(en+' '))return vi+' '+translate(source.slice(en.length+1),depth+1);
  for(const {prefix,names,vi} of patterns){const match=prefix&&source.match(prefix);if(match)return vi.replace(/\{(\w+)\}/g,(_,name:string)=>match[names.indexOf(name)+1]??'')+' '+translate(source.slice(match[0].length).trimStart(),depth+1);}
 }
 // UI composition boundaries only; translate whole phrases before splitting them.
 const sentences=source.split(/(?<=[.!?])\s+(?=[A-Z\d])/);if(sentences.length>1)return sentences.map(part=>translate(part,depth+1)).join(' ');
 for(const separator of ['\n',' · ',' → ',' / ',' — ',': '])if(source.includes(separator))return source.split(separator).map(part=>translate(part,depth+1)).join(separator);
 if(import.meta.env?.DEV&&/[a-z]{3}/i.test(source)&&translationGaps.size<1000)translationGaps.add(source);
 return source;
}
export function t(source:string):string{
 if(language==='en'||!source.trim())return source;
 const hit=cache.get(source);if(hit!==undefined)return hit;
 const start=source.match(/^\s*/)?.[0]??'',end=source.match(/\s*$/)?.[0]??'',result=start+translate(source.trim())+end;
 if(cache.size>=512)cache.delete(cache.keys().next().value!);cache.set(source,result);return result;
}
export function setLanguage(value:Language,persist=true){
 language=value;cache.clear();translationGaps.clear();
 if(typeof document!=='undefined')document.documentElement.lang=value;
 if(persist)try{localStorage.setItem(LANGUAGE_KEY,value);}catch{/* Browser storage is optional for language choice. */}
}
type Source={source:string;rendered:string};
const textSources=new WeakMap<Text,Source>();
const attributeSources=new WeakMap<Element,Map<string,Source>>();
const attributes=['aria-label','aria-description','title','alt','placeholder'];
const protectedText=(element:Element|null)=>!!element?.closest('[translate="no"],script,style');
/** Translate at the rendering boundary. No observers, polling or per-frame DOM traversal. */
export function translateTree(root:Element){
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;
 while((node=walk.nextNode())){
  const text=node as Text;if(protectedText(text.parentElement))continue;
  const old=textSources.get(text),source=old&&text.data===old.rendered?old.source:text.data,rendered=t(source);
  if(text.data!==rendered)text.data=rendered;textSources.set(text,{source,rendered});
 }
 for(const element of [root,...root.querySelectorAll('*')])if(!protectedText(element))for(const name of attributes){
  const value=element.getAttribute(name);if(value===null)continue;
  const old=attributeSources.get(element)?.get(name);setAttribute(element,name,old&&value===old.rendered?old.source:value);
 }
}
export function setHtml(element:Element,html:string){element.innerHTML=html;if(language==='vi')translateTree(element);}
export function setText(element:Node,source:string|null){
 const raw=source??'',rendered=protectedText(element instanceof Element?element:element.parentElement)?raw:t(raw);
 if(element.textContent!==rendered)element.textContent=rendered;
 if(element.firstChild instanceof Text&&element.childNodes.length===1)textSources.set(element.firstChild,{source:raw,rendered});
}
export function setAttribute(element:Element,name:string,source:string){
 const rendered=protectedText(element)?source:t(source);if(element.getAttribute(name)!==rendered)element.setAttribute(name,rendered);
 let saved=attributeSources.get(element);if(!saved){saved=new Map();attributeSources.set(element,saved);}saved.set(name,{source,rendered});
}
export function languagePicker(id='game-language'){
 return `<div id="${id}" class="language-picker" role="group" aria-label="Language / Ngôn ngữ" translate="no"><span class="language-caption"><span lang="en">Language</span> / <span lang="vi">Ngôn ngữ</span></span><div class="language-options">${(['en','vi'] as const).map(value=>`<button type="button" class="language-choice" data-action="language" data-value="${value}" data-language="${value}" lang="${value}" aria-pressed="${language===value}"><span class="language-check" aria-hidden="true">✓</span>${value==='en'?'English':'Tiếng Việt'}</button>`).join('')}</div></div>`;
}
