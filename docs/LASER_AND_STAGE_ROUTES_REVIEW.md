# Laser and stage-route review

The laser rule below remains current. Route directions, supply counts, concrete durability and encounter pacing are superseded by the [route encounters and supplies plan](ROUTE_ENCOUNTERS_AND_SUPPLIES_PLAN.md). The remaining route/review text records the earlier release.

## Implemented behavior
- Player pulse laser resolves ordered intersections over 60 m. It hits multiple enemies, penetrates one concrete barrier, and stops at a second. Neither concrete barrier takes laser damage, including repeated or upgraded hits. Steel and other cover stop the beam; armor and boss vulnerability remain active.
- All 16 stages / 48 levels now have route and supply configurations. Ten useful field objects and six off-road mines are generated per level. Seeded placement changes between stages and levels, while retry preserves the layout. Medical cases and shield cases have different silhouettes, symbols and colors.
- Convoys follow distance along the complete waypoint route. Short swept steps respect cover and ground units at bends, and airborne helicopters remain passable. Teleporting a convoy's Z coordinate does not complete the route. Road distance drives the objective meter.
- Road footprints are reserved before cover is built. Traversable roads are drawn as one non-overlapping surface; marked tracks provide firm traction through snow, ice, sand and marsh. New walls reuse instanced Blender geometry and switch with the existing Detailed/Low model packs.
- Ground enemies share small navigation fields. Cover destruction invalidates those fields. New enemies must have a navigable connection to the player's area, avoiding enclosed spawn pockets.

## Findings resolved before release
1. Static pickup positions and a universal northbound convoy road caused repeated layouts. Replaced them with seeded per-level supplies, northbound/southbound routes, concrete doglegs and defense supply circuits.
2. Laser selected only its first collision. Replaced this with ordered multi-target hits and explicit one-concrete penetration. Concrete stays intact under laser fire, and the obstruction order is resolved before applying damage.
3. Two pickup positions were within a fuel blast radius. Added explosive clearance and checked every real level.
4. A volcanic infantry spawn was isolated behind cover. Added navigable spawn validation; the campaign reachability regression now covers it.
5. Detour heading used reversed X/Z arguments. Corrected it and verified both a controlled concrete checkpoint and actual jungle attackers reaching the relay.
6. Southbound operations initially retained north-facing aim/camera bias, and chevrons pointed backward. Corrected the direction cues and camera lead.
7. The old snow center strip exposed dirt after routes moved. Changed the winter base to snow and retained separated road, terrain and wreck surface heights.
8. Medical symbols and labels lacked contrast on snow. Darkened the medical cross, outlined the short labels and raised cases above the track surface.
9. Activating Q could shorten a collected six-second shield. Manual activation now preserves a longer active field.

## Validation
- Laser integration cases: multiple enemies, infantry and airborne targets, repeated upgraded/unupgraded hits leaving concrete intact, second-wall stop, breaches opened by other weapons, steel, range and cleanup.
- All 48 generated and rendered layouts: exact supply composition, deterministic retry, varied seeds, spacing, spawn clearance and swept route clearance.
- All 12 escort routes: actual movement along every bend to extraction, no clipping, monotonic progress and completion within the stage time allowance.
- Health and shield cases: capped, once-only collection; full-health cases remain available; manual shielding cannot reduce the active duration.
- Existing campaign, mobile controls, aircraft traffic, terrain, salvage, rewards, shops, save migration and destruction regressions retained. Old coordinate-only fixtures now use waypoint progress; isolated firing fixtures explicitly provide a clear lane.
- Desktop 1440x900 and mobile 390x844 / 844x390 screenshots reviewed in Detailed and Low. The route overview shows alternating concrete gaps, readable road direction and distributed supplies.
- TypeScript and production build pass. All 29 Blender model pairs pass asset checks; no new downloaded assets or lights are required. The existing large-bundle advisory remains non-fatal.

## Deliberate limits
- Randomness is seeded by stage and level, not rerolled on every retry. Field boxes do not grant permanent ownership or replay credits.
- Only the player pulse laser receives this penetration rule; enemy laser bosses retain their warned, cover-blocked attack.
- The laser adds no damage cracks to concrete. Other hit effects and debris remain inexpensive visual feedback. No persistent physics rubble or additional dynamic lighting is introduced.
- Automated mobile checks use browser emulation and software rendering; they verify layout and logic, not frame rate on a physical phone.

## Local release result

All 149 local regressions are verified: 148 passed in the complete run; the remaining single-wall boss fixture was corrected to isolate its intended cover and passed on rerun. Production build, asset checks and whitespace checks pass. GitHub Pages deployment requires all eight CI shards, the production build and the Pages publish job to succeed.

## Concrete rule revision

The requested follow-up removes concrete damage from the pulse laser while retaining one-barrier penetration and the second-barrier stop. The obsolete hit counter and crack geometry have been removed. Manual, pickup radio, shop text and this plan now describe penetration without destruction. Regression coverage includes mixed concrete types, repeated boosted shots, already-damaged stone, targets before/between/after barriers, and existing non-laser stone damage.

Revision validation: production build and 29 focused combat, cover, route, aircraft and environment regressions pass.
