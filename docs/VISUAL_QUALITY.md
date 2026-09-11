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

Tank: 5,712 triangles versus 2,024 before. All other assets remain below 3,000 triangles each. Total 25 GLBs after the frontier expansion: 2,774,388 bytes, below the unchanged 3,000,000-byte validation limit. No downloaded texture packs, per-object dynamic lights, physics debris or postprocessing passes are added. Static meshes are batched by material within each animated pivot; named boss Core and limb groups are preserved. Low mode now also swaps in simpler Blender geometry; see the mobile detail tier below.

Browser tests verify model loading, bounded batches, preserved moving limbs and weak points, rocket exhaust, destruction, skins, all mission conditions, and mobile input/layout. Software-rendered CI gets a 120-second per-test budget and 15-second UI readiness allowance; dedicated mission finish timing tests still check the actual 0.8-second sequence. Physical-device frame rate and thermal performance require hardware testing.

## Rebuild

Run the existing Blender generators from the repository root, in this order, with Blender 4.5:

1. `tools/blender/build_assets.py`
2. `tools/blender/build_environment.py`
3. `tools/blender/build_bosses.py`
4. `tools/blender/build_infantry.py`
5. `tools/blender/build_rocket_fuel.py`
6. `tools/blender/build_skins.py`
7. `tools/blender/build_frontier.py`
8. `tools/blender/build_low_detail.py`

The first five generators call `tools/blender/asset_detail.py` before export. The skin generator imports the completed tank and renders the five matching material variants. Every generator starts a clean Blender scene. Editable `.blend` sources, GLBs and previews are committed; Blender is not required for the web build. Run `npm run test:assets`, `npm run build` and `npm test` afterward.

## Honest quality target

This is a detailed, lightweight stylized 3D kit. Full AAA realism would additionally require sculpted and baked normal maps, authored wear/dirt textures, vegetation LODs, richer terrain, character animation and a larger lighting/art production effort. Those are not claimed as delivered by this pass.

## Frame-clock correction

Slower rendering exposed a queued-animation-frame timestamp that can predate the mission start/resume clock. Frame time now stays monotonic, preventing negative simulation debt, invalid camera interpolation and stalled driving/firing. A regression test supplies stale timestamps across both start and resume, then verifies movement on the next valid frame.

Quick mouse clicks are retained until the next simulation frame, then consumed once; pause, blur and input reset cancel queued shots. CI distributes the full suite across five independent runners, and the production build depends on all five passing.

## Mobile detail tier

The Graphics button in the command and pause screens switches between Detailed and Low detail. The existing saved `low` preference is retained. Low detail loads only `public/models/low/` on startup; the other tier loads on demand and is cached for later switches. Failed downloads retain the current setting and show a retry message.

Blender imports each detailed GLB, dissolves coplanar triangles and decimates curved/beveled meshes while retaining surfaces, rigs and attachment names. `build_low_detail.py` reproduces all 25 variants directly from the detailed exports. The low tank has 1,692 triangles versus 5,712. Asset validation checks genuine triangle reductions, budgets and matching rig transforms for both tiers.

Runtime switching replaces geometry within the existing material batches. It preserves unit references, moving pivots, health, positions, collision footprints, skins, boss weak points, destruction state and in-flight rockets. Loading is confined to the command/pause screens; resume and other actions wait until loading finishes. The gameplay simulation stays paused.

Low mode caps the pixel ratio at 0.8 and the longest rendering-buffer edge at 960 pixels, disables reflection lighting, dynamic shadows and overlay blur, and uses the existing reduced effect budgets. CSS text and controls remain at native resolution. Detailed rendering remains at a maximum 1.6 pixel ratio. These settings reduce GPU work; physical-device frame rate, battery and thermal performance still require hardware testing.

Regression coverage includes portrait/landscape touch selection, cold reload fetching only the chosen tier, both switch directions, paused battle preservation, download failure/retry and iPhone WebKit touch/resume.

## Frontier environment kit

`build_frontier.py` creates six additional Blender assets: faceted glacier outcrops, a caldera volcano, ember-veined volcanic rocks, palms, broadleaf jungle trees and three-floor city blocks. The editable scene is `assets/blender/frontier-environments.blend`. The shared runtime/test catalog is `src/three/model-catalog.json`.

The complete detailed kit uses 34,350 triangles; Low detail uses 8,952 triangles (74% fewer), with 1,293,996 bytes of GLBs. Hazard rings, terrain footprints and collision remain identical across detail settings. Rockfalls reuse pooled smoke/impact effects, allow at most three active rocks and eight fading scars, and add no dynamic lights or rigid-body debris. See the [frontier implementation plan](FRONTIER_CAMPAIGN_PLAN.md).

## Frontier polish and stable wrecks

`frontier_detail.py`, called by `build_frontier.py`, adds natural silhouettes, construction details, and packed albedo/normal maps of at most 128 × 128 pixels. Blender batches static meshes by material before export. Low detail omits fine decorative groups and recalculates imported normals after simplification. The detailed model budget remains 3 MB; the low-tier validation limit is now 1.5 MB to accommodate the packed surfaces (actual 1,293,996 bytes).

Shared ground textures are generated once and reused. Frontier boundaries use instanced meshes, preserving their instance transforms during geometry swaps and releasing their own GPU buffers on stage changes. Wreck scorch marks use world-space placement at 0.14 m, soft edges, depth testing and polygon offset. The camera near plane is 0.5 m. Wrecks retain cast shadows while avoiding fine self-shadow shimmer. Review and validation details: [rendering and frontier review](RENDERING_AND_FRONTIER_POLISH_REVIEW.md).
