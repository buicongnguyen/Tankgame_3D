# Performance review — 25 October 2026

Project: **Tank_game_3D / Steel Front**, Three.js **0.186.0**, Vite development build. Measurements describe the local snapshot taken on 25 October 2026. Existing language, mobile, and earlier draw-batching work was preserved.

Applied the installed `smooth-dense-scenes` skill at `C:/Users/n/.claude/skills/smooth-dense-scenes/SKILL.md`, including its CPU/buffer reference. The supplied `C:/Users/n.claude/...` path was not present; the installed `.claude` folder was used.

## Release integration — 28 October 2026

For GitHub Pages publication, these changes were merged with the newer main branch, preserving its living scenery, soldier animation, particle batches, phone frame budget and touch fixes. Movement and sight/navigation now share one cover index; render batches retain separate material variants. The measurements below remain historical evidence for the tested October 25 snapshot, not a new benchmark of the combined release.

## Outcome

This pass removes redundant transform calculations and GPU buffer transfers, and reduces movement collision work. It keeps the existing graphics tiers, artwork, draw counts, animation cadence, damage, controls, and particle limits.

**Measured reductions in work are established. An end-to-end FPS improvement on physical phones is not established.** This baseline already includes the earlier scenery/health-bar draw batching, documented in [the previous rendering review](docs/RENDER_PERFORMANCE_REVIEW.md). Its draw-call reductions must not be counted again as gains from this pass.

## Measurement setup

- Windows Chromium, ANGLE/D3D11, RTX 4080 SUPER; no software GPU for the profiling runs.
- Desktop: 1440×900, DPR 1, High detail. Mobile-sized view: 844×390, device DPR 2, CPU throttled 4×, both High and Low. Actual drawing buffers were 1350×624 at High and 675×312 at Low, preserving the game's existing resolution caps.
- Seed 42, Crazy difficulty, level index 2, city/background 13 and jungle/background 12, camera target at the origin. Each fixture registers 148 enemies, including off-screen/dormant/reserve enemies; this is not a claim that 148 are visible at once.
- Stationary fixtures freeze simulation. Combat fixtures use fixed 1/60 s updates, activate encounters, hold flamethrower fire, give units stress-test health, and emit a large impact every 12 frames. These changes exist only in the development profiling harness.
- Ten warm-up frames, then 30 measured frames. Counts below are arithmetic means per frame; stationary counts are constant.
- Actual WebGL draw calls include shadows. Matrix `compose`, `multiplyMatrices`, and `invert` are counted in the measurement page. `bufferData` allocations and `bufferSubData` calls/bytes are counted separately. WebGL2 offsets and lengths are interpreted as typed-array elements, not bytes. These transfer totals cover vertex/instance buffers, not uniform or texture transfers.
- CPU profiles run for a further 90 frames after removing operation-count wrappers. Their timing samples are diagnostic, and are kept separate from the counter results.

The compact evidence is in [performance-work-2026-10-25.json](docs/performance-work-2026-10-25.json). Full local reports, screenshots, original source snapshots, and `.cpuprofile` files are under `C:/Users/n/source/repos/Tank_game/artifacts/cpu-review/`.

## Bottlenecks found

1. **Repeated transforms:** the stationary city traversed about 2,825 objects while composing 2,834 matrices and multiplying more than 3,300 matrices each frame. Automatic composition of unchanged parents forced unchanged descendants to recompute.
2. **Unconditional instance uploads:** ordinary enemy batches rewrote and uploaded their capacity-sized matrix/color arrays every frame, including a frozen scene. The city repeatedly transferred 56,832 bytes in 25 buffer updates.
3. **Movement collision scans:** the active city CPU profile put the movement `blocked` predicate near the top of sampled self time. Every probe scanned all cover, built a new combined unit array, and tested distances to distant units.
4. **Effect submission:** the existing particle pool avoids unbounded allocation but still draws its individual transparent meshes. Flamethrower buffers also uploaded all 96 slots instead of only live/changed data. CPU profiles continued to show Three.js object traversal, program selection, and rendering submission as significant costs.

## Implemented changes

### Transform caching

`src/three/transform-cache.ts` opts live ordinary Object3D nodes into unchanged-pose reuse. It retains double-precision position/quaternion/scale values and parent identity. Unchanged nodes temporarily skip local composition while the native world traversal still propagates changed ancestors and explicit force updates.

The cache does not replace engine prototypes or shared templates. Cameras, bones, custom composition/traversal methods, manual matrices, and pivot transforms retain their native behavior. Explicit `updateMatrix()` and `updateWorldMatrix()` remain native, preserving muzzle queries and picking-style parent-first updates. Owning containers watch new children, and weak references avoid retaining retired rigs. The benchmark can toggle native/cached traversal without changing poses.

### Selective instance and flame uploads

`src/three/buffer-updates.ts` compares values at Float32 precision, writes only changed components, and coalesces a bounded pending update range. An update made while culled is retained until a later render; new ranges never discard it.

