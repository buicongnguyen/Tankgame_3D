import type {Point} from './rules';
export type RouteShape='winding'|'S'|'flipped-S'|'S-45'|'L'|'U';
export const ROUTE_LABELS:Record<RouteShape,string>={winding:'Winding route',S:'S sweep','flipped-S':'Mirrored S sweep','S-45':'45° S sweep',L:'L route',U:'U loop'};
// A whole-map sweep uses three lanes, with opposite turns at the east and west edges.
const SHAPES:Record<Exclude<RouteShape,'winding'|'S-45'>,number[][]>={
 S:[[-50,44],[50,44],[50,0],[-50,0],[-50,-44],[50,-44]],
 'flipped-S':[[50,44],[-50,44],[-50,0],[50,0],[50,-44],[-50,-44]],
 L:[[-50,-44],[-50,0],[-50,44],[0,44],[50,44]],
 U:[[-50,-44],[-50,0],[-50,44],[50,44],[50,0],[50,-44]],
};
// Keep introductory, relay and defense routes; later levels introduce new geography.
const SELECTION:Record<number,(Exclude<RouteShape,'winding'>|null)[]>={
 0:[null,'S','flipped-S'],2:[null,'S-45','flipped-S'],4:['S','flipped-S','U'],
 5:['L','U','S-45'],6:[null,'S-45','L'],7:[null,'S-45','U'],
 10:[null,'L','U'],11:[null,'U','S-45'],14:['S','S-45','L'],15:[null,'U','S-45'],
};
export function routePattern(stage:number,level:number){
 const shape=SELECTION[stage]?.[level];if(!shape)return null;
 const rotation=shape==='S-45'?Math.PI/4:0;
 // Uniform scaling leaves room for the road and its turns inside the square arena.
 const points=SHAPES[shape==='S-45'?'S':shape].map(([x,z])=>rotatePoint({x,z},rotation,shape==='S-45'?.78:1));
 const length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.z-points[i].z),0);
 return {shape,points,length,rotation};
}
export function rotatePoint(p:Point,angle:number,scale=1):Point{const c=Math.cos(angle)*scale,s=Math.sin(angle)*scale;return {x:p.x*c-p.z*s,z:p.x*s+p.z*c};}
export function landformCandidates(shape:RouteShape):Point[]{
 if(shape==='S-45')return landformCandidates('S').map(p=>rotatePoint(p,Math.PI/4,.78));
 if(shape==='S'||shape==='flipped-S')return [-22,22].flatMap(z=>[-58,-44,-30,-16,-2,12,26,40,54].map(x=>({x:shape==='flipped-S'?-x:x,z})));
 if(shape==='U')return [-30,-16,-2,12,26].flatMap(z=>[-28,-14,0,14,28].map(x=>({x,z})));
 if(shape==='L')return [-32,-12,8,28].flatMap(z=>[-20,0,20,40].map(x=>({x,z})));
 return [];
}
