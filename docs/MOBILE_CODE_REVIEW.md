# Mobile, code and logic review

## Scope

Reviewed the Three.js simulation, pointer input ownership, pause/resume, mission failure and completion, escort movement, projectile collisions, resource cleanup, checkpoint validation, and compact mobile UI. Checked the existing 2D-to-3D activities as part of the review.

## Findings and fixes

| Priority | Finding | Fix and verification |
| --- | --- | --- |
| P1 | A lethal hit could be followed by repair-pad healing in the same simulation step, leaving a dead/invisible player with positive health. | Dead units cannot receive pad healing; failure checks the dead flag. Regression covers a lethal hit while on a pad. |
| P2 | Resetting input cleared motion values but retained the joystick's captured pointer owner. A canceled gesture could prevent a fresh gesture after pause. | Reset explicitly releases pointer capture and clears every stick owner. Tested pause, resume, new multitouch and cancellation. |
| P2 | Moving an aim stick back into its dead zone overwrote the remembered aim with zero. | Only intentional aim input updates the normalized remembered direction. Tested an eastward aim followed by centering. |
| P2 | After an interrupted gesture, a mobile browser can send button pointer events without a click; resume or abilities could appear unresponsive. | Buttons handle deliberate touch release directly, suppress duplicate synthetic clicks, and retain keyboard/mouse clicks. Chromium and WebKit regressions cover this. |
| P2 | Background events shared the Escape toggle callback and could resume an already-paused game when focus state and events disagreed. | Background handling is pause-only; keyboard Escape remains the explicit toggle. Tested blur while paused. |
| P2 | Enemies accumulated negative cooldown outside engagement range and could fire immediately when entering range. | Out-of-range units retain at least a warning interval before shooting. Regression checks a previously expired cooldown. |
| P2 | A tank could overlap the rescue transport, and the transport could drive through a tank in front of it. | Player movement respects the transport collider. The transport waits for a blocking tank and the HUD says CLEAR THE ROAD. Moving away remains possible. |
| P2 | Small mobile action buttons were only 30–34 CSS pixels high and several layout overrides lost safe-area spacing. | Gameplay actions are at least 44 pixels high; safe-area offsets are preserved. Seven phone sizes checked for overlap and off-screen controls. |
| P2 | Long objective text could collide with the fixed-position radio banner. | Radio placement follows the measured objective panel. All six mission objectives checked at 320 px width. |
| P2 | The portrait camera could place the player behind bottom controls, particularly while settling after deployment. | Portrait framing and initial camera target adjusted; regression projects the player into screen space and checks clearance above the HUD. |

## Verification coverage

- Chromium touch emulation: 320×568, 360×640, 390×844, 412×915, 568×320, 667×375, and 844×390.
- Real pointer/touch events: simultaneous driving/firing, aim-stick centering, cancellation, pause/resume and new pointer ownership.
- WebKit engine: mobile-sized startup, artillery button, pause and rendering without page errors.
- Original regression coverage remains: campaign checkpoints, workshop purchases, replay rewards, corrupt-save recovery, cover and swept projectiles, shield/repair, objective outcomes, activities, artillery, effect budgets and cleanup.
- Screenshots inspected for small portrait, small landscape, and WebKit pause UI.

## Limits

`adb devices -l` reported no connected Android device. These checks are browser emulation and desktop WebKit, not a physical Android/iPhone playtest. Actual Safari app behavior, browser chrome, physical cutouts, GPU framerate, battery use and thermal throttling still need hardware testing. Safe-area handling is implemented, but actual notched-device rendering is not claimed as verified. Enemy navigation remains local steering on a flat gameplay plane.

## Final validation

All 21 Playwright tests passed locally, including the seven viewport checks and WebKit smoke test. TypeScript and the production Vite build passed. The build retains a bundle-size advisory; physical-device loading and frame pacing remain unverified.


## Focused left/right joystick review

- Left stick: added a 15% radial dead zone with smoothly remapped analog speed to prevent resting-thumb drift.
- Right stick: firing engages beyond 32% and releases below 22%, preventing threshold jitter; aiming and remembered direction remain independent of firing.
- Both sticks: nub movement stays within the pad; active input has visible feedback and firing uses amber feedback. Non-primary mouse buttons cannot take ownership.
- Resize/orientation changes release both captured pointers and clear movement/firing so the new layout accepts fresh touches.
- Added portrait and landscape touch regressions for all four directions, slow movement, independent releases, crossing pads without stealing ownership, cancellation, rotation and fresh gestures. Added firing-threshold and nub-containment checks.
- Physical-device verification remains outstanding; these tests exercise real browser input events under mobile emulation.

Focused review validation: all 24 regression tests and the production build passed locally. Inspected the updated portrait control-pad screenshot.

