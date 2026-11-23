import { test, expect } from '@playwright/test';

test('Overdrive stays within thumb reach and leaves the drive stick engaged', async ({browser}) => {
  const page = await browser.newPage({viewport:{width:390,height:844}, hasTouch:true, isMobile:true});
  await page.goto('/?e2e');
  await page.locator('[data-action=deploy]').waitFor();
  await page.locator('[data-language=vi]').tap();
  await page.evaluate(() => { (window as any).__steel.start(0, 2); });
  const boost = page.locator('#overdrive');
  await expect(boost).toHaveAccessibleName('TĂNG TỐC SẴN SÀNG');

  for (const [width,height] of [[320,568],[568,320],[844,390],[768,1024],[1024,768],[390,844]]) {
    await page.setViewportSize({width,height});
    const overlap = await boost.evaluate(el => {
      const b = el.getBoundingClientRect();
      const others = ['aim-pad','move-pad','auto','shield','artillery','drop','weapon','pause','minimap'];
      return {
        reachable: document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button') === el,
        inside: b.x>=0 && b.y>=0 && b.right<=innerWidth && b.bottom<=innerHeight && b.width>=44 && b.height>=44,
        overlaps: others.filter(id => {
          const a = document.getElementById(id)!.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        }),
      };
    });
    expect(overlap, `${width}×${height}`).toEqual({reachable:true, inside:true, overlaps:[]});
  }

  const stick = (await page.locator('#move-pad').boundingBox())!, button = (await boost.boundingBox())!;
  const drive = {x:stick.x+stick.width/2, y:stick.y+8, id:1};
  const tap = {x:button.x+button.width/2, y:button.y+button.height/2, id:2};
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[drive]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[drive,tap]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[tap]});
  await expect(boost).toBeDisabled();
  await expect(boost).toHaveAccessibleName('TĂNG TỐC ĐANG BẬT');
  await expect.poll(() => page.evaluate(() => {
    const g = (window as any).__steel;
    return g.input.move.z < -.5 && !g.input.touchFiring && !!g.player.visual.hull.getObjectByName('OverdriveTrail');
  })).toBe(true);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[drive]});

  // Advance only the ability clock: don't allow a live encounter to end the test during its cooldown.
  await page.evaluate(() => {
    const g = (window as any).__steel; g.elapsed += g.overdriveTime + .1; g.updateHud();
  });
  await expect(page.locator('#overdrive-state')).toHaveText(/^\d+s$/);
  await expect.poll(() => page.evaluate(() => !(window as any).__steel.player.visual.hull.getObjectByName('OverdriveTrail'))).toBe(true);
  await page.evaluate(() => {
    const g = (window as any).__steel; g.elapsed += g.overdriveCooldown + .1; g.updateHud();
  });
  await expect(boost).toBeEnabled();
  await page.close();
});

test('Overdrive keyboard shortcut respects the unlock and reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/?e2e');
  await page.locator('[data-action=deploy]').click();
  const boost = page.locator('#overdrive');
  await expect(boost).toBeHidden();
  await page.keyboard.press('v');
  expect(await page.evaluate(() => (window as any).__steel.overdriveTime)).toBe(0);
  await page.evaluate(() => { (window as any).__steel.start(0, 2); });
  await expect(boost).toBeEnabled();
  await page.keyboard.press('v');
  await expect(boost).toHaveAccessibleName('OVERDRIVE BOOSTING');
  await expect.poll(() => page.evaluate(() => {
    const trail = (window as any).__steel.player.visual.hull.getObjectByName('OverdriveTrail');
    return !!trail && trail.scale.z < .35;
  })).toBe(true);
});
