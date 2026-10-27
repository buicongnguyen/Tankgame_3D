# Rendering performance review — 25 October 2026

Applied Claude's **smooth-dense-scenes** workflow to Tankgame_3D: measure actual draws, attribute their cost, optimize repeated objects, and verify the same scenes again. The installed skill was found at `C:/Users/n/.claude/skills/smooth-dense-scenes/SKILL.md`, rather than inside the `3D_game_scene` checkout.

## Findings and changes

The game already batches enemy model surfaces and some route scenery. The remaining expensive groups included repeated Blender scenery and individual enemy health bars. A busy city attribution sample contained approximately 430 scenery draws and 255 unit draws, including shadows.

- **Static Blender scenery:** instance repeated opaque surfaces in 24 m cells. Keep geometry, materials, shadow settings, world transforms, and original cover objects. Destruction hides only the affected instance; collisions and damage still use the original cover. Transparent parts and mirrored transforms keep their original rendering. Existing instances are not batched again.
- **Health bars:** draw ordinary enemy bars together with individual colors and health widths. Boss and rescued ally bars retain their existing behavior. Keep the shared batch geometry separate from the individual resources released when an enemy dies.
- **Lifecycle:** release instance buffers and restore original mesh layers when rebuilding. Rebuild scenery batches when switching model detail. Repack scenery only after a source visibility change, rather than uploading its transforms every frame.

The scenery batching contract is **static transforms**: scenery can be hidden, removed, or rebuilt. A future feature that moves a batched prop must rebuild its batch or explicitly add transform tracking. Animated units and pickups use their existing paths.

## Repeatable results

Same seeded level-3 Crazy scenes, camera at the center, frozen simulation, identical High/Low settings. Desktop: 1440×900, DPR 1. Mobile-sized view: 844×390, DPR 2, CPU throttled 4×. Chromium used the desktop RTX 4080 SUPER through ANGLE/D3D11. Six measured renders per scene after three warm-up renders; draw counts were constant across those samples.

These are **actual WebGL draws per frame, including shadow draws**, not FPS measurements. The baseline is the local working tree before this optimization, including the pre-existing language/mobile work. Raw evidence is summarized in [render-performance-2026-10-25.json](render-performance-2026-10-25.json).

| View | Detail | Background index | Before | After |
|---|---|---:|---:|---:|
| Desktop | High | 0 | 416 | 359 |
| Desktop | High | 9 — ice | 719 | 549 |
| Desktop | High | 12 — jungle | 643 | 324 |
| Desktop | High | 13 — city | 655 | 519 |
| Desktop | Low | 0 | 274 | 220 |
| Desktop | Low | 9 | 451 | 302 |
| Desktop | Low | 12 | 285 | 151 |
| Desktop | Low | 13 | 444 | 334 |
| Mobile-sized | High | 0 | 467 | 379 |
| Mobile-sized | High | 9 — ice | 763 | 590 |
| Mobile-sized | High | 12 — jungle | 729 | 365 |
| Mobile-sized | High | 13 — city | 734 | 556 |
| Mobile-sized | Low | 0 | 325 | 239 |
| Mobile-sized | Low | 9 | 495 | 343 |
| Mobile-sized | Low | 12 | 372 | 191 |
| Mobile-sized | Low | 13 | 523 | 371 |

The High-detail mobile-sized jungle sample saves **49.9%** of draws; city saves **24.3%**. No scenery density, enemy count, or default graphics setting was reduced.

### Culling and memory tradeoff

An instance batch is culled as a group. Larger cells save more draws but submit more off-screen geometry. The selected 24 m size balances this tradeoff; it is not a proven FPS optimum for every GPU.

| Cell size | Mobile High jungle draws / triangles | Mobile High city draws / triangles |
|---|---:|---:|
| Original, unbatched scenery | 729 / 428,218 | 734 / 895,516 |
| 16 m | 441 / 487,194 | 596 / 896,676 |
| **24 m — selected** | **365 / 498,350** | **556 / 913,232** |
| 32 m | 320 / 560,802 | 495 / 920,292 |

Selected batches increase submitted triangles by about 16.4% in this jungle view and 2.0% in city. Low-detail triangles remain inexpensive (47,971 jungle; 154,745 city). The scene's unique geometry buffer bytes remain essentially unchanged: the only added shared bar geometry is 140 bytes. All instance matrix/color buffers together are about 30–103 KB in the sampled scenes; that total includes pre-existing instances. These are scene buffer estimates, not total browser or GPU memory, and exclude cached model packs outside the scene and textures.