Enemy batches retain existing grouping, colors, source rigs and draw counts. Bounds are recalculated when matrices or the live count change, rather than every stationary frame. Growth, removal from the middle, hiding/revealing, and quality switches still rebuild the required representation.

Flamethrower matrix/color/fade buffers upload only the live changed prefix. Empty and unchanged paused effects stop producing redundant uploads. Damage scheduling, lifetime advancement, flame shapes, fade curves, capacity and rendering order remain intact. Paused weather also avoids resending unchanged positions; active weather continues normally.

The other transparent particle meshes retain their established pool and sorting. Combining smoke, sparks and flashes into a few unordered draws could change alpha compositing; that visual trade was not made. Transform caching also applies to newly emitted and recycled particle meshes.

### Collision broad phase

`src/three/cover-grid.ts` indexes cover in 12 m cells. Movement checks nearby candidates, then uses the **same circle/box collision test**. Destruction checks current health, array replacement/length and navigation revision invalidate the index, and world clearing releases it.

Unit checks no longer allocate a combined army array per probe. A cheap axis-distance rejection precedes the existing exact distance comparison. Movement subdivision, wall sliding, terrain traction, infantry crushing, convoy checks, and unit ordering remain unchanged. Future code that moves or resizes static cover must increment `navigationRevision`.

## Before/after work counts

### Matrix calculations and transfers per frame

| Fixture | Compositions before → after | Multiplications before → after | Buffer updates before → after | Uploaded bytes before → after |
|---|---:|---:|---:|---:|
| Desktop High city, stationary | 2,834 → 46 | 3,342 → 555 | 25 → 0 | 56,832 → 0 |
| Desktop High city, combat | 3,023.40 → 427.07 | 3,581.77 → 1,487.73 | 28 → 27 | 64,512 → 36,735.47 |
| Mobile High city, stationary | 2,834 → 46 | 3,378 → 591 | 25 → 0 | 56,832 → 0 |
| Mobile High city, combat | 3,023.40 → 427.07 | 3,620.70 → 1,526.67 | 28 → 27 | 64,512 → 42,314.13 |
| Mobile Low city, stationary | 2,829 → 41 | 3,191 → 404 | 25 → 0 | 56,832 → 0 |
| Mobile Low city, combat | 2,882.40 → 286.07 | 3,249.67 → 1,155.63 | 28 → 27 | 64,512 → 41,351.47 |
| Mobile High jungle, stationary | 3,141 → 43 | 3,494 → 397 | 1 → 0 | 960 → 0 |
| Mobile High jungle, combat | 3,308.97 → 221.97 | 3,696.53 → 634.53 | 4 → 4 | 8,640 → 3,069.33 |

City stationary compositions fall **98.4%**. City mobile High combat transfers fall **34.4%**; desktop combat transfers fall **43.1%**. Different views expose different instance slots, so their changed ranges differ. Zero stationary uploads does not mean a running battle uploads nothing. Matrix inversions remain 5/frame at High and 3/frame at Low. Initial/ongoing buffer allocation counts and bytes were unchanged.

### Drawing and quality

Raw draw counts and submitted triangles match the baseline **on every sampled frame**, including active combat.

| Fixture | Total draws, unchanged | Shadow draws, unchanged | Triangles, unchanged |
|---|---:|---:|---:|
| Desktop High city, stationary | 519 | 185 | 828,518 |
| Desktop High city, combat | 759.43 | 188.03 | 828,768.93 |
| Mobile High city, stationary | 556 | 185 | 913,232 |
| Mobile High city, combat | 799.37 | 188.03 | 927,140.33 |
| Mobile Low city, stationary | 371 | 0 | 154,745 |
| Mobile Low city, combat | 430.33 | 0 | 156,626.93 |
| Mobile High jungle, stationary | 365 | 171 | 498,350 |
| Mobile High jungle, combat | 568.53 | 171 | 511,312.60 |

All four stationary before/after screenshots were pixel-identical. Same-build controls were exact on desktop/Low; two High mobile controls contained small differences of at most 2/255 per channel, with zero pixels above that threshold. Particle counts at the measured combat endpoints remained 195 in High city, 44 in Low city, and 147 in jungle.

### Memory

Every paired fixture retained the same live geometry, texture and shader-program counts and the same unique scene geometry/instance buffer bytes. Examples:

| Fixture | Geometries / textures / programs, both builds | Scene buffer bytes, both builds |
|---|---:|---:|
| Desktop High city, stationary | 258 / 12 / 28 | 2,366,828 |
| Mobile High city, combat | 273 / 13 / 32 | 2,385,302 |
| Mobile Low city, combat | 292 / 13 / 39 | 1,028,682 |
| Mobile High jungle, combat | 62 / 12 / 31 | 2,006,118 |

Scene-buffer estimates exclude cached model packs outside the scene, textures, driver overhead and framebuffers; they are not total VRAM. Sampled JS heap usage ranged roughly 24–49 MB before and 25–43 MB after. Collection timing differed, so this is **not evidence of reduced retained heap**. Transform caches and the cover index add bounded CPU metadata. Rebuilding all 16 backgrounds twice ended at the same 339 geometries, 35 textures and 37 programs on both passes.

