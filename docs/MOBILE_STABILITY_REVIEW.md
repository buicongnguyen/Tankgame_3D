# Mobile stability and Easy-mode review — 21 September 2026

The reported three-minute phone crash has no device log yet. These fixes address
observed rendering pressure and resource churn; they do not establish the exact
cause of that device's crash.

## Review findings and fixes

1. **Phone startup used detailed graphics.** A fresh save selected detailed models,
   shadows and up to 1.6 device-pixel ratio. Touch devices now start with the existing
   low-detail model pack, no shadows/reflections, at most 0.8 pixel ratio, and no
   multisample antialiasing on a cold low-detail start. Older phone saves without
   a deliberate graphics-choice marker also migrate to low detail. New manual
   graphics selections persist across reloads.
2. **Rendering ran on every animation callback.** Low detail now caps graphics at
   30 FPS; detailed mode caps at 60. This reduces sustained GPU work and is a cap,
   not a guaranteed achieved frame rate. Combat retains its fixed 60 Hz simulation.
   Catch-up is bounded to three simulation steps per rendered frame; severe stalls
   discard excess backlog rather than repeatedly attempting six expensive steps.
   Hidden pages and lost graphics contexts skip rendering.
3. **Particles repeatedly allocated meshes and materials.** Combat effects now
   reuse a bounded pool. The combined active and pooled budget is 48 in low detail
   and 230 in detailed mode; changing quality trims the pool. Stage reset disposes
   the pool's materials, while shared geometry/textures retain their owner.
4. **Dead unit rigs remained attached to the scene.** Enemy rigs now leave the scene
   and instance registry when killed. Their private health-bar/aim-beam resources
   are disposed; shared model assets remain valid. Gameplay retains dead-unit
   records for kill counts, results and encounter logic.
5. **Low-detail debris was still relatively costly.** Wrecks are limited to six
   and expire after 20 seconds in low detail (14 / 60 seconds in detailed mode).
   Low-detail wreck smoke ends after five seconds. Legacy debris is capped at 24
   versus 100; flame visuals at 24 versus 96. Muzzle/impact spark counts are lower.
   Invisible low-detail weather no longer updates its vertex buffer.
6. **Graphics-loss recovery could restart with the same expensive settings.** The
   recovery screen now saves low detail, stops rendering and offers a low-detail
   reload. Campaign progress is preserved; the active fight restarts from its
   campaign checkpoint. Finished sound nodes are explicitly disconnected.

The previous enemy instancing, off-screen model culling, cheaper collision math
and navigation-cache improvements remain included. No collision obstacles,
pickups, enemies or warning markers are removed to meet a cosmetic budget.

## Easy-mode logic

- New campaigns default to Easy; saved difficulty choices remain selected.
- All enemy types, including every boss and later spawns, use exactly half their
  Normal HP. Normal progression is applied before the Easy multiplier.
- Easy player hull now uses ×6 after the subsequent Easy hull update. Enemy counts and damage are
  unchanged from the existing Easy rules.
- Health bars, damage, retries and stage completion use the scaled maximum HP.
  See `COMBAT_BALANCE_REFERENCE.md` for the updated balance tables.

## Validation

Focused regression tests cover mode defaults and save migration, every enemy/boss
health multiplier, 30/60 FPS pacing on 60/120/144 Hz schedules, particle reuse,
dead-unit cleanup, wreck expiry, graphics-loss recovery, combat and graphics
switching. Browser checks include touch viewports and iPhone WebKit. The production build and 89 distinct targeted tests passed across the review runs. Review also caught and fixed a frame-cap interaction: mission results now honor their wall-clock deadline even on a skipped rendering callback.

`tests/mobile-soak.spec.ts` runs a three-minute, mobile-sized Crazy battle with
148 enemies and repeated impacts, monitoring GPU geometry/texture/program counts,
effect budgets and context loss. It uses invulnerable units so the test cannot
finish early. This desktop browser stress test is not physical-phone thermal or
memory validation; rerun on the tester's phone before claiming the crash resolved.

```powershell
npx playwright test tests/mobile-stability.spec.ts tests/mobile-soak.spec.ts
```

Changes are local until deployed. The public website remains unchanged until its deployment is updated.

## Measured graphics comparison

In the 390 × 844 Crazy city test, all 148 enemies and four bosses remained present. Detailed mode drew 289,366 triangles in 379 calls; low detail drew 44,851 triangles in 133 calls (about 85% fewer triangles). This is a scene comparison, not a physical-phone FPS measurement.

The three-minute Chromium mobile-sized soak passed: no page errors or graphics-context loss, active plus pooled effects stayed within 48, and GPU resource counts stayed within the test's bounded allowances. It does not prove that every phone is crash-free.
