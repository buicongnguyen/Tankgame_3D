# Campaign expansion: code, logic and visual review

## Delivered behavior

Sixteen stages now each have Approach, Counterattack and Command battle levels, for 48 levels. Normal keeps base armored patrol counts; the requested additional soldiers are included in all modes. Easy supplies 150% hull with the same army size, Hard doubles regular armor/infantry and reinforcement batches, and Crazy quadruples them. Finale boss counts are 1 / 1 / 2 / 4. Enemy damage and the player's standard hull remain unchanged on Normal, Hard and Crazy.

Every third level requires its normal objective plus all bosses. Former boss stages begin with two patrol battles. Counterattack alters approach positions and extends timed objectives by 20%. The shop, 0.8-second destruction/result delay and hull/time bonuses apply after every level. The first-clear base award is 65%, 80% or 100% of the stage reward, according to level.

Fault Line adds a 1.4-second warning followed by a 1.6-second earthquake. Ground tanks and the escort transport stop; weapons, infantry and airborne helicopters keep operating. Rising pooled dust identifies the event. Pause freezes the hazard clock. Mire Crossing adds seven visible mud holes: 18% traction, visual hull sinking and periodic 65% traction recovery so continuous steering can escape. Its convoy road stays firm.

The Blender kit adds Sky Wraith (helicopter), Rift Stalker (eight-legged spider), Prism Reaper (laser tank) and snow-white pines. The original three boss types remain. White Horizon has 15 ice regions; Dune Lifeline has 12 sand traps; Canopy Hold has more than 58 destructible trees; Citadel Dawn has more than 20 buildings/houses. Frontier fuel crates exceed eight per tested layout, with a ceiling of fourteen. Tree height and orientation vary without changing collision footprints.

## Review findings and corrections

| Area | Finding and correction | Evidence |
| --- | --- | --- |
| Briefing and radio | Counterattack cues used original durations, and early levels mentioned absent bosses. Runtime radio now uses the selected level; boss-only instructions appear in Command battle. | Timed capture/defense text, early/finale boss descriptions and deployed radio regression. |
| Checkpoints and rewards | Explicit stage/level checkpoint prevents skipping levels or farming replay rewards. Completed historical stages remain available; old purchases, credits and settings survive migration. | All 48 sequential checkpoint/reward configurations; historical 6/9/14-stage saves; reload and shop checks. |
| Difficulty validation | Object prototype property names could masquerade as aliases. Aliases now require an own property; invalid values reset safely. | Invalid `__proto__`, `constructor` and unknown modes rejected. |
| Multiple bosses | State, warnings, weak points and cleanup belong to each unit. No finale completes while any boss survives. | Exact Crazy counts on eight stage configurations; four-boss finish gate and 0.8-second delay. |
| Helicopter landing | Two aircraft could reserve the same point and block each other. Landing selection now reserves separate free zones. | Reproduced zero separation before the fix; regression requires more than six meters. |
| Helicopter pursuit | An aircraft could reach an obsolete waypoint and stop pursuing a distant player. It now selects a fresh waypoint toward the player. | Reproduced stationary pursuit; regression verifies distance closes. |
| Spider rest | A spider could keep circling dense cover and never expose its core. Its attack clock continues while climbing, then it seeks clear footing to attack and rest. | Dense-cover simulation reaches a grounded exposed phase. |
| Aircraft damage | Ordinary ground projectiles and proximity mines should not hit flying aircraft. Airborne helicopters ignore them; lasers and arc rockets hit; landed helicopters accept ordinary gunfire. Wrecks fall to ground. | Real cannon, mine, laser, arc rocket and wreck integration checks. |
| Laser boss | Attack must be warned and finite, with usable cover. The heading locks during the warning; a bounded burst respects the nearest solid cover and ends in vulnerability. | Warning, cover blocking, actual damage, beam bounds and cooldown integration check. |
| Dense scenery | Additional cover must not seal spawn points, service pads or the escort road. Layout reservations and bounded safe-position searches keep these routes usable. | Player/enemy overlap checks, route flood-fill across all 16 stages, jungle defense approach check. |
| Terrain depth | Expanded pools can overlap. Each region uses a distinct shallow elevation, with rims/ripples above it and below the 0.14-meter wreck scorch height. Activity markers sit above the terrain. | Existing snow/ice wreck stability tests pass in both detail tiers. |
| Hazards | Quakes must release movement and reset across missions; mud must permit escape. Ground movement and hazard clocks explicitly respect pause/mission state. | Lock duration, enemy/player freeze, pause, reset, sinking, recovery and escape checks. |
| Quality switching | New rotor/leg meshes must remain attached to animated pivots when batching or swapping tiers. Rotor names are preserved with existing limbs, turret and core. | All three new rigs retain references, animation geometry and boss state across both swaps. |
| Mobile HUD | A narrow desktop viewport does not activate touch CSS. The Crazy city visual fixture now uses actual touch emulation and asserts both sticks are visible. | 390 × 844 touch screenshot; mode/level selectors also tested at 390 and 844 pixels. |

