import {test,expect,type Page} from '@playwright/test';
import {freshSave,SAVE_KEY} from '../src/three/campaign';
import {PROFILES_KEY} from '../src/three/profiles';
import {PROFILE_STATE_KEY} from '../src/three/profile-storage';

const PILOT='steel-front-pilot-v1';
/** An existing single-save player: stage 6, credits, upgrades, a custom pilot name and device settings. */
const veteran={...freshSave(),training:{completed:[true,true,true],skipped:false},mission:5,level:1,cleared:freshSave().cleared.map((_,i)=>i<5),credits:4210,weapons:[1,2],upgrades:{armor:3,power:2,reload:1,engine:0,shield:0},skin:'sunburst',difficulty:'normal' as const,sound:true,low:true,graphicsChosen:true};
async function open(page:Page,book?:string){
 await page.addInitScript(([key,save,pilot,profilesKey,book])=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');localStorage.setItem(key,save);localStorage.setItem(pilot,'Nguyen');if(book!==null)localStorage.setItem(profilesKey,book);},[SAVE_KEY,JSON.stringify(veteran),PILOT,PROFILES_KEY,book??null] as const);
 await page.goto('/?e2e');await page.locator('[data-action="deploy"]').waitFor();await page.evaluate(()=>{(window as any).__steel.frame=()=>{};});
}
const state=(page:Page)=>page.evaluate(([key,stateKey])=>{const g=(window as any).__steel,saved=JSON.parse(localStorage.getItem(stateKey)??localStorage.getItem(key)!);
 return {mission:g.save.mission,credits:g.save.credits,armor:g.save.upgrades.armor,skin:g.save.skin,sound:g.save.sound,low:g.save.low,training:g.save.training.completed.some(Boolean),savedCredits:saved.credits,pilot:g.profileName(g.profiles.active),book:saved.profileBook??g.profiles};},[SAVE_KEY,PROFILE_STATE_KEY] as const);

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
 await expect(page.locator('.profile-chip')).toContainText('Nguyen');
 expect(await state(page)).toMatchObject({mission:5,credits:4210,armor:3,skin:'sunburst',savedCredits:4210,pilot:'Nguyen'});
 const book=(await state(page)).book;expect(book.active).toBe(0);expect(book.slots[0].save).toBeNull();
 expect(JSON.parse(book.slots[1].save).credits).toBe(0);
});

test('the chosen profile, its progress and names survive a reload',async({page})=>{
 await open(page);
 await page.locator('.profile-chip').click();await page.locator('[data-action="profile-use"][data-value="2"]').click();
 await expect(page.locator('.profile-chip')).toContainText('Pilot 3');
 await page.evaluate(async()=>{const g=(window as any).__steel;g.save.credits=77;await g.persist();});
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
 await expect(page.locator('.profile-card').nth(0).locator('h2')).toHaveText('Kestrel');
 expect((await state(page)).pilot).toBe('Kestrel');
 await page.locator('[data-action="profile-use"][data-value="1"]').click();await expect(page.locator('.profile-chip')).toContainText('<b>Ace</b>');expect((await state(page)).pilot).toBe('<b>Ace</b>');
});

test('resetting asks first, clears only that profile and keeps its name and device settings',async({page})=>{
 await open(page);
 await page.locator('.profile-chip').click();await page.locator('[data-action="profile-use"][data-value="1"]').click();
 await expect(page.locator('.profile-chip')).toContainText('Pilot 2');
 await page.evaluate(async()=>{const g=(window as any).__steel;g.save.credits=500;await g.persist();});
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
 await expect(page.locator('.profile-card').nth(1)).toContainText('0 CR');
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


test('migrates all legacy slots together, including an active second profile',async({page})=>{
 const book={active:1,slots:[{name:'Veteran',save:JSON.stringify({...veteran,credits:321}),played:1},{name:'Second',save:null,played:2},{name:'Third',save:JSON.stringify({...veteran,credits:987}),played:3}]};
 await open(page,JSON.stringify(book));
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return [g.profiles.active,g.save.credits];})).toEqual([1,4210]);
 await page.evaluate(()=>(window as any).__steel.persist());
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),PROFILE_STATE_KEY);
 expect(saved.profileBook.active).toBe(1);expect(saved.profileBook.slots[1].name).toBe('Nguyen');
 expect(JSON.parse(saved.profileBook.slots[0].save).credits).toBe(321);expect(JSON.parse(saved.profileBook.slots[2].save).credits).toBe(987);
 await page.reload();await page.locator('.profile-chip').waitFor();expect((await state(page)).credits).toBe(4210);
});

