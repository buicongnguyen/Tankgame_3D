/** Small rigid pennants: vertex paint only, merged into the existing skin mesh. */
export const TANK_FLAGS=[
 {id:'none',name:'None'}, {id:'vn',name:'Vietnam'}, {id:'jp',name:'Japan'},
 {id:'fr',name:'France'}, {id:'de',name:'Germany'}, {id:'it',name:'Italy'},
 {id:'ua',name:'Ukraine'}, {id:'pl',name:'Poland'}, {id:'id',name:'Indonesia'},
] as const;
export type TankFlag=typeof TANK_FLAGS[number]['id'];
export const normalizeFlag=(id:unknown):TankFlag=>TANK_FLAGS.find(f=>f.id===id)?.id??'none';
type Patch={color:string;points:[number,number][]};
/** Coordinates run left-to-right, top-to-bottom in a 3:2 rectangle. */
export function flagPaint(id:TankFlag):Patch[]{
 const shapes:Patch[]=[];
 const rect=(x:number,y:number,w:number,h:number,color:string)=>shapes.push({color,points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]});
 const bands=(colors:string[],vertical=false)=>colors.forEach((color,i)=>rect(vertical?i/colors.length:0,vertical?0:i/colors.length,vertical?1/colors.length:1,vertical?1:1/colors.length,color));
 if(id==='vn'){
  rect(0,0,1,1,'#da251d');
  // Separate center fans keep the five-point star concave when triangulated.
  const rim=Array.from({length:10},(_,i):[number,number]=>{const r=i%2?.115:.3;return [.5+Math.sin(i*Math.PI/5)*r/1.5,.5-Math.cos(i*Math.PI/5)*r];});
  for(let i=0;i<10;i++)shapes.push({color:'#ffff00',points:[[.5,.5],rim[i],rim[(i+1)%10]]});
 }else if(id==='jp'){
  rect(0,0,1,1,'#ffffff');shapes.push({color:'#bc002d',points:Array.from({length:32},(_,i)=>[.5+Math.cos(i*Math.PI/16)*.2,.5+Math.sin(i*Math.PI/16)*.3])});
 }else if(id==='fr')bands(['#002395','#ffffff','#ed2939'],true);
 else if(id==='de')bands(['#151515','#dd0000','#ffce00']);
 else if(id==='it')bands(['#009246','#ffffff','#ce2b37'],true);
 else if(id==='ua')bands(['#0057b7','#ffd700']);
 else if(id==='pl')bands(['#ffffff','#dc143c']);
 else if(id==='id')bands(['#ff0000','#ffffff']);
 return shapes;
}
export function flagPreview(id:TankFlag){
 const shapes=flagPaint(id);
 return `<svg viewBox="0 0 150 100" aria-hidden="true" focusable="false">${shapes.length?shapes.map(p=>`<polygon fill="${p.color}" points="${p.points.map(([x,y])=>`${x*150},${y*100}`).join(' ')}"/>`).join(''):'<rect x="2" y="2" width="146" height="96" rx="10" fill="#263649" stroke="#8092a8" stroke-width="4"/><path d="M45 70L105 30" stroke="#8092a8" stroke-width="5"/>'}</svg>`;
}
