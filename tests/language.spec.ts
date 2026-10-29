import {test,expect,type Page} from '@playwright/test';

async function open(page:Page,language?:string){
 if(language)await page.addInitScript(value=>{if(!sessionStorage.getItem('language-seeded')){localStorage.setItem('steel-front-language-v1',value);sessionStorage.setItem('language-seeded','1');}},language);
 await page.goto('/?e2e');await page.locator('#game-language').waitFor();
 await page.evaluate(()=>{(window as any).__steel.frame=()=>{};});
}
const save=(page:Page)=>page.evaluate(()=>JSON.stringify((window as any).__steel.save));

test('opening language choice translates in place, keeps progress and persists across reloads and profiles',async({page})=>{
 await open(page);const before=await save(page);
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.locator('.mission-setup>summary').click();
 await page.locator('#game-language [data-language="vi"]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','vi');
 await expect(page.locator('[data-action=deploy]')).toContainText('XUẤT KÍCH');
 await expect(page.locator('.briefing h2')).toHaveText('Bình minh');
 await expect(page.locator('[data-action=difficulty][data-value=easy]')).toHaveText('Dễ');
 expect(await save(page)).toBe(before);
 await page.reload();await page.locator('#game-language').waitFor();
 await expect(page.locator('#game-language [data-language="vi"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.profile-chip').click();await page.locator('[data-action=profile-use][data-value="1"]').click();
 await expect(page.locator('#game-language [data-language="vi"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#game-language [data-language="en"]').focus();await page.keyboard.press('Enter');
 await expect(page.locator('#game-language [data-language="en"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#game-language [data-language="vi"]')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-action=deploy]')).toContainText('DEPLOY');
 await expect(page.locator('.briefing h2')).toHaveText('First Light');
 await page.locator('.mission-setup>summary').click();await page.locator('[data-action=difficulty][data-value=hard]').click();
 await expect(page.locator('[data-action=difficulty][data-value=hard]')).toHaveAttribute('aria-pressed','true');
});

test('language changes during pause preserve combat state, controls, weapon nodes and pickup textures',async({page})=>{
 await open(page);await page.locator('[data-action=deploy]').click();await page.locator('#pause').click();
 const before=await page.evaluate(()=>{const g=(window as any).__steel;g.player.hp-=123;g.elapsed=42;const state={hp:g.player.hp,elapsed:g.elapsed,save:JSON.stringify(g.save),position:g.player.visual.root.position.toArray()};
  (window as any).oldPicker=document.querySelector('#weapon-picker');(window as any).oldTextures=g.world.activities.flatMap((a:any)=>a.mesh.children.filter((c:any)=>c.userData.activityLabel).map((s:any)=>({sprite:s,map:s.material.map,version:s.material.map.version})));
  return state;});
 await page.locator('#pause-language [data-language="vi"]').click();
 await expect(page.locator('#weapon-label')).toContainText('Pháo 120 mm');
 await expect(page.locator('[data-action=resume]')).toContainText('TIẾP TỤC');
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {hp:g.player.hp,elapsed:g.elapsed,save:JSON.stringify(g.save),position:g.player.visual.root.position.toArray()};})).toEqual(before);
 expect(await page.evaluate(()=>document.querySelector('#weapon-picker')===(window as any).oldPicker)).toBe(true);
 expect(await page.evaluate(()=>(window as any).oldTextures.length>0&&(window as any).oldTextures.every((entry:any)=>entry.map===entry.sprite.material.map&&entry.map.version>entry.version))).toBe(true);
 // Stable HUD updates must not replace text every frame just because its source is English.
 expect(await page.evaluate(async()=>{let changes=0;const observer=new MutationObserver(r=>changes+=r.length);observer.observe(document.querySelector('#weapon-label')!,{subtree:true,childList:true,characterData:true});for(let i=0;i<100;i++)(window as any).__steel.updateHud();await Promise.resolve();observer.disconnect();return changes;})).toBe(0);
 await page.locator('#pause-language [data-language="en"]').click();await expect(page.locator('#weapon-label')).toContainText('120 mm cannon');
 await page.locator('[data-action=resume]').click();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');
 await page.keyboard.press('KeyQ');expect(await page.evaluate(()=>(window as any).__steel.shieldTime)).toBeGreaterThan(0);
});

