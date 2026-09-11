import {test,expect} from '@playwright/test';
import {rocketTarget} from '../src/three/rocket-target';
test('directional arc range adapts to nearby enemies without sideways or unsafe pulls',()=>{
 const p={x:0,z:0},aim={x:0,z:-28};
 expect(rocketTarget(p,aim,[{x:0,z:-14},{x:0,z:-35}],true)).toEqual({x:0,z:-14});
 expect(rocketTarget(p,aim,[{x:20,z:-14},{x:0,z:14},{x:0,z:-5},{x:0,z:-46}],true)).toEqual(aim);
 expect(rocketTarget(p,aim,[],true)).toEqual(aim);
 expect(rocketTarget(p,{x:0,z:-80},[],false)).toEqual({x:0,z:-45});
});
test('mouse arc target has a small assist and preserves deliberate ground targeting',()=>{
 const p={x:0,z:0};expect(rocketTarget(p,{x:1,z:-14},[{x:0,z:-14}],false)).toEqual({x:0,z:-14});
 expect(rocketTarget(p,{x:0,z:-28},[{x:0,z:-14}],false)).toEqual({x:0,z:-28});
});
test('touch aiming previews and hits the nearer target over cover; launch destination stays fixed',async({page})=>{
 await page.goto('/?e2e');await page.getByRole('button',{name:'DEPLOY'}).click();const result=await page.evaluate(()=>{const g=(window as any).__steel;g.frame=()=>{};g.player.visual.root.position.set(0,0,20);const enemy=g.makeUnit(0,6,'heavy');enemy.hp=1000;g.enemies=[enemy];g.weapon=4;g.specialAmmo[1]=3;g.input.hasTouchAim=true;g.input.aim={x:0,z:-1};g.updatePlayer(.01);const preview=g.aimPoint.clone();const radius=g.world.cursor.geometry.parameters.outerRadius*g.world.cursor.scale.x;g.shoot(g.player,true);const a=g.special.arcs[0];const target=a.target.clone();g.aimPoint.set(20,0,30);g.special.update(g,.75);const airborne=a.mesh.position.y;g.special.update(g,.76);const hit=enemy.hp<1000;g.weapon=0;g.updatePlayer(.01);return {preview:preview.z,target:target.z,radius,airborne,hit,reset:g.world.cursor.scale.x};});
 expect(result.preview).toBe(6);expect(result.target).toBe(6);expect(result.radius).toBeCloseTo(7);expect(result.airborne).toBeGreaterThan(15);expect(result.hit).toBe(true);expect(result.reset).toBe(1);
});
