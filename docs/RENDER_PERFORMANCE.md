# Crowded-battle performance review

## Findings

The main rendering issue was the number of separate enemy surface draws. Tanks,
jeeps and soldiers reuse the same models, but their hulls, turrets and limbs were
still submitted individually. This costs CPU/driver time on both desktop and
mobile, especially with shadows enabled.

Moving the camera does not regenerate the terrain. Static scenery is already
merged or instanced. Making the camera show a larger area would generally expose
more objects and increase rendering work. Abrupt changes in route look-ahead can,
however, make camera motion feel uneven even when frame timing is steady.

Navigation also allocated a new live-cover array for every route query. Its
eight-entry flow-field cache discarded every entry when full, which wasted work
when many patrolling enemies had different destinations. Common collision queries
created temporary arrays or calculated square roots unnecessarily.

## Implemented

- Instance matching non-boss enemy geometry/materials across animated rigs. Hulls,
  turrets, legs and wheels keep their existing transforms and animation behavior.
- Exclude enemy model draws outside the camera view, with a generous 9-unit sphere
  margin for silhouettes and shadows. AI, detection and combat continue normally.
- Preserve health bars and special visuals. Player and boss rendering is unchanged.
  Batches follow detail-setting geometry swaps and release instance buffers at
  stage reset. Templates and shared materials remain owned by the existing loader.
- Update instance matrices once per render, after Three.js updates the scene's
  transforms. Cache batches between frames to avoid allocation at camera edges.
- Reuse the live-cover list until the cover revision changes. Replace full cache
  flushes with a bounded 32-entry least-recently-used flow-field cache. Destruction
  and stage changes still invalidate navigation immediately.
- Use scalar slab intersection calculations and squared circle-box distances.
  Bullet, sight and collision boundaries retain their existing behavior.
- Smooth changes in route look-ahead before applying the existing camera follow.
  Reset that smoothing on deployment so a previous route cannot affect a new one.

## Reproducible comparison

The diagnostic starts scenario index 13, level index 2 on Crazy difficulty with
148 enemies and 148 cover objects. It activates encounters, fixes the random seed
and makes the test player invulnerable. It warms up for 10 simulated frames, then
records 80 frames. Each comparison uses a fresh browser page. The baseline disables
only enemy batching in the current code, so it isolates that rendering change.

| View / detail | Average draws without enemy batching | Average draws with enemy batching | Reduction |
| --- | ---: | ---: | ---: |
| Desktop, 1440 × 900, detailed | 1,742 | 668 | 62% |
| Mobile-sized, 844 × 390, low detail | 1,074 | 523 | 51% |

These are Chromium SwiftShader software-renderer results. They demonstrate fewer
draw submissions, not a guaranteed FPS improvement on every device. The mobile
case uses a phone-sized viewport and the low-detail preset; it does not emulate
a phone's GPU, thermal limits or battery behavior. The script also reports CPU
simulation and world-update/render-submission timing, which does not include
completed GPU execution and must not be presented as real gameplay FPS.

Run a local development server, then in a second terminal:

```powershell
npm run dev -- --host 127.0.0.1 --port 5184
```

```powershell
node tools/profile-battle.mjs --url http://127.0.0.1:5184/ --output test-results/battle-profile.json
```

The tool writes JSON results. Run benchmarks separately from
other browser tests to avoid CPU/GPU contention. The diagnostic changes are
confined to its temporary test pages; normal game balance is unaffected.

## Validation

Production build passes. Thirty targeted Playwright tests pass across collision
rules, enemy tactics, unit health, route UI and graphics, including mobile-sized
views and iPhone WebKit. New regression checks cover collision equivalence across
2,000 seeded rays, instance pose matching, visibility, high/low detail swaps,
stage cleanup and smooth camera turns. Rendering checks are repeated after the
final removal of a duplicate per-frame update.

## Remaining checks and possible next steps

Test a sustained crowded battle on a lower-end Android phone and an iPhone, both
in low and detailed settings. Compare frame-time spikes during movement, shooting,
explosions and scenery destruction, and check near-edge enemy silhouettes/shadows.
Hardware validation remains necessary.

If GPU fill rate or effects remain the bottleneck, measure an adaptive pixel-ratio
and shadow-quality option next. If CPU simulation dominates on very large waves,
profile spatial indexing for nearby-unit and obstacle queries before changing AI
cadence. Neither option is necessary to obtain the draw-call reduction above, and
this change does not reduce enemy counts or simulation frequency.

This optimization is implemented locally; deployment is a separate step.