test('Vietnamese shop purchases, profile names and leaderboard filters retain their original data',async({page})=>{
 await open(page,'vi');
 await page.evaluate(async()=>{const g=(window as any).__steel;g.save.credits=1000;await g.persist();await g.renameProfile(0,'Shield');g.showMenu();});
 await expect(page.locator('.profile-chip strong')).toHaveText('Shield');
 await expect(page.locator('.profile-chip')).toHaveAttribute('aria-label',/Shield/);
 await page.locator('[data-action=shop]').click();await page.locator('[data-action=buy-weapon][data-value="3"]').click();
 expect(await page.evaluate(()=>{const g=(window as any).__steel;return {credits:g.save.credits,weapons:g.save.weapons,equipped:g.save.equippedWeapon};})).toEqual({credits:640,weapons:[3],equipped:3});
 await expect(page.locator('[data-weapon-card="3"]')).toContainText('Laser xung');
 await page.locator('[data-action=shop-tab][data-value=skins]').click();await expect(page.locator('[data-action=skin-buy][data-value=quartermaster]')).toHaveAttribute('aria-label','Mua và trang bị Quân nhu, giá 550 tín dụng');
 await page.locator('[data-action=shop-back]').click();await page.locator('.profile-chip').click();
 await expect(page.locator('.profile-card').first().locator('h2')).toHaveText('Shield');
 await page.locator('[data-action=profile-reset][data-value="0"]').click();await expect(page.locator('.profiles-panel h1')).toHaveText('Chơi lại Shield từ đầu?');
 await page.locator('[data-action=profiles]').click();await page.locator('[data-action=menu]').last().click();
 await page.evaluate(async()=>{const {recordRun}=await import('/src/three/leaderboard.ts');recordRun(0,0,'easy',60,90,100,'Shield');});
 await page.locator('.dock-more>summary').click();await page.locator('[data-action=leaderboard]').click();await expect(page.locator('#rank-name')).toHaveValue('Shield');
 await expect(page.locator('#rank-list tbody tr td').nth(1)).toHaveText('Shield');
 await expect(page.locator('#rank-mode')).toHaveValue('easy');await expect(page.locator('#rank-mode option[value=easy]')).toHaveText('dễ');
 await page.locator('#rank-mode').selectOption('hard');await expect(page.locator('#rank-list')).toContainText('Hoàn thành một nhiệm vụ');
});

test('tutorial prompts, skirmish setup and stage rewards are translated',async({page})=>{
 await open(page,'vi');await page.locator('[data-action=training]').first().click();
 await page.evaluate(()=>(window as any).__steel.updateHud());
 await expect(page.locator('#lesson-hint')).toHaveText('➜ Giữ WASD hoặc phím mũi tên để di chuyển.');
 await page.evaluate(()=>{const g=(window as any).__steel;g.startTraining(1);g.training.moved=g.training.collected=true;g.weaponPickerOpen=true;g.updateHud();});
 await expect(page.locator('#lesson-hint')).toHaveText('➜ Nhấn phím 4 hoặc chọn 4 · LASER.');
 await page.evaluate(()=>{const g=(window as any).__steel;g.leaveTraining();g.showSkirmishSetup();});
 await expect(page.locator('[data-action=sk-start]')).toContainText('BẮT ĐẦU CHUỖI TRẬN');
 await page.locator('[data-action=sk-field][data-value="1"]').click();await expect(page.locator('.skirmish-panel')).toContainText('quân viện binh đường không');
 await page.locator('[data-action=menu]').click();await page.locator('[data-action=deploy]').click();
 await page.evaluate(()=>{const g=(window as any).__steel;g.player.hp=g.player.max*.5;g.elapsed=40;g.complete();g.step(2);});
 await expect(page.locator('.stage-rating')).toHaveAttribute('aria-label','2 trên 3 sao');
 await expect(page.locator('.pause-panel h1')).toHaveText('Hoàn thành nhiệm vụ');
 await expect(page.locator('.stage-rating small')).toHaveText('Đánh giá theo giáp · 2 sao khi còn 40% · 3 sao khi còn 75%');
 expect(await page.evaluate(()=>(window as any).__steel.stageResult.total)).toBeGreaterThan(0);
});

test('all campaign story variants and composed stats have Vietnamese coverage',async({page})=>{
 await open(page,'vi');
 const result=await page.evaluate(async()=>{
  const {setLanguage,t,translationGaps}=await import('/src/three/i18n.ts');const {MISSIONS,levelMission}=await import('/src/three/campaign.ts');const {WEAPONS}=await import('/src/three/armory.ts');const {SKINS}=await import('/src/three/skins.ts');setLanguage('vi',false);
  for(let i=0;i<MISSIONS.length;i++)for(let level=0;level<3;level++){const m=levelMission(i,level);for(const key of ['name','sector','briefing','radio','debrief','objective'])t(m[key]);}
  for(const w of WEAPONS){t(w.name);t(w.label);t(w.description);}for(const skin of SKINS)t(skin.bonus);
  const {SkirmishSession,skirmishResult,skirmishFailed,TEAMS}=await import('/src/three/skirmish.ts');const {setHtml}=await import('/src/three/i18n.ts');
  for(let teams=1;teams<=4;teams++)for(let field=0;field<2;field++){const session=new SkirmishSession({maps:[0],teams,speed:1,size:1,field});const mission=session.mission(0);t(mission.briefing);t(mission.radio);t(mission.objective);session.records=[{map:0,seconds:90,hull:80,tanks:3,infantry:8}];const node=document.createElement('div');setHtml(node,skirmishResult(session));setHtml(node,skirmishFailed(session));}
  for(const a of TEAMS)for(const b of TEAMS)if(a!==b)t(a.name+' and '+b.name+' are closing from both flanks.');
  return {gaps:[...translationGaps].filter(s=>!['IVO','MARA','LASER','Sovereign'].includes(s)),labels:[t('3 battlefields · 2 AI teams · Normal speed'),t('+18% movement speed'),t('Equip next sortie · C / 1–9 to switch.'),t('Buy and equip Quartermaster for 550 credits'),t('Profile 1 of 3: Shield · FIRE. Switch or start a new game')]};
 });
 expect(result.gaps).toEqual([]);
 expect(result.labels).toEqual(['3 chiến trường · 2 đội AI · Tốc độ Thường','+18% tốc độ di chuyển','Trang bị cho lần xuất kích tới · C / 1–9 để đổi súng.','Mua và trang bị Quân nhu, giá 550 tín dụng','Hồ sơ 1/3: Shield · FIRE. Đổi hồ sơ hoặc chơi mới']);
});

