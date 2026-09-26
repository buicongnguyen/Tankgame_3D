import {test,expect,type Page} from '@playwright/test';
import {freshSave,SAVE_KEY} from '../src/three/campaign';
import {PROFILES_KEY} from '../src/three/profiles';

const PILOT='steel-front-pilot-v1';
/** An existing single-save player: stage 6, credits, upgrades, a custom pilot name and device settings. */
const veteran={...freshSave(),training:{completed:[true,true,true],skipped:false},mission:5,level:1,cleared:freshSave().cleared.map((_,i)=>i<5),credits:4210,weapons:[1,2],upgrades:{armor:3,power:2,reload:1,engine:0,shield:0},skin:'sunburst',difficulty:'normal' as const,sound:true,low:true,graphicsChosen:true};
async function open(page:Page,book?:string){
 await page.addInitScript(([key,save,pilot,profilesKey,book])=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem(key,save);localStorage.setItem(pilot,'Nguyen');if(book!==null)localStorage.setItem(profilesKey,book);},[SAVE_KEY,JSON.stringify(veteran),PILOT,PROFILES_KEY,book??null] as const);
 await page.goto('/?e2e');await page.locator('[data-action="deploy"]').waitFor();await page.evaluate(()=>{(window as any).__steel.frame=()=>{};});
}
const state=(page:Page)=>page.evaluate(([key,pilot,profilesKey])=>{const g=(window as any).__steel,saved=JSON.parse(localStorage.getItem(key)!);
 return {mission:g.save.mission,credits:g.save.credits,armor:g.save.upgrades.armor,skin:g.save.skin,sound:g.save.sound,low:g.save.low,training:g.save.training.completed.some(Boolean),savedCredits:saved.credits,pilot:localStorage.getItem(pilot),book:JSON.parse(localStorage.getItem(profilesKey)??'null')};},[SAVE_KEY,PILOT,PROFILES_KEY] as const);

test('an existing campaign becomes Profile 1; a new game in Profile 2 leaves it untouched and switching restores it',async({page})=>{
 await open(page);
 await expect(page.locator('.profile-chip')).toContainText('Nguyen');
 await page.locator('.profile-chip').click();
 const cards=page.locator('.profile-card');await expect(cards).toHaveCount(3);
 await expect(cards.nth(0)).toContainText('Stage 6 · 5 / 16 cleared · 4,210 CR');await expect(cards.nth(0)).toContainText('IN USE');
 await expect(cards.nth(1)).toContainText('Empty slot');await expect(cards.nth(2)).toContainText('Empty slot');
 await page.locator('[data-action="profile-use"][data-value="1"]').click();
 await expect(page.locator('.profile-chip')).toContainText('Pilot 2');
 // A brand-new campaign that still honours this device's sound and graphics choices.
 expect(await state(page)).toMatchObject({mission:0,credits:0,armor:0,skin:'classic',training:false,savedCredits:0,sound:true,low:true,pilot:'Pilot 2'});
 await expect(page.getByRole('button',{name:/START TRAINING/})).toBeVisible();
 await page.locator('.profile-chip').click();
 await expect(page.locator('.profile-card').nth(0)).toContainText('4,210 CR');
 await page.locator('[data-action="profile-use"][data-value="0"]').click();
 expect(await state(page)).toMatchObject({mission:5,credits:4210,armor:3,skin:'sunburst',savedCredits:4210,pilot:'Nguyen'});
 const book=(await state(page)).book;expect(book.active).toBe(0);expect(book.slots[0].save).toBeNull();
 expect(JSON.parse(book.slots[1].save).credits).toBe(0);
});

test('the chosen profile, its progress and names survive a reload',async({page})=>{
 await open(page);
 await page.locator('.profile-chip').click();await page.locator('[data-action="profile-use"][data-value="2"]').click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.save.credits=77;g.persist();});
 await page.reload();await page.locator('[data-action="deploy"]').waitFor();
 await expect(page.locator('.profile-chip')).toContainText('PROFILE 3');
 expect(await state(page)).toMatchObject({credits:77,pilot:'Pilot 3'});
 await page.locator('.profile-chip').click();await expect(page.locator('.profile-card').nth(0)).toContainText('4,210 CR');
});