## CPU timings and what they prove

Separate profiled runs were noisy and sometimes substantially slower after the change despite the lower operation counts. For example, mobile High city combat render submission medians were 35.3 ms before and 61.8 ms after. Those runs include CPU-profiler overhead and occurred at different times on a shared machine. They cannot establish a speedup or safely be dismissed as a regression without a controlled comparison.

Therefore an additional probe alternated the original and optimized methods in one page, with **12 A/B pairs**, eight warm-up frames and six measured frames per arm. It excluded operation counters and the CPU profiler, waited for prior GPU work before timing, and alternated A/B order. The control ran the optimized code in both arms. High detail, 844×390, DPR 2, CPU 4×:

| Fixture | Median B/A total CPU-time ratio | Identical-build control ratio | Interpretation |
|---|---:|---:|---|
| Stationary city | 1.015 | 1.038 | No measurable improvement beyond control variation |
| Short active-combat city | 0.776 | 1.119 | Lower local CPU time in this fixture; control variation remains substantial |

All 12 active-combat comparison ratios were below 1, ranging 0.581–0.958, while control ratios ranged 0.743–1.338. This supports a local CPU benefit in the tested combat fixture, but the short sample, large control variation and desktop emulation do not establish a general percentage speedup. It does **not** prove higher FPS, reduced battery use, or lower crash rates on an Android/iPhone GPU.

## Correctness and review

- Native-vs-cached matrix comparison through movement, rotation, nonuniform scaling, reparenting, pivot/manual paths, explicit updates, force updates, hiding and enabling/disabling caching.
- Float32 stability, bounded pending ranges, off-screen changes, middle removal, capacity growth, count shrink and unchanged paused buffers.
- 6,000 randomized cover-grid comparisons against the original linear collision predicate, including cell boundaries, large obstacles, damage, additions and rebuilds.
- Flame pause/expiry/reuse, live detail swaps, burn damage, multi-target hits and iPhone WebKit shader checks.
- Enemy rig animation, full background rebuilds, camera reversal/traction behavior, convoy blocking, blast rules, keyboard and multitouch controls, seven mobile layouts, graphics recovery, and particle resource reuse.
- 61 distinct focused checks passed across the 30-test and 35-test runs (four checks were repeated after the final cache audit changes).

The final three-minute mobile-sized High-detail stress test also passed: rendering and simulation continued, the graphics context remained valid, particles stayed at the existing 230 cap, and texture/program counts held at 13/31. Geometry counts grew from 326 to 362 as battle assets appeared, within the test's bound. This used the existing SwiftShader configuration and is a resource/correctness check, not a phone FPS benchmark. **62 distinct checks passed in total.** The production build passed, retaining the pre-existing large-chunk warning.

## Engine adaptation and remaining costs

In installed r186, `WebGLRenderer` resets `renderer.info` **before** `shadowMap.render`, so its call counter already includes shadows for this renderer. The skill's older blanket statement to the contrary does not apply here. Raw GL counters were used for the review. Buffer ranges use components and are consumed by `WebGLAttributes`; pending ranges are explicitly preserved. Native Object3D traversal and parent invalidation were inspected rather than assuming r180/r185 recipes were identical.

High-detail combat still submits hundreds of draws and almost a million triangles. The next measured rendering candidates are repeated material/program selection and transparent particle submission. Shared materials across plain/instanced objects need careful separation and color/shader-hook synchronization if pursued. Particle batching needs an ordering-aware visual test. These are remaining opportunities, not implemented or claimed gains. Device testing is still needed before drawing conclusions about sustained mobile smoothness or memory pressure.

## Repeat this review

Start the local development server on port 5178. Profiling depends on the development-only `/?e2e` hook:

```powershell
node tools/profile-work.mjs --out <baseline-output-folder>
# Apply a candidate optimization, then use an equivalent new browser context:
node tools/profile-work.mjs --out <candidate-output-folder>
# Optional controlled CPU comparison; the baseline folder must contain the original
# game.ts, enemy-batches.ts and flamethrower.ts from BEFORE the changes:
node tools/compare-cpu.mjs --baseline <original-source-folder> --out <timing-output-folder>
npx playwright test tests/performance-work.spec.ts tests/render-batching.spec.ts tests/render-performance.spec.ts tests/movement-stability.spec.ts tests/flamethrower.spec.ts tests/combat-edge-cases.spec.ts
npx playwright test tests/graphics.spec.ts tests/mobile-stability.spec.ts tests/mobile-review.spec.ts tests/combat-quality.spec.ts tests/destruction-effects.spec.ts
npx playwright test tests/mobile-soak.spec.ts -g "High Detail"
npm run build
```

Use `--url` for a different local port. Preserve measurement outputs outside `test-results`, which Playwright clears. The interleaved probe creates development-only copies of the original methods inside that ignored directory; they are not included in the production build. No deployment or Git commit was made.
