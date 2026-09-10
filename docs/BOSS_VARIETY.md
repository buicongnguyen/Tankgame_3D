# Boss variety: models and encounters

## 2D comparison

The 2D campaign defines Rail Titan (Fortress Core) and Iron Sovereign (final operation) in `src/game/data/stages.ts`, with different health and fire-rate settings. Its damage logic also reduces damage while a boss is not exposed. The 3D version previously used one scaled-up tank and a faster firing rate below half health.

## Playable additions

| Boss | Operation | Model and attack | Counterplay |
| --- | --- | --- | --- |
| Rail Titan | 6 — Last Signal | Twin-rail tracked platform; 800 health. Charges a locked firing line for 1.4 seconds, then fires a 52 m rail shot. | Sidestep after targeting locks or use cover; attack during recovery. |
| Tempest Carrier | 7 — River Run | Twin-pod missile carrier; 850 health. Marks three fixed 4.5 m blast circles for 1.6 seconds before impact. | Leave the red circles; they do not track your movement after locking. |
| Iron Sovereign | 9 — Ridge Watch | Six-legged walker; 1,050 health. Repositions sideways, charges for one second and fires a three-shell spread. | Keep moving across the firing direction, use cover, and strike its core during recovery. |

Every attack is followed by a 2.4-second exposed-core window. Boss damage multiplier is 0.65 while armored and 1.75 while exposed, in addition to directional armor. Below half health, the interval before the next charge shortens from 2.2 to 1.2 seconds; warning and recovery durations remain unchanged. The HUD names the boss, shows its health percentage and identifies ARMORED, ATTACK INBOUND or CORE EXPOSED.

Rail Titan remains the original campaign boss objective. Tempest is one of River Run's six armored targets. Iron Sovereign is a supporting threat during Ridge Watch's 45-second defense; destroying it is helpful but not a separate victory requirement. The campaign remains nine operations, preserving existing saves and rewards.

## Reusable Blender kit

Run `tools/blender/build_bosses.py` through Blender to regenerate:

- `public/models/boss-rail.glb` and editable `assets/blender/boss-rail.blend`
- `public/models/boss-missile.glb` and editable `assets/blender/boss-missile.blend`
- `public/models/boss-walker.glb` and editable `assets/blender/boss-walker.blend`

All rigs preserve Hull, Turret, Muzzle and Core names; the walker has six leg pivots. Combined runtime size is 115,232 bytes. Boss wrecks retain their own model instead of becoming ordinary tank wrecks. These assets can be reused for future encounters. Tempest and the walker design are new 3D interpretations, not exact copies of 2D artwork.

## Verification

Tests cover all three model assignments, attack warnings, dodging after lock-on, exposed-core damage, rail cover protection, walker spread, cancelling missile markers on death, model-specific wrecks, mission reset and compact boss readouts. Screenshots of all three rendered bosses were inspected. Models pass the Blender GLB geometry-budget checks. Physical-phone performance remains unmeasured.

Validation result: all 35 local regression tests passed. The focused three-boss suite passed again after final presentation changes, and the TypeScript/Vite production build passed. All 17 runtime models passed asset validation.