test('an older tab cannot overwrite a profile created in another tab',async({page,context})=>{
 await open(page);await page.evaluate(()=>(window as any).__steel.persist());
 const other=await context.newPage();await other.goto('/?e2e');await other.locator('.profile-chip').waitFor();
 await other.evaluate(async()=>{const g=(window as any).__steel;g.frame=()=>{};await g.switchProfile(1);g.save.credits=5678;await g.persist();});
 await expect(page.getByRole('button',{name:'RELOAD SAVED GAME'})).toBeVisible();
 expect(await page.evaluate(async()=>{const g=(window as any).__steel;await g.menuAction('sound');return g.persist();})).toBe(false);
 const saved=await other.evaluate(key=>JSON.parse(localStorage.getItem(key)!),PROFILE_STATE_KEY);
 expect(saved.credits).toBe(5678);expect(saved.profileBook.active).toBe(1);expect(JSON.parse(saved.profileBook.slots[0].save).credits).toBe(4210);
 await page.getByRole('button',{name:'RELOAD SAVED GAME'}).click();await expect(page.locator('.profile-chip')).toContainText('Pilot 2');expect((await state(page)).credits).toBe(5678);
 await other.close();
});

test('simultaneous saves are serialized and the stale writer is rejected',async({page,context})=>{
 await open(page);await page.evaluate(()=>(window as any).__steel.persist());
 const other=await context.newPage();await other.goto('/?e2e');await other.locator('.profile-chip').waitFor();
 // Hold the lock so both pages enqueue writes based on the same revision.
 await page.evaluate(async key=>{let acquired!:()=>void;const ready=new Promise<void>(r=>acquired=r);void navigator.locks.request(key,async()=>{acquired();await new Promise<void>(r=>(window as any).releaseSaveLock=r);});await ready;},PROFILE_STATE_KEY);
 await Promise.all([page.evaluate(()=>{const g=(window as any).__steel;g.save.credits=101;(window as any).pendingSave=g.persist();}),other.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.save.credits=202;(window as any).pendingSave=g.persist();})]);
 await page.evaluate(()=>(window as any).releaseSaveLock());
 const results=await Promise.all([page.evaluate(()=>(window as any).pendingSave),other.evaluate(()=>(window as any).pendingSave)]);
 expect(results.filter(Boolean)).toHaveLength(1);
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),PROFILE_STATE_KEY);expect(stored.credits).toBe(results[0]?101:202);
 await other.close();
});

for(const migrated of [false,true])test('full browser storage preserves '+(migrated?'atomic':'legacy')+' saves',async({page})=>{
 await open(page);if(migrated)await page.evaluate(()=>(window as any).__steel.persist());
 await page.locator('.profile-chip').click();
 const before=await page.evaluate(([key,legacyKey])=>{
  let lo=0,hi=6*1024*1024;while(lo+1<hi){const mid=Math.floor((lo+hi)/2);try{localStorage.setItem('quota-test-padding','x'.repeat(mid));lo=mid;}catch{hi=mid;}}
  localStorage.setItem('quota-test-padding','x'.repeat(lo-150));return [localStorage.getItem(key),localStorage.getItem(legacyKey)];
 },[PROFILE_STATE_KEY,SAVE_KEY]);
 await page.locator('[data-action="profile-use"][data-value="1"]').click();await expect(page.locator('#save-notice')).toContainText('previous saved profiles are safe');
 expect(await page.evaluate(([key,legacyKey])=>[localStorage.getItem(key),localStorage.getItem(legacyKey)],[PROFILE_STATE_KEY,SAVE_KEY])).toEqual(before);
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {active:g.profiles.active,credits:g.save.credits,name:g.profileName(0)};})).toEqual({active:0,credits:4210,name:'Nguyen'});
 // Retry the same visible button after freeing storage; the old profile remains available.
 await page.evaluate(()=>localStorage.removeItem('quota-test-padding'));
 await page.locator('[data-action="profile-use"][data-value="1"]').click();await expect(page.locator('.profile-chip')).toContainText('Pilot 2');await expect(page.locator('#save-notice')).toHaveCount(0);
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),PROFILE_STATE_KEY);expect(JSON.parse(saved.profileBook.slots[0].save).credits).toBe(4210);
});

