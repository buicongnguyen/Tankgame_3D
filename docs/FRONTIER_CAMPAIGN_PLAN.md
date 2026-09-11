# Frontier campaign expansion

## Goal and baseline review

Expand Steel Front from nine to fourteen playable operations. Keep the existing campaign, purchased equipment, skins, credits and graphics preference. Add five recognizable places with different tactical choices, rather than recoloring the same map.

The current game already has water crossings, off-road snow, mud, destructible trees/houses, three bosses, infantry, repair centers and a persistent shop. Terrain is selected by an index array, most maps share the same scenery, capture HUD text assumes 18 seconds, reward targets cover only nine missions, and save migration accepts only six or nine stages. All of these need explicit extension. The established Low detail setting must affect decoration only: hazards, warning areas, collision and damage must remain equivalent in both modes.

## New operations

| Stage | Operation | Setting | Objective | Tactical identity | First-clear base reward |
| --- | --- | --- | --- | --- | --- |
| 10 | White Horizon | Polar ice field | Hold the research relay for 22 seconds | Blue ice sheets carry momentum; steer early, stop on exposed road, use glacier outcrops for cover | 440 CR |
| 11 | Cinderfall | Active volcanic basin | Eliminate six armored patrols | Eruption rocks land in marked danger circles and damage either side; lure armor into impacts | 460 CR |
| 12 | Dune Lifeline | Desert settlements | Escort the relief transport through the pass | Clearly bounded sand traps slow movement to exactly one quarter; the central convoy road stays clear | 480 CR |
| 13 | Canopy Hold | Dense tropical forest | Defend the relay for 50 seconds | Broadleaf trees block shells and can be destroyed to open sight lines; enemies approach from the map corners | 500 CR |
| 14 | Citadel Dawn | Occupied city | Defeat the command Rail Titan | Streets, intersections, apartment blocks and barricades create cover and flanking choices | 600 CR |

Ridge Watch becomes the end of the existing recovery chapter, not the end of the expanded campaign. Its completion screen can remain a chapter celebration with a clear continuation to operation 10. The new final operation provides the full campaign ending. Existing fully completed nine-stage saves open White Horizon immediately. In-progress six- and nine-stage saves preserve their current checkpoint.

The story follows a newly received distress call beyond the restored Meridian network: reconnect the polar outpost, cross the volcanic basin, escort desert supplies, hold the jungle relay, and silence the city command battery. Briefings explain one local mechanic in a short sentence; longer story detail stays in the expandable briefing.

## Terrain and hazards

### Polar ice

- Author several fixed ice sheets on a pale snow field, separated by grippy road and exposed ground.
- Store their positions/radii once and use the same definitions for visual meshes, movement, HUD and minimap.
- Smooth movement velocity while on ice, producing a short, controllable slide after releasing the stick. Turret aiming stays independent and responsive.
- Restore normal grip immediately on leaving ice. Collision cancels the blocked velocity component so tanks do not vibrate against walls.
- Apply the same traction rules to moving enemies. Keep the relay and initial spawn on safe, readable ground.
- Use separated surface heights and opaque ice materials to avoid the previous snow flicker problem.

### Volcanic rockfalls

- Add a visible Blender volcano with a dark crater, lava rim and cooled rock slopes. Emissive seams on the crater slopes and drifting ash give the basin a distinct palette.
- Begin hazardous eruptions only after the operation starts, with an initial six-second grace period.
- Each rock locks its target at warning creation; it never follows a moving tank. A bright red ground ring marks its 4.5-meter impact radius for 2.6 seconds.
- Erupt every five seconds after the initial grace, with a second target on a separated enemy when available. Spawn no more than three active falling rocks. Mix targets near live combatants with open-ground impacts, constrained inside the playable map and away from the volcano body.
- Animate an arc from the crater with an ember trail. Landing applies a single 95-damage area blast with the existing falloff/shield rules to player, enemies, infantry and destructible cover. Chain reactions with fuel remain possible.
- Use short pooled impact effects and at most eight fading ground scars; no rigid-body simulation or permanent physical rubble.
- Pause freezes warning/flight timers. Failure, restart and stage completion cancel outstanding rocks. Menu scenery never deals damage.
- Warning rings and rocks remain visible in Low detail; only decorative smoke/ash density changes.

### Desert sand traps

- Add several fixed circular/elliptical pockets with darker centers and concentric wind marks, visually distinct from normal sand.
- Inside a trap, movement is multiplied by exactly 0.25, independently of the selected graphics mode. Crossing the boundary restores ordinary speed.
- Apply the modifier to enemies as well as the player. Skin speed bonuses multiply the base speed before terrain, so a faster tank is still slowed to one quarter of its usual speed.
- Keep an uninterrupted central escort route. Side caches invite deliberate detours; repair centers remain reachable without trapping the convoy.
- Show the short status `SAND TRAP · ¼ SPEED` only while inside a trap. Draw trap boundaries on the minimap.

### Jungle and city

- Jungle uses a new broadleaf tree silhouette, layered foliage, dense side groves and winding combat lanes. Trunks are destructible cover. Reserve the central relay, four approach lanes, starting footprint and service pads.
- City uses a new apartment-block kit with windows, floor belts, parapets, roof vents and entrance awnings, existing smaller houses, concrete/steel roadblocks and marked intersections.
- Keep at least tank-width clearance through the street network and multiple routes to the boss. Avoid sealed courtyards and housing on repair/weapon pads.
- Buildings remain destructible where appropriate; steel and large terrain formations retain clear indestructible behavior. Geometry detail must not change collision footprints.
- Use bounded object counts, shared materials and the existing pivot/material batching. Keep building heights suitable for the overhead camera.