## Verification

- Regression coverage exercises static cover transforms, partial destruction, parent hiding, removed sources, team colors, health widths, and shared-resource ownership.
- All 16 backgrounds are rebuilt twice in Low detail to check resources, followed by High → Low → High on jungle/city. Draw-budget assertions cover the two dense backgrounds.
- Existing tests cover animated enemy rigs, detail download/retry, portrait/landscape mobile graphics, iPhone WebKit, camera movement, destruction effects, and model pivots.
- The initial identical-build screenshot controls changed **zero pixels** in all four comparisons. Initial before/after differences affected at most **0.088%** of pixels in desktop/mobile jungle/city views. Maximum channel difference was 38/255; mobile was at most 24/255. Inspection retained scenery, shadows and health bars. A later verification run reproduced every draw/triangle count but showed up to 2/255 pixel noise in one identical-build mobile control, so the comparison tool also reports differences above 2 and 8. This is a small rendering difference, not a claim of pixel identity.
- Both three-minute mobile-sized **High and Low** stress tests passed with no lost graphics context. High geometry counts went from 329 to 362 and then held steady; textures/programs remained 13/31. Low geometry counts went from 346 to 349; textures/programs stayed 11/22. These used the existing software-rendered Chromium test configuration, not physical phones or an FPS benchmark.
- Rebuilding all backgrounds twice in the final configuration ended at exactly **337 geometries, 35 textures, and 37 programs** on both passes. High → Low → High restored the same draw counts, and destroying a cover removed its instances correctly.
- **26 distinct checks passed** across two runs (14 rendering/graphics checks, followed by 15 checks that repeated the three batching checks and added stress/skirmish coverage). `npm run build` passed; Vite retained its existing large-chunk warning.

## Reuse this review

Start the existing development server on port 5178, then run from this repository:

```powershell
node tools/profile-rendering.mjs --out test-results/render-review/before
# Make the candidate optimization, keeping scene setup and quality settings unchanged.
node tools/profile-rendering.mjs --out test-results/render-review/after --compare test-results/render-review/before
# Optional: sample all 16 background indices instead of four representative ones.
node tools/profile-rendering.mjs --all --out test-results/render-review/all
npx playwright test tests/render-batching.spec.ts tests/render-performance.spec.ts tests/graphics.spec.ts tests/destruction-effects.spec.ts tests/asset-detail.spec.ts
npx playwright test tests/mobile-soak.spec.ts tests/skirmish.spec.ts
npm run build
```

The probe requires the development-only `/?e2e` hook; use `--url` for a different local port. It writes JSON, screenshot pairs, main/shadow attribution, raw draw counts, submitted triangles, and scene buffer estimates. `--compare` adds count and pixel-difference results against a previous run, including identical-build image controls. Its GPU backend defaults to D3D11 on Windows and the browser default elsewhere. Save benchmark outputs outside `test-results` before running Playwright, because Playwright clears that directory.

Review rules adapted from the skill:

1. Inspect the installed Three.js source before trusting a recipe. This game uses **r186**, whose `renderer.info.reset()` occurs **before** `shadowMap.render()`. Here `renderer.info.render.calls` already includes shadows and matched raw draws. The skill's blanket statement that the counter excludes shadows does not apply to this release.
2. Also check shadow-layer semantics. r186's shadow traversal uses the game camera's layer mask; a shadow-camera-only layer recipe must not be copied blindly.
3. Measure actual draws and attribution first. Count geometry too: fewer draws alone can hide coarser culling or duplicated vertex buffers.
4. Preserve animation pivots, per-object colors, transparent ordering, independent destruction, and shared asset ownership. Do not merge everything into a single map-wide object.
5. Check identical-build screenshots before comparing builds. Keep lighting, camera, seed, quality, and simulation time fixed.
6. Run stateful tests and repeated rebuilds, not only a screenshot. Changes to instancing must preserve detail switching and resource cleanup.
7. Treat the probe's `cpuSubmitMs` as diagnostic only. A real speed claim requires interleaved before/after timing and an identical-build control; sample a live battle as well as a frozen scene. CPU-throttled desktop emulation does not reproduce a phone GPU, thermal limits, or mobile memory pressure.

## Remaining limits

High-detail views can still exceed 500 draws and 900,000 submitted triangles, particularly with many units. These changes reduce submission work; they do not establish 60 FPS on a phone. Before another optimization pass, profile a live battle to distinguish drawing cost from enemy AI/pathfinding and effects. Physical Android/iPhone testing remains necessary for device-specific smoothness, heat and crash claims.