test('unsupported stored language falls back to English; blocked storage still allows switching for this session',async({page})=>{
 await open(page,'fr');await expect(page.locator('#game-language [data-language="en"]')).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
 await page.locator('#game-language [data-language="vi"]').click();await expect(page.locator('[data-action=deploy]')).toContainText('XUẤT KÍCH');
 await page.locator('[data-action=shop]').click();await expect(page.locator('.depot-panel h1')).toHaveText('Cửa hàng dã chiến');
});

for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`Vietnamese menu, shop and touch HUD fit ${viewport.width}×${viewport.height}`,async({browser})=>{
 const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page,'vi');
 await expect(page.locator('#game-language').getByRole('button',{name:'English',exact:true})).toBeVisible();await expect(page.locator('#game-language').getByRole('button',{name:'Tiếng Việt',exact:true})).toBeVisible();
 const choices=await page.locator('#game-language button').evaluateAll(buttons=>buttons.map(button=>({height:button.getBoundingClientRect().height,size:parseFloat(getComputedStyle(button).fontSize)})));for(const choice of choices){expect(choice.height).toBeGreaterThanOrEqual(44);expect(choice.size).toBeGreaterThanOrEqual(16);}
 await page.locator('#game-language [data-language="en"]').tap();await expect(page.locator('html')).toHaveAttribute('lang','en');await page.locator('#game-language [data-language="vi"]').tap();await expect(page.locator('html')).toHaveAttribute('lang','vi');
 const picker=await page.locator('#game-language').boundingBox();expect(picker!.height).toBeGreaterThanOrEqual(44);expect(picker!.y+picker!.height).toBeLessThan(viewport.height);expect(picker!.x+picker!.width).toBeLessThanOrEqual(viewport.width);
 const noOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#overlay')!.scrollWidth<=document.querySelector('#overlay')!.clientWidth)).toBe(true);
 await noOverflow();await page.screenshot({path:`test-results/language-menu-${viewport.width}.png`});
 await page.locator('[data-action=shop]').click();await noOverflow();await page.screenshot({path:`test-results/language-shop-${viewport.width}.png`});
 await page.locator('[data-action=shop-back]').click();await page.locator('[data-action=training]').first().click();await page.evaluate(()=>(window as any).__steel.updateHud());
 await expect(page.locator('#lesson-hint')).toHaveText('➜ Kéo cần trái để di chuyển theo mũi tên.');await noOverflow();await page.screenshot({path:`test-results/language-training-${viewport.width}.png`});
 await page.locator('#pause').click();await noOverflow();await expect(page.locator('#pause-language [data-language="vi"]')).toHaveAttribute('aria-pressed','true');await page.locator('#pause-language [data-language="en"]').click();await page.locator('[data-action=resume]').click();await expect(page.locator('body')).toHaveAttribute('data-phase','playing');expect(errors).toEqual([]);await context.close();
});

test('unknown copy stays literal and changing language restores text without changing markup',async({page})=>{
 await open(page,'vi');
 const result=await page.evaluate(async()=>{
  const {t,setLanguage,setText,setHtml,translateTree}=await import('/src/three/i18n.ts');
  const unknown=['constructor','toString','hasOwnProperty'].map(t),root=document.createElement('div');
  setHtml(root,'<button aria-label="Pause game">PAUSE <span translate="no">Shield</span></button><input value="Shield">');
  const button=root.querySelector('button'),input=root.querySelector('input');
  setLanguage('en',false);translateTree(root);const restored=root.textContent;
  setLanguage('vi',false);translateTree(root);const translated=root.textContent;
  const literal=document.createElement('span');setText(literal,'<b>New copy</b>');
  return {unknown,restored,translated,sameButton:root.querySelector('button')===button,input:input!.value,literal:literal.textContent,markup:literal.childElementCount};
 });
 expect(result).toEqual({unknown:['constructor','toString','hasOwnProperty'],restored:'PAUSE Shield',translated:'TẠM DỪNG Shield',sameButton:true,input:'Shield',literal:'<b>New copy</b>',markup:0});
});