## Assets and implementation structure

1. `tools/blender/build_frontier.py`: reproducible Blender kit for glacier outcrops, volcano, volcanic rock, palm, broadleaf tree and city block. Export centered GLBs and one editable source scene.
2. `tools/blender/build_low_detail.py`: regenerate matching low variants after the new kit. Retain all existing animation/attachment surfaces.
3. `src/three/model-catalog.json`: a shared asset-name list keeps the runtime loader, verification and download-count tests aligned as the kit expands.
4. `src/three/terrain.ts`: biome types, authored terrain regions, speed/traction queries and movement smoothing, shared with map rendering and tests.
5. `src/three/environment.ts` and `frontier-environment.ts`: biome-specific palettes, terrain meshes, safe scenery placement and decorative weather. Preserve the old nine layouts as far as possible.
6. `src/three/hazards.ts`: bounded eruption scheduler, warning/flight state, one-time impacts and cleanup; gameplay updates run only in active simulation.
7. `src/three/campaign.ts`: five mission definitions, explicit biome/boss metadata, migration of both historical save lengths and dynamic unlock logic.
8. `src/three/game.ts`: integrate traction, hazard updates, concise terrain status, minimap regions, general capture duration and chapter/final transitions.
9. `src/three/results.ts`: speed-bonus targets for new objectives; fixed-timer defense continues to reward hull only. Preserve first-clear-only rewards.
10. Command route adapts to fourteen entries and remains scrollable/reachable on small screens. Avoid permanent extra story panels in the battle HUD.

## Performance and fairness budgets

- New model kit should fit within the existing 3 MB detailed-model budget where practical; each new prop stays below 3,000 triangles. Document measured counts rather than claiming a phone frame rate.
- Low tier stays genuinely simpler and uses the existing reduced pixel ratio, shadows, reflection and particle limits. Essential warning rings have the same size and duration in both modes.
- A fixed number of terrain overlays and shared model geometry; no per-tree physics, real fluid simulation, dynamic terrain tessellation or per-rock point lights.
- No new damage source should appear without a readable warning. Keep spawns, relay access, service pads and convoy road clear of static blockers.
- Existing weapons, paid skins, credits and 0.8-second victory delay remain functional throughout all fourteen operations.

## Verification and release checklist

- Validate detailed/low GLBs, budgets and matching surfaces; build TypeScript/Vite.
- Test six-stage and nine-stage save migration, including completed campaigns and owned equipment; reject corrupt progression gaps.
- Check all fourteen starting layouts for unit/cover overlap and flood-fill reachability to objectives, living enemies, repair centers and weapon caches. Check the full escort corridor.
- Measure quarter-speed displacement for player/enemy on sand, normal speed outside, ice coasting/exit and collision cancellation.
- Verify rock warning delay, fixed target, damage to both sides and cover, shield interaction, exactly one impact, active-object bounds, pause/resume and cleanup on success/failure/retry.
- Exercise each new objective and the true final stage. Verify rewards and next-stage navigation, including the old chapter boundary.
- Inspect desktop and phone screenshots for all five biomes in Detailed and Low detail; verify readable terrain/hazard status and no menu/HUD overflow.
- Run the existing regression suite, including WebKit with its explicit empty launch-argument override.
- Record actual results below. Commit and publish through the established Git SSH / GitHub Pages workflow after validation, then verify the live build.

## Implementation record

Plan written before implementation. All five operations and their Blender artwork are implemented.

- Added mission metadata for biome, boss and time target; campaign and capture HUD no longer assume nine missions or an 18-second hold. Historical six- and nine-stage saves retain credits, equipment, skins, upgrades and graphics preference.
- Glacier sheets share exact bounds with the traction model and minimap. Sand applies a 0.25 multiplier to actual player/enemy movement, including speed skins. Both escort routes and service pads remain reachable.
- Rockfalls lock their target before flight, damage both sides and cover once, respect shields, pause with the game, and clear on success/failure/retry. They remain readable in Low detail.
- Review adjustments: moved the volcano into the active battlefield view; replaced ice rings with a pale rim and thin cracks; cleared generic outer props to fit more city buildings; kept new terrain patches off the central road. A 25-second simulated jungle battle checks that attackers leave the corners and approach the relay.
- Actual Blender export totals: 25 detailed models, 2,331,216 bytes and 27,384 triangles; 25 Low detail models, 1,175,396 bytes and 9,059 triangles (67% fewer). Existing 3 MB / 1.2 MB tier limits are unchanged.
- Fifteen frontier integration checks cover migration, rewards, all fourteen spawns, reachability, sand/ice movement, rockfall scheduling/damage/lifecycle, objectives, phone graphics switching and desktop views. The full 86-test run passed 85 tests and found one obsolete 19-model download expectation. That check now reads the shared 25-model catalog and passed on its targeted rerun. The production TypeScript/Vite build and both-tier asset validation passed. Publication uses the existing Git SSH remote and Pages workflow, whose own full-suite verification gates deployment.

Physical-phone frame rate and thermal behavior still require hardware measurements. The battlefield uses a flat gameplay plane with 3D scenery; this expansion does not add terrain climbing or full physical terrain simulation.
