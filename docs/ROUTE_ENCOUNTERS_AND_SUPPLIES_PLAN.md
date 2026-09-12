# Route encounters, supply scarcity and local concrete damage

Update: [Diagonal routes and weapon caches](DIAGONAL_ROUTES_AND_WEAPON_CACHES.md) revises the distribution below: seven levels use 45° S routes, and weapons now sit on the road near ambushes. Recovery pickups retain side detours. The original plan and review below describe the earlier release.

## Intended play

A stage should remain a journey: patrols and ambushes occupy its beginning, middle and final approach. The player follows different route directions, chooses short detours for supplies, and can shoot a local opening in concrete.

## Implementation

1. Keep 48 levels and current enemy/difficulty counts. Add left-to-right zigzags in Glass Road and Citadel Dawn, and southwest-to-northeast approaches in Last Signal, Cinderfall and Dune Lifeline. Preserve defense circuits and the fixed capture/defense uplink. Update route descriptions, camera lead, extraction markers and convoy paths together.
2. Place 10 / 8 / 6 / 4 useful map supplies on Easy / Normal / Hard / Crazy. Every mode retains repair, health, shield and an anti-air weapon cache. Harder modes also reduce salvage from destroyed tanks. Keep deterministic stage seeds and separate mine placement.
3. Put supply and repair centers 7–10 meters from the route centerline, on alternating shoulders, with clear access paths. Keep their entire pickup area outside the driving lane. Reserve pads and connections before scenery, concrete and fuel are placed.
4. Split attached route concrete into independently damaged sections. A fresh section has 176 HP: four unupgraded 44-damage cannon hits. Other conventional weapons use their existing damage, and nearby explosions may damage individual sections in their radius. The player laser still penetrates one concrete barrier, stops at the second, and does no concrete damage. Breaking one section hides only that instance and opens only its collision/navigation footprint.
5. Distribute armor and infantry across route encounter zones; reserve bosses for the final approach. Dormant groups wait until the player/convoy reaches or passes their area, or someone attacks them. Defense groups instead activate in staggered perimeter waves. Show pending groups discreetly on the minimap and keep them counted for stage objectives.
6. Assault and boss stages require reaching the marked exit after their combat objective. Capture and escort retain their existing destination conditions; defense retains its timer. Keep the 0.8-second result transition and shop/rewards.

## Supply balance

| Difficulty | Useful map supplies | Salvage interval (tank kills) | Extra salvage cap |
| --- | ---: | ---: | ---: |
| Easy | 10 | 2 | 4 |
| Normal | 8 | 4 | 2 |
| Hard | 6 | 12 | 1 |
| Crazy | 4 | 32 | 1 |

Six hostile mines are placed separately. Useful supplies include weapon caches, medical cases, shields and repair centers; salvage provides weapon ammunition and only appears if a clear shoulder is available. Locations vary by stage and level but stay reproducible when retrying the same level.

## Review and validation

- Check all 48 layouts and all difficulties for supply counts, off-road collection distances, reachable access paths, route directions, open convoy corridors and separated spawns.
- Fire actual cannon and laser shots at adjacent concrete sections; verify four-hit damage, one local opening, intact neighbors, collision, navigation, Low detail swaps and restart cleanup.
- Simulate staying at the start, approaching a middle ambush, attacking a waiting group, and advancing to the final encounter. Verify later groups do not rush the opening, every group can activate, and a stage cannot finish at the start.
- Preserve health/shield behavior, defense timing, convoy movement, boss attacks, mobile controls and existing save data. Update regression fixtures only where the requested behavior changes their assumptions.
- Inspect desktop and mobile route/supply/ambush presentation in Detailed and Low modes. Build, review, commit, push over SSH and verify GitHub Pages after the complete CI suite passes.
