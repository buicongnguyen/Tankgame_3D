import { test, expect } from '@playwright/test';
import { SAND, MUD, ICE, tractionMotion } from '../src/three/terrain';

test('Overdrive escapes traps without changing ice grip or enemy recovery', () => {
  function distance(biome: Parameters<typeof tractionMotion>[0], p: {x:number;z:number}, pace: 'standard'|'overdrive'|'enemy', recovery=false) {
    return tractionMotion(biome,p,{x:0,z:0},1,0,.1,recovery,pace).x;
  }
  expect(distance('desert',SAND[0],'standard')).toBeCloseTo(.7);
  expect(distance('marsh',MUD[0],'standard')).toBeCloseTo(.55);
  expect(distance('marsh',MUD[0],'standard',true)).toBeCloseTo(.65);
  expect(distance('marsh',MUD[0],'overdrive',true)).toBeCloseTo(1.5);
  expect(distance('desert',SAND[0],'overdrive')).toBeCloseTo(1.5);
  expect(distance('desert',SAND[0],'enemy')).toBeCloseTo(.25);
  expect(distance('marsh',MUD[0],'enemy')).toBeCloseTo(.18);
  expect(distance('glacier',ICE[0],'overdrive')).toBeCloseTo(1.5*distance('glacier',ICE[0],'standard'));
  expect(tractionMotion('glacier',ICE[0],{x:9,z:0},0,0,.1,false,'overdrive').x).toBeCloseTo(.9*Math.exp(-.4));
});

test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
for (const hazard of ['missiles','rockfall'] as const) {
  test('Overdrive escapes the '+hazard+' warning on a phone', async ({page}) => {
    const before = process.env.STEEL_ORIGINAL === '1';
    await page.goto('/?e2e');
    await page.getByRole('button',{name:'DEPLOY'}).click();
    await page.evaluate(hazard=>{
      const g=(window as any).__steel;
      g.frame=()=>{};
      g.save.difficulty='normal';
      g.start(hazard==='missiles'?6:10,2);
      g.clearOpening();
      for(const e of g.enemies) {e.dead=true;e.visual.root.visible=false;}
      g.world.covers=[];
      g.shieldTime=g.deployShieldUntil=0;
      g.player.visual.root.position.set(0,0,30);
      if(hazard==='missiles'){
        const boss=g.makeUnit(0,0,'boss','missile');
        g.enemies=[boss];
        g.bosses.update(g,boss,4.1);
        const s=g.bosses.states.get(boss);
        if(s.phase!=='charging') throw Error('Boss warning missing');
        g.bosses.update(g,boss,s.time-.87);
      } else {
        g.hazards.clock=99;
        if(!g.hazards.warn(g,{x:0,z:30})) throw Error('Rockfall warning missing');
        g.hazards.update(g,2.6-.4);
      }
      g.updateHud();
      g.world.update(1,g.player.visual.root.position,false);
    },hazard);
    await page.locator('#title-card').waitFor({state:'hidden'});
    const dir=process.env.STEEL_SCREENSHOTS;
    if(dir) await page.screenshot({path:dir+'/'+(before?'before':'after')+'-'+hazard+'-warning.png'});
    if (!before) await page.locator('#overdrive').tap();
    const result=await page.evaluate(({hazard})=>{
      const g=(window as any).__steel, hp=g.player.hp, startZ=g.player.visual.root.position.z;
      const duration=hazard==='missiles'?.87:.4;
      g.input.move={x:0,z:1};
      for(let i=0;i<Math.ceil(duration*60)+1;i++){
        g.elapsed+=1/60;
        g.updatePlayer(1/60);
        if(hazard==='missiles') g.bosses.update(g,g.enemies[0],1/60);
        else g.hazards.update(g,1/60);
      }
      g.updateHud();
      g.overdriveTrail?.update(g.player.visual.hull,g.overdriveTime,g.player.velocity.x,g.player.velocity.z);
      g.world.update(1,g.player.visual.root.position,false);
      return {hpLost:hp-g.player.hp,distance:g.player.visual.root.position.z-startZ,impact:hazard==='missiles'?g.bosses.states.get(g.enemies[0]).markers.length===0:g.hazards.rocks.length===0};
    },{hazard});
    console.log(hazard, result);
    expect(result.impact).toBe(true);
    if(before) expect(result.hpLost).toBeGreaterThan(0);
    else expect(result.hpLost).toBe(0);
    if(dir) await page.screenshot({path:dir+'/'+(before?'before':'after')+'-'+hazard+'-escape.png'});
  });
}


test('a Normal missile boss can be defeated with the stock cannon while dodging telegraphs', async ({page})=>{
  await page.goto('/?e2e');
  await page.getByRole('button',{name:'DEPLOY'}).click();
  const outcome=await page.evaluate(()=>{
    const g=(window as any).__steel;
    g.frame=()=>{};
    g.save.difficulty='normal';
    g.start(6,2); g.clearOpening();
    for(const unit of g.enemies) unit.visual.root.visible=false;
    g.world.covers=[];
    const boss=g.makeUnit(0,0,'boss','missile');
    g.enemies=[boss];
    const p=g.player.visual.root.position;
    p.set(0,0,22);
    g.shieldTime=g.deployShieldUntil=0;
    g.weapon=0;
    let direction=1, activations=0, warnings=0, lastPhase='';
    for(let i=0;i<60*180 && !g.player.dead && !boss.dead;i++){
      const dt=1/60;
      g.elapsed+=dt;
      g.bosses.update(g,boss,dt);
      const phase=g.bosses.states.get(boss)?.phase;
      if(phase==='charging' && phase!==lastPhase){
        warnings++;
        if(g.overdriveCooldown===0){g.action('overdrive');activations++;}
      }
      lastPhase=phase;
      if(p.x>26) direction=-1; else if(p.x< -26) direction=1;
      g.moveUnit(g.player,9*direction*dt,0,dt);
      g.player.aim=Math.atan2(boss.visual.root.position.x-p.x,boss.visual.root.position.z-p.z);
      g.reload=Math.max(0,g.reload-dt);
      g.action('fire');g.updateShots(dt);
    }
    return {won:boss.dead,alive:!g.player.dead,shots:g.shotsFired,warnings,activations};
  });
  console.log('Missile duel',outcome);
  expect(outcome.won && outcome.alive).toBe(true);
  expect(outcome.warnings).toBeGreaterThan(0);
  expect(outcome.activations).toBeGreaterThan(0);
});
