# Campaign code and logic review — 21 September 2026

Scope: tutorial progression, defense waves, rescue/escort AI, mobile controls,
save handling, resource limits, and the existing Android build failure.

## Findings and fixes

| Priority | Reproduction / impact | Fix |
| --- | --- | --- |
| P1 | Hold Fire while collecting the training laser: automatic selection can spend every loan round before the mandatory selection lesson, leaving no selectable laser. | Training keeps the current weapon until the player selects the laser. Campaign pickups still equip automatically. |
| P2 | Drive alone to the rescue exit while both surviving allies remain far away: the mission incorrectly completes. | Exit completion requires Kestrel and at least one living rescued tank inside the exit radius. Allies close their formation at the exit, even if only the rear tank survives. Clearing every hostile still completes from anywhere. |
| P2 | A rescued tank enters enemy sight while Kestrel is behind cover: dormant enemies ignore the allied tank. | Encounter scans also check living rescued allies; hidden reserves remain excluded. |
| P2 | The escort turret filters/sorts all enemies every simulation step (61 scans in a one-second reproduction). | Cache targets and acquire at five scans per second; revalidate range, life, ground state and cover before firing. Clear target references on retry. |
| P2 | Android CI requests the discontinued SDK `tools` package and stops before building. | Explicitly request `platform-tools`; keep the installed command-line tools and current build toolchain. |
| P3 | Failing First Armor shows “Retry First Light”. | Retry uses the active mission/tutorial name. |

The same airborne/visibility check is shared by rescued tank and escort targeting,
so a cached target taking off cannot continue receiving ground-only allied shots.

## Regression evidence

Five focused browser scenarios reproduced their corresponding gameplay/UI defects
before the fixes. They cover held fire over the loan pickup, living-ally extraction,
all-clear/failure precedence, target-search frequency and obstruction, ally detection,
and actual mobile weapon-picker taps plus tutorial retry labels. Two additional
checks cover selection in the pickup frame and the surviving rear tank actually
following into extraction. The pause/resume test advances the simulation to the
next 200 ms target scan before expecting reacquisition.

Related tutorial, defense, escort, ambush, support and mobile tests are run after the
fixes. GitHub Pages remains gated by all eight browser verification groups, a clean
production build and asset validation. The Android package is independently built
by its existing workflow. Release outcomes are reported with the final deployment.

Physical phone performance is not established by desktop browser emulation.

Android action reference: https://github.com/android-actions/setup-android#the-deprecated-tools-package

## Local release validation

- TypeScript checking, production build and Blender asset-budget checks passed.
- All 53 affected tests passed together in 1.2 minutes: seven review regressions,
  existing tutorials/allies, defense/route encounters, escort support, enemy tactics,
  weapon selection and graphics switching (including iPhone WebKit).
- Existing unrelated marketing files, upload ZIP and Android launch notes were
  preserved outside this commit.

## CI browser setup follow-up

The rocket integration test intermittently failed before its body ran, during
Chromium context creation (`Browser.setDownloadBehavior`: context not found).
The preceding camera test issued 180 synchronous full-scene renders. It now yields
to the browser after each frame and drains pending GPU commands before teardown.
Camera interpolation assertions and the following rocket test are unchanged;
no retries, skipped assertions or relaxed timeouts were added.
