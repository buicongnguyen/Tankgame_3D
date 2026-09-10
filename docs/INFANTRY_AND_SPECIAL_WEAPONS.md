# Infantry and collectible heavy weapons

## 2D features adapted

The 2D source defines `rifleman` and `rocketeer` infantry in `src/game/types.ts`. This expansion adds both roles as visible, animated Blender models to the 3D campaign. It does not add the 2D player-infantry mode or enterable house garrisons.

## Infantry

- Four soldiers support the first two operations; six support later operations, alternating riflemen and rocketeers.
- Soldiers advance and reposition, aim at the player or nearby defended/escorted objectives, and fire only with a clear line of sight. Existing threat lines warn of attacks.
- Riflemen have 35 health and rapid, light shots. Rocketeers have 55 health and slower explosive shots. Neither receives tank directional-armor protection.
- Soldiers use smaller movement/projectile collision radii and animated legs. Defeat hides the soldier with a dust effect; no tank wreck is generated.
- Tank-elimination missions retain their original vehicle target counts. Infantry are supporting threats; they can contest a relay and can be killed by normal guns, the laser, rockets, mines and artillery.

## Map weapons

Every operation includes a cyan LASER cache near (-10, 35) and a purple ARC ROCKET cache near (10, 35). They are also marked on the minimap. Driving over a cache collects it, equips the weapon and shows a short instruction. Each cache is collected once per mission attempt.

| Weapon | Ammunition | Behavior |
| --- | --- | --- |
| Pulse laser | 12 shots | Immediate 60 m beam; 150 base damage per shot; 0.6 s base reload. Hits the first enemy or cover. Permanent cover stops it; destructible cover takes damage. |
| Arc rocket | 6 rounds | Travels to the aimed point, up to 45 m away, along a visible 1.5 s arc with a 16 m lift. Ignores cover while airborne, then explodes within a marked 7 m radius for 170 base damage. Splash can also hurt the player or convoy. |

Power/reload upgrades apply. Weapons appear in the chooser as slots 4 and 5; they remain unavailable until collected. Remaining ammo appears in the weapon panel and chooser. Empty ammunition returns selection to the cannon. The original three weapons and progression remain intact. Special ammunition resets on retry or mission change; it is not a persistent unlock.

## Art and runtime

`tools/blender/build_infantry.py` generates `rifleman.glb` and `rocketeer.glb`, with editable `.blend` sources under `assets/blender`. Runtime pivots retain Hull, Turret, Muzzle and independent legs. Combined GLB size is 37,464 bytes. Laser beams and arc markers/projectiles are created by Three.js and explicitly disposed on expiry or mission reset. No external art service is required.

## Checks

Regression tests cover soldier movement and shooting, health/death behavior, objective accounting, map collection, ammo consumption, laser occlusion, an arc projectile clearing a wall and striking the tank behind it, reset cleanup, and five-choice touch UI. Existing campaign, terrain, artillery and joystick regressions remain enabled. Physical-phone performance is still unmeasured.

Validation result: production build and all 14 Blender GLB checks passed. Of 32 browser/regression cases, 31 passed in the full run; the remaining case encountered a local ERR_NO_BUFFER_SPACE navigation error and passed on immediate targeted rerun.

