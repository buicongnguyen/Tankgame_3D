import type {Page} from '@playwright/test';
export async function addTestPickups(page:Page,kinds:string[]){
 await page.evaluate(async kinds=>{const g=(window as any).__steel;const {createActivity}=await import('/src/three/activities.ts');for(const [i,kind] of kinds.entries())g.world.activities.push(createActivity(g.world.arena,kind,-62+i*10,40));},kinds);
}
