# Visual quality upgrade

## Scope

Improve silhouettes, mechanical credibility, material separation and lighting at the existing top-down gameplay scale. The previous assets used largely unmodified boxes and flat colors. This pass adds modeled construction details while preserving gameplay dimensions, collisions, attachment points and purchased colors.

- Tank: sloped upper armor and turret cheeks, road-wheel hubs, layered tracks, side skirts, mantlet, thermal sleeve, recessed muzzle, periscope glass, cupola, bolts, smoke launchers and radiator louvres.
- Transport: cab windows, mirrors, bumper, grille, headlamps, step, wheel hubs and cargo ribs.
- World: framed windows, sills, foundations, gutters, roof seams, chimney cap, layered pine branches, wall caps and panel rivets.
- Supplies: corner guards, plank joints and handles, recessed drum lid and filler cap, beveled gasoline cans/frame.
- Combatants: armored wheel detail, exhaust grilles, missile bores, walker joints, infantry vest, pouches and visor.
- Rockets: smoother 24-sided body and nozzle geometry, shared existing exhaust and smoke attachments.
- Lighting: less washed-out ambient light, a small 64-pixel PMREM reflection environment, differentiated metal/rubber/glass roughness, and physically lit Blender shop previews.

## Runtime constraints

Tank: 5,712 triangles versus 2,024 before. All other assets remain below 3,000 triangles each. Total 19 GLBs: 1,988,832 bytes, below the unchanged 3,000,000-byte validation limit. No downloaded texture packs, per-object dynamic lights, physics debris or postprocessing passes are added. Static meshes are batched by material within each animated pivot; named boss Core and limb groups are preserved. Low mode disables reflection lighting and shadows and reduces resolution/particles.

Browser tests verify model loading, bounded batches, preserved moving limbs and weak points, rocket exhaust, destruction, skins, all mission conditions, and mobile input/layout. Software-rendered CI gets a 120-second per-test budget and 15-second UI readiness allowance; dedicated mission finish timing tests still check the actual 0.8-second sequence. Physical-device frame rate and thermal performance require hardware testing.

## Rebuild

Run the existing Blender generators from the repository root, in this order, with Blender 4.5:

1. `tools/blender/build_assets.py`
2. `tools/blender/build_environment.py`
3. `tools/blender/build_bosses.py`
4. `tools/blender/build_infantry.py`
5. `tools/blender/build_rocket_fuel.py`
6. `tools/blender/build_skins.py`

The first five generators call `tools/blender/asset_detail.py` before export. The skin generator imports the completed tank and renders the five matching material variants. Every generator starts a clean Blender scene. Editable `.blend` sources, GLBs and previews are committed; Blender is not required for the web build. Run `npm run test:assets`, `npm run build` and `npm test` afterward.

## Honest quality target

This is a detailed, lightweight stylized 3D kit. Full AAA realism would additionally require sculpted and baked normal maps, authored wear/dirt textures, vegetation LODs, richer terrain, character animation and a larger lighting/art production effort. Those are not claimed as delivered by this pass.

## Frame-clock correction

Slower rendering exposed a queued-animation-frame timestamp that can predate the mission start/resume clock. Frame time now stays monotonic, preventing negative simulation debt, invalid camera interpolation and stalled driving/firing. A regression test supplies stale timestamps across both start and resume, then verifies movement on the next valid frame.

Quick mouse clicks are retained until the next simulation frame, then consumed once; pause, blur and input reset cancel queued shots. CI distributes the full suite across three independent runners, and the production build depends on all three passing.