test('renaming escapes markup, saves with Enter, falls back to the default name and follows the leaderboard',async({page})=>{
 await open(page);
 await page.locator('.profile-chip').click();
 await page.locator('[data-action="profile-rename"][data-value="1"]').click();
 await page.locator('#profile-name').fill('<b>Ace</b>');await page.locator('#profile-name').press('Enter');
 await expect(page.locator('.profile-card').nth(1).locator('h2')).toHaveText('<b>Ace</b>');
 expect(await page.locator('.profile-card').nth(1).locator('h2 b').count()).toBe(0);
 await page.locator('[data-action="profile-rename"][data-value="2"]').click();await page.locator('#profile-name').fill('   ');await page.locator('[data-action="profile-name-save"]').click();
 await expect(page.locator('.profile-card').nth(2).locator('h2')).toHaveText('Pilot 3');
 // Renaming the profile in use renames the leaderboard pilot; switching carries each name.
 await page.locator('[data-action="profile-rename"][data-value="0"]').click();await page.locator('#profile-name').fill('Kestrel');await page.locator('#profile-name').press('Enter');
 expect((await state(page)).pilot).toBe('Kestrel');
 await page.locator('[data-action="profile-use"][data-value="1"]').click();expect((await state(page)).pilot).toBe('<b>Ace</b>');
});

test('resetting asks first, clears only that profile and keeps its name and device settings',async({page})=>{
 await open(page);
 await page.locator('.profile-chip').click();await page.locator('[data-action="profile-use"][data-value="1"]').click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.save.credits=500;g.persist();});
 await page.locator('.profile-chip').click();
 // Reset the parked veteran from the picker: cancelling keeps it.
 await page.locator('[data-action="profile-reset"][data-value="0"]').click();await expect(page.locator('.profiles-panel h1')).toHaveText('Start Nguyen over?');
 await page.getByRole('button',{name:'KEEP THIS PROFILE'}).click();await expect(page.locator('.profile-card').nth(0)).toContainText('4,210 CR');
 await page.locator('[data-action="profile-reset"][data-value="0"]').click();await page.locator('[data-action="profile-reset-confirm"]').click();
 await expect(page.locator('.profile-card').nth(0)).toContainText('Stage 1 · 0 / 16 cleared · 0 CR');await expect(page.locator('.profile-card').nth(0).locator('h2')).toHaveText('Nguyen');
 expect((await state(page)).credits).toBe(500);
 // Settings resets the profile in use.
 await page.locator('[data-action="menu"]').last().click();
 await page.locator('.menu-settings summary').click();await page.getByRole('button',{name:/Reset this profile/i}).click();
 await page.locator('[data-action="profile-reset-confirm"]').click();
 expect(await state(page)).toMatchObject({credits:0,mission:0,sound:true,low:true,pilot:'Pilot 2'});
});

test('an unreadable profile book falls back to the current campaign as Profile 1',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await open(page,'{"active":7,"slots":"broken"');
 await page.locator('.profile-chip').click();
 await expect(page.locator('.profile-card').nth(0)).toContainText('4,210 CR');await expect(page.locator('.profile-card').nth(1)).toContainText('Empty slot');
 expect(errors).toEqual([]);
});

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`profile picker fits a ${viewport.width}×${viewport.height} phone`,async({browser})=>{
 const context=await browser.newContext({viewport,isMobile:true,hasTouch:true}),page=await context.newPage();
 await open(page);await page.locator('.profile-chip').tap();await page.locator('.profiles-panel').waitFor();
 const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll<HTMLButtonElement>('.profiles-panel button')].filter(b=>b.getBoundingClientRect().height<36).length}));
 expect(layout).toEqual({overflow:false,small:0});
 await page.locator('[data-action="profile-use"][data-value="1"]').tap();await expect(page.locator('.profile-chip')).toContainText('Pilot 2');
 await context.close();
});
