# Environment expansion from the 2D game

## Source review

The original `src/game/data/stages.ts` defines 15 operations: First Contact through Iron Sovereign. It uses cover clusters, stone walls, open shelters, sealed houses, mines, repair stations and armories. Supply Run and Iron Triangle include water palettes. Frozen Pass and Ridge Bombard establish winter and highland themes. `BattleScene.ts` renders the water strip as scenery; it also renders stone walls and houses and supports house garrisons.

## Implemented selection

| 2D inspiration | 3D implementation | Gameplay |
| --- | --- | --- |
| Water palettes and crossings | Animated water color, three Blender bridges and river minimap | Water reduces tank speed to 45%; bridges preserve full speed. Both friendly and hostile tanks use the same terrain rule. |
| Frozen Pass | Snow cover, sparse snowfall, pine trees and a relief convoy | Off-road snow reduces speed to 72%; cleared road stays fast. |
| Ridge Bombard | Blender rocky hills and an eastern mud patch | Hills block movement and shells; mud reduces speed to 60%. Hills are rocky obstacles, not drivable elevation. |
| Stone walls and concrete cover | Destructible stone walls plus permanent steel walls | Stone walls take 180 damage; steel and hills remain hard cover. |
| Houses | Blender brick homes with pitched roofs, windows and chimneys | Homes take 220 damage and reveal one medical pickup when destroyed. |
| Vegetation | Blender pine trees with trunk and layered foliage | Trees take 65 damage, block tanks and shells, and can be cleared. |
| Longer campaign | River Run, Frozen Pass and Ridge Watch after the original six operations | Nine operations total; assault, escort and defense recovery missions. |

The existing mines, repair pads, supply caches, explosive drums and artillery remain active alongside the new scenery. Enemy spawn placement searches for clear space when an authored location overlaps cover. Environment models are merged by material while loading to reduce draw calls. Weather particles are capped at 96 and hidden in low graphics mode. Runtime weather resources are disposed between missions.

## Blender source

`tools/blender/build_environment.py` generates six original GLBs and saves `assets/blender/meridian-environment.blend`. Rebuild with Blender in background mode, using `--python tools/blender/build_environment.py`. All six assets total 106,724 bytes. Existing tank/transport art is retained. `node tools/check-assets.mjs` validates all 12 Blender models.

## Progress and UI

Existing six-operation saves extend to nine slots without losing credits, purchases or cleared missions. A completed old campaign opens River Run. The original finale remains the valley story ending, with recovery operations available from Command. Completing Ridge Watch closes the recovery chapter. Rewards remain once per operation. The route wraps into three columns on phones, with terrain feedback sharing the existing status line.

## Verification and scope

Regression coverage includes saved-game migration, rewards, water/bridge/snow/mud traction, all nine mission spawn footprints, destructible/permanent cover, single salvage drops, three new mission outcomes and mobile scene rendering. Physical-phone performance is not measured. This is a selected expansion, not a full port of all 15 stages: infantry, house garrisons, enterable interiors and drivable height-based terrain remain future work.

Validation result: all 27 local Playwright tests passed, TypeScript/Vite production build passed, and all 12 Blender GLBs passed format and geometry-budget checks. River, winter and expanded mobile-menu screenshots were inspected.

