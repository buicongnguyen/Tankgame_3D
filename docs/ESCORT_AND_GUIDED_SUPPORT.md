# Escort pacing and guided air support

## Problems found

The transport had only 260 HP. Enemy bullets and explosions subtracted its health directly, bypassing the player's active shield. Escort enemies reused the same 17% first encounter slot as assault missions, placing them inside the extended detection ranges on introductory maps. The offensive support option dropped bombs on fixed ring coordinates, so enemies could stand between impacts or move away.

## Changes

- Give every escort transport 1,040 HP, four times its previous hull. This is the same on Easy, Normal, Hard and Crazy; the player's difficulty health settings and enemy counts remain unchanged.
- Apply the player's active shield to both vehicles, including Q/button activation and collected shield crates. Use the same duration and cooldown, show a shield around the transport, and include SHIELDED in its existing percentage readout. Route direct bullets and all explosion damage through one transport damage function.
- Keep a 36 m deployment area free of enemies. Distribute four ambush sectors over the usable route, excluding the returning start area on O loops. Keep patrol segments outside the starting area too.
- Release escort ambushes as the player/transport approaches their section, with a minimum 8 m departure and a 24 m look-ahead. Close approaches and attacks still provoke guards. O loops respect either branch choice. These rules do not change assault or uplink defense waves.
- Replace Ring Barrage with Guided Missiles in the existing Air Support picker (R, then 1; or touch). Keep Supply Drop as option 2 and retain the shared 28-second cooldown and existing supply allowances.
- Lock up to 12 missiles onto enemies within 64 m of the call position. Spread the first pass across distinct enemies; spare missiles reinforce armored targets, with a maximum of two reservations per target. Prefer engaged enemies, then nearer threats. Empty calls do not spend cooldown.
- Warn for one second, stagger launches by 0.12 seconds and home for 1.15 seconds over cover. Track moving targets and airborne helicopters. If a target dies or leaves range, retarget an eligible enemy or finish at the last known in-range position.
- Each missile delivers 180 base damage in a 6 m radius. Tank armor and boss phases still apply. Direct support blasts spare the player and transport; secondary fuel explosions retain their existing damage, so shared shielding remains useful.
- Reuse the existing Blender rocket in both graphics tiers, including its exhaust smoke. Bound active missiles to 12 and clean up markers and shared asset references on impact/retry. Pause freezes the volley.

## Validation plan

1. Check all four escort backgrounds, all three levels and all four difficulties for clear starts, preserved counts, separated sectors and valid patrols.
2. Simulate idle starts and approaches to ambushes, including both O-loop directions and later folded routes.
3. Exercise transport bullets, splash, fuel chains, shield pickups, expiration, pause and retry; check percentages and shared visuals.
4. Verify distinct locks, per-target limits, moving/dead/out-of-range targets, airborne targets, scenery splash, allied safety, cooldown and cleanup.
5. Check damage at 30/60 FPS in both detail tiers and inspect desktop, portrait and landscape controls/screenshots.
6. Run affected regressions, asset checks and production build. Review the final diff, commit/push over SSH, and verify the complete GitHub Pages workflow and published game.

## Validation completed

- All 57 final affected regressions passed. The earlier 39-test route/support review also passed before the final mission-end cleanup change.
- All 48 combinations of escort background, level and difficulty preserve enemy counts and clear deployment positions. Introductory and O-loop idle simulations remained quiet; close approaches activate ambushes, and both loop directions progress correctly.
- Shared shield tests cover direct bullets, splash, fuel chain reactions, pickups, expiration, pause and retry. Transport percentage and shield visuals are checked on desktop, portrait and landscape layouts.
- Guided missile tests cover target distribution, the two-reservation limit, moving/dead/out-of-range enemies, airborne bosses, surrounding scenery, allied safety, stable damage at 30/60 FPS in both tiers, cooldown, retry and single-award mission completion.
- Screenshots of Detailed and Low missile/shield effects were visually reviewed in all three layouts. Existing WebKit graphics and mobile control regressions passed.
- TypeScript/Vite production build and all 34 Blender asset pairs passed; no model downloads or geometry were added for this update.
- The compiled production preview passed real keyboard/touch controls at 1440×900, 390×844 and 844×390: clear escort start, shared shield, guided call, live Detailed-to-Low switch and saved settings, with no script/graphics errors, missing assets or horizontal overflow. Production screenshots were visually reviewed.
- Full CI initially exposed a coarse-grid false negative for a Mire Crossing guard between a house and crate. The guard can navigate to the player without crossing cover. The reachability check now accepts a clear tank-sized link to the grid when no sample is inside its 3 m interaction radius. A regression exercises that exact guard with actual movement; all 25 frontier tests passed. The separate landmark-placement audit also passed.