test('failed reset and rename leave live and saved profiles intact',async({page})=>{
 await open(page);await page.evaluate(()=>(window as any).__steel.persist());
 const result=await page.evaluate(async key=>{
  const g=(window as any).__steel,before=localStorage.getItem(key),set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('full','QuotaExceededError');return set.call(this,k,v);};
  const renamed=await g.renameProfile(0,'Lost name'),reset=await g.resetProfile(0),inactive=await g.resetProfile(2);
  Storage.prototype.setItem=set;
  return {renamed,reset,inactive,unchanged:before===localStorage.getItem(key),credits:g.save.credits,name:g.profileName(0),empty:g.profiles.slots[2].save};
 },PROFILE_STATE_KEY);
 expect(result).toEqual({renamed:false,reset:false,inactive:false,unchanged:true,credits:4210,name:'Nguyen',empty:null});
});

test('cached older builds cannot overwrite migrated profiles through the legacy keys',async({page})=>{
 await open(page);await page.evaluate(async()=>{const g=(window as any).__steel;await g.switchProfile(1);g.save.credits=77;await g.persist();});
 await page.evaluate(([key,bookKey,pilot])=>{localStorage.setItem(key,'{}');localStorage.setItem(bookKey,'{}');localStorage.setItem(pilot,'Old tab');},[SAVE_KEY,PROFILES_KEY,PILOT]);
 await page.reload();await page.locator('.profile-chip').waitFor();
 expect(await state(page)).toMatchObject({credits:77,pilot:'Pilot 2'});
 await page.locator('.profile-chip').click();await expect(page.locator('.profile-card').nth(0)).toContainText('4,210 CR');
});

test('queued campaign saves finish before switching and names save through the leaderboard',async({page})=>{
 await open(page);await page.evaluate(async()=>{const g=(window as any).__steel;g.save.credits=9876;void g.persist();await g.switchProfile(1);});
 await page.evaluate(()=>(window as any).__steel.showMenu());
 await page.locator('[data-action="leaderboard"]').click();await page.locator('#rank-name').fill('Ace Two');await page.locator('#rank-save').click();await expect(page.locator('#rank-message')).toContainText('Name saved');
 await page.locator('#rank-back').click();await expect(page.locator('.profile-chip')).toContainText('Ace Two');
 await page.reload();await page.locator('.profile-chip').waitFor();await expect(page.locator('.profile-chip')).toContainText('Ace Two');
 await page.locator('.profile-chip').click();await expect(page.locator('.profile-card').nth(0)).toContainText('9,876 CR');
});

test('a late ordinary save cannot replace a pending profile switch',async({page})=>{
 await open(page);await page.evaluate(()=>(window as any).__steel.persist());
 const result=await page.evaluate(async key=>{
  const g=(window as any).__steel;let acquired!:()=>void,release!:()=>void;
  const ready=new Promise<void>(r=>acquired=r);
  const lock=navigator.locks.request(key,async()=>{acquired();await new Promise<void>(r=>release=r);});await ready;
  const switching=g.switchProfile(1),late=await g.persist();release();await lock;
  return {late,switched:await switching,active:g.profiles.active,stored:JSON.parse(localStorage.getItem(key)!).profileBook.active};
 },PROFILE_STATE_KEY);
 expect(result).toEqual({late:false,switched:true,active:1,stored:1});
 await page.reload();await expect(page.locator('.profile-chip')).toContainText('Pilot 2');
});

test('a failed compatibility mirror does not invalidate the committed profiles',async({page})=>{
 await open(page);
 expect(await page.evaluate(async key=>{
  const g=(window as any).__steel,set=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('full','QuotaExceededError');return set.call(this,k,v);};
  const switched=await g.switchProfile(1);Storage.prototype.setItem=set;return switched;
 },SAVE_KEY)).toBe(true);
 await page.reload();await expect(page.locator('.profile-chip')).toContainText('Pilot 2');
 await page.locator('.profile-chip').click();await expect(page.locator('.profile-card').nth(0)).toContainText('4,210 CR');
});

test('browsers without cross-tab locks cancel profile changes with a visible warning',async({page})=>{
 await open(page);
 const before=await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);
 await page.evaluate(()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}));
 await page.locator('.profile-chip').click();await page.locator('[data-action="profile-use"][data-value="1"]').click();
 await expect(page.locator('#save-notice')).toContainText('Profile changes were cancelled');
 expect(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY)).toBe(before);
 expect(await state(page)).toMatchObject({credits:4210,pilot:'Nguyen'});
});
