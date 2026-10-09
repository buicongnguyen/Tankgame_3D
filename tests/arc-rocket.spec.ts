import {test,expect} from '@playwright/test';
import {salvageReward} from '../src/three/loot';
import {WEAPON_ORDER,weaponNumber,arcUnlocked} from '../src/three/armory';

test('arc rockets are the last weapon number and never drop as salvage for beginners',()=>{
 expect(weaponNumber(4)).toBe(9);expect(WEAPON_ORDER).toHaveLength(9);expect(new Set(WEAPON_ORDER).size).toBe(9);
 for(let i=0;i<200;i++){const roll=i/200;expect(salvageReward(roll,'normal',0,false).kind).not.toBe('arc');}
 expect([...Array(200)].some((_,i)=>salvageReward(i/200,'normal',0,true).kind==='arc')).toBe(true);
 const cleared=Array(16).fill(false);expect(arcUnlocked(cleared)).toBe(false);cleared[4]=true;expect(arcUnlocked(cleared)).toBe(true);
});

test('the shop keeps arc rockets locked until Glass Road is cleared; key 9 selects them',async({page})=>{
 await page.goto('/?e2e');await page.locator('[data-action=shop]').waitFor();
 await page.evaluate(()=>{(window as any).__steel.save.credits=5000;});await page.locator('[data-action=shop]').click();
 const arc=page.locator('[data-action=buy-weapon][data-value="4"]');await expect(arc).toBeDisabled();await expect(arc).toHaveText('AFTER GLASS ROAD');
 await expect(page.locator('[data-weapon-card="4"] .eyebrow')).toContainText('CLEAR GLASS ROAD');
 // The arc rocket card is the last weapon card.
 expect(await page.locator('[data-weapon-card]').evaluateAll(cards=>cards.map(c=>(c as HTMLElement).dataset.weaponCard))).toEqual(['0','1','2','3','5','6','7','8','4']);
 await page.evaluate(()=>{const g=(window as any).__steel;g.save.cleared[4]=true;g.showShop();});
 await expect(arc).toBeEnabled();await arc.click();await expect(page.locator('[data-weapon-card="4"] .eyebrow')).toContainText('OWNED');
 await page.locator('[data-action=shop-back]').click();await page.locator('[data-action=deploy]').click();
 await page.evaluate(()=>{(window as any).__steel.frame=()=>{};});await page.keyboard.press('Digit9');
 expect(await page.evaluate(()=>(window as any).__steel.weapon)).toBe(4);await expect(page.locator('[data-quick-weapon="9"]')).toHaveAttribute('aria-pressed','true');
});

test('no arc caches on the first five missions; Easy starter brings arc rockets only after Glass Road',async({page})=>{
 await page.goto('/?e2e');await page.locator('[data-action=deploy]').waitFor();
 const r=await page.evaluate(async()=>{const g=(window as any).__steel;const {stageLayout}=await import('/src/three/stage-layout.ts');
  const kinds=(from:number,to:number)=>{const out=new Set<string>();for(let s=from;s<to;s++)for(const d of ['easy','normal','hard','crazy'])for(let l=0;l<3;l++)for(const k of ['assault','escort','capture','defense','boss'])try{for(const p of stageLayout(s,l,k,d).supplies)out.add(p.kind);}catch{}return out;};
  const early=kinds(0,5).has('arc'),later=kinds(5,16).has('arc');
  g.frame=()=>{};g.save.training={completed:[true,true,true],skipped:true};g.save.difficulty='easy';g.save.weapons=[];
  const starter=()=>{g.start(5,0);return g.airSupport.drops.map((d:any)=>d.activity.kind).sort();};
  const beginner=starter();g.save.cleared[4]=true;const veteran=starter();
  return {early,later,beginner,veteran};});
 expect(r.early).toBe(false);expect(r.later).toBe(true);
 expect(r.beginner).toEqual(['laser','shield']);expect(r.veteran).toEqual(['arc','laser']);
});