## Validation

- TypeScript and production build: passed locally.
- Blender validation: 29 models, matching Detailed/Low rigs, all geometry and payload budgets passed.
- Full local sweep before the final review: 123 of 127 checks passed. The remaining four used obsolete stage-completion/reward fixtures; they were updated to clear all three levels or explicitly select Command battle, preserving their purchase and ending assertions.
- After review fixes: all 36 focused browser checks passed, including those four adapted fixtures, new bosses, campaign expansion, terrain and navigation regressions.
- The corrected touch-emulation Crazy city check also passed separately.
- Current complete collection: **133 checks in 25 files**. The existing GitHub Pages workflow runs all checks across five runners and only builds/deploys when every runner passes. Deployment status is authoritative in [GitHub Actions](https://github.com/buicongnguyen/Tankgame_3D/actions/workflows/deploy-pages.yml).
- Existing desktop/mobile input, WebKit, weapons, shops, skins, destruction and winter regression coverage remains in the release gate.

Visual inspection covered the three new boss rigs, frontier phone layouts, mode/level menus and the Crazy city touch HUD. The new assets use distinct silhouettes, material groups, structural details and animated attachments. This is detailed stylized browser artwork; it is not presented as AAA photorealism.

## Measured rendering budget

| Measure | Detailed | Low detail |
| --- | ---: | ---: |
| Complete 29-model GLB payload | 3,336,348 bytes | 1,588,460 bytes |
| Complete kit triangles | 41,130 | 11,084 |
| Helicopter triangles | 1,448 | 512 |
| Spider triangles | 2,568 | 750 |
| Laser tank triangles | 1,668 | 555 |
| White pine triangles | 1,096 | 315 |
| Sampled Crazy city frame draw calls | 895 | 177 |
| Sampled Crazy city frame triangles | 352,304 | 26,122 |

The sampled camera used a 390 × 844 touch viewport with all **68 enemies, including four bosses**, retained in both tiers. Render counters include the passes performed for that frame, including Detailed shadows. They measure rendering work, not FPS or a worst-case guarantee. Low uses 73% fewer triangles across the model catalog. No new dynamic lights, physics debris or large texture downloads were added; earthquake dust reuses the capped particle system.

## Limits and release procedure

Physical Android/iPhone frame rate and thermal behavior still require device testing, especially with four bosses. Low detail is available on the command and pause screens. Player navigation remains on a flat gameplay plane; aircraft and spiders use scripted elevation, and enemy navigation remains local steering. The three levels reuse their stage environment with encounter/objective variation; they are not 48 separate handcrafted maps.

Commit the validated source, editable Blender files, both GLB tiers, tests and documentation, then push `HEAD:main` through the existing SSH remote. Wait for the full verification/build/Pages workflow. Inspect the deployed module, stage/level selectors, new scenarios and mobile graphics switching in isolated browser contexts before reporting the release complete. The original 2D repository remains untouched.
