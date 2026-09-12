# Diagonal S routes and contested weapon caches

Current update: [O loops and boss reinforcements](O_LOOPS_AND_BOSS_REINFORCEMENTS.md) replaces L routes, reorders route lengths and adds three Blender bosses. The plan below records the previous release.

## Plan and behavior

1. Place laser, arc rocket and weapon-supply caches on the road, within 1.1 meters of its center and about 2–10 meters beyond a scheduled ambush anchor. Distribute them among encounter groups and keep stage/level randomness reproducible. Enemies guard these areas through combat; boxes remain collectible under fire, allowing a risky rush. Defense retains its staggered corner reinforcements.
2. Keep health, shields and repair centers 7.3–9.3 meters off the road with clear access. Preserve the difficulty counts (10/8/6/4 useful supplies) and existing salvage limits. Wreck-dropped weapons also land on a clear nearby road position.
3. Add an actual 45-degree S, uniformly scaled to 78% to fit an eight-meter road inside the arena. Its length is 302.64 meters. Use it in Homeward 2, Last Signal 3, River Run 2, Frozen Pass 2, Dune Lifeline 3, Fault Line 2 and Mire Crossing 3. Keep S, mirrored S, L, U and legacy winding alternatives.
4. Rotate the road surface and natural formation positions together. Use precise oriented corridor reservations; retain one non-overlapping road mesh at turns. Existing indestructible Blender hills/rocks form the spaces between lanes. Axis-aligned concrete checkpoint panels stay on orthogonal routes.
5. Reuse route distance for ambush activation, convoy turns, extraction, minimap and time bonuses. Preview the next twelve meters of road with a smoothly eased camera, including approaching bends. Keep both detail settings and mobile controls.

## Validation and review

Check all 192 stage/level/difficulty layouts for scarcity, spacing, cache proximity to ambushes, recovery detours and terrain clearance. Validate diagonal road coverage, narrow geometry and bounds. Build all 48 worlds and all shaped Crazy levels, test actual guard activation and cache collection, and drive all twelve escort journeys. Inspect diagonal desktop/mobile views in Detailed and Low settings. Run build, asset validation, relevant regressions and the complete GitHub Pages CI suite before checking the published release.

Initial review: 27 logic regressions passed. These cover all 192 difficulty layouts, all 48 built worlds, all 23 shaped Crazy levels, all twelve escort journeys, actual cache guard activation and one-time collection, salvage limits, concrete damage and laser penetration. The diagonal surface coverage/area check verifies continuous eight-meter lanes with no doubled road faces at bends and no mesh vertices outside arena bounds.

Code/logic review: cache placement and unit deployment now share encounter fractions. Recovery access reservations remain separate from the oriented road corridor. Collision reservations use separating-axis checks, preventing the empty bounding rectangle around a diagonal segment from removing scenery. Road vertices are generated in the route frame and rotated once, while routing, aiming and the minimap continue using world coordinates. Existing save checkpoints and difficulty counts are unchanged. Natural formations reuse instanced Blender assets; no asset download or per-frame geometry generation was added.

Build and all 29 Blender asset pairs passed validation. Desktop/mobile visual review and complete release CI follow.

The next 34 boss, terrain and desktop/mobile checks passed. Visual review found the camera still aimed toward the overall exit at bends; the camera now previews the nearby route instead. Targeted camera and presentation checks follow this correction.

All nine follow-up checks passed after the camera correction, including desktop, portrait and landscape UI, guard activation and the existing southbound start. The revised diagonal mobile screenshots were inspected in Detailed and Low modes: the tank, approaching bend and nearby enemies remain visible above the controls. Physical-phone frame rates were not measured. The production build and whitespace checks also pass. Publication remains gated on the complete 179-test CI suite and a live desktop/mobile smoke check.
