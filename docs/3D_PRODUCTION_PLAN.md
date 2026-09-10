# STEEL FRONT: LAST SIGNAL — 3D production plan

## 1. Evaluation of the original game

Source baseline: Tank_game commit 0a3032e, inspected 2026-09-10. This evaluation is based on source inspection and build verification, not player research.

| Area | Existing strength | Problem/opportunity | 3D response |
| --- | --- | --- | --- |
| Combat | Separate hull/turret, projectile travel, directional armor, weapon progression | 2D silhouettes compress distance, cover, and hit feedback | Real mesh silhouettes, readable tracers, recoil, dust, explosion rings and flank damage |
| Campaign | Fifteen assault/defense/capture/escort/boss stages | Briefings are functional; missions need a stronger emotional through-line | A focused six-operation rescue campaign with radio dialogue and a resolved ending |
| Progression | Large arsenal, chassis and stat shop | Many choices arrive before players understand tactical roles; TEST_MODE unlocks starters | Three differentiated weapons and three upgrade tracks with visible prices and effects |
| UI | DOM HUD, mobile controls, pause/retry and depot | Dense panels compete with combat; limited visual hierarchy | Full-screen battlefield; compact objective, hull and reload HUD; large mission briefing and focused depot |
| Touch | Simultaneous driving and aiming | Screen real estate and aim precision remain important in 3D | Independent captured touch sticks; aim-stick firing; large repair and shield actions |
| Engineering | Vite/TypeScript/Capacitor and deployment already work | BattleScene couples Phaser display/physics to combat | Separate pure rules, mission data, Three.js world, input and UI modules |
| Performance | Original has a mobile performance profile | 3D adds draw calls, shadows and GPU fill cost | Low-poly GLB assets, shared meshes/materials, bounded effects and capped pixel ratio |

## 2. Product direction and release boundary

Create **Steel Front: Last Signal**, a single-player elevated-camera 3D tank game that runs in a browser and retains Capacitor packaging. Blender authors assets; Three.js runs the game. The first release is a complete six-mission campaign, not a claim that every original weapon, infantry mechanic or all fifteen original stages has been ported. Preserve the original 2D campaign at `legacy.html` for comparison.

Design pillars:

1. Read the fight immediately: allied mint, hostile coral, objective amber; labels and shapes reinforce color.
2. Win through positioning: hard cover blocks shells, barrels can be detonated, frontal armor reduces damage and flanks reward movement.
3. Make every sortie matter: restore communications, defend relief supplies, escort a rescue transport and break the siege.
4. Offer a short meaningful depot choice between missions, with checkpoint persistence and no grinding requirement.
5. Make desktop and touch inputs equally complete.

## 3. Story and campaign

The Meridian valley has gone silent. An automated siege network called Warden has cut the evacuation route. Captain Mara commands the last operational recovery tank, callsign Kestrel. Signal officer Ivo guides the crew; the convoy carries civilians, not an abstract score target.

| Operation | Objective | Story beat | Teaching / escalation |
| --- | --- | --- | --- |
| 01 — First Light | Destroy the patrol | Find the emergency broadcast | Move, aim, fire, cover and hull health |
| 02 — Open Frequency | Hold the relay while uncontested | Ivo reaches the trapped convoy | Territory control; enemy reinforcement pressure |
| 03 — Homeward | Escort the rescue transport | The evacuation finally moves | Stay near the transport; remove ambushers |
| 04 — Long Night | Defend the evacuation uplink | Hold the corridor open | Timed survival and target priority |
| 05 — Glass Road | Clear the siege battery | Break through the last perimeter | Heavier opposition; use weapon roles and upgrades |
| 06 — Last Signal | Destroy the Warden command tank | Restore the valley network | Telegraphs, high durability and a second boss phase |

Each mission has a briefing, in-combat radio message, measurable HUD objective and specific debrief. Victory ends with the rescued convoy reaching safety. Failure allows retry from the mission checkpoint. Completed missions remain replayable through the campaign route; replay does not grant additional first-clear rewards.

## 4. UI and experience specification

### Command screen

Live 3D battlefield diorama; strong title; mission number; short story excerpt; one prominent deploy/continue action. Campaign route lists six operations with locked/current/completed states. Difficulty choices are Story, Standard, Veteran. Persist sound and graphics preferences.

### Combat

Top-left mission name and concise objective progress. Hull meter and weapon/reload status at the bottom. Top-right minimap plus pause. Small temporary radio messages with speaker identity. Enemies have health indicators in-world. Capture radius and convoy markers make goals visible. Avoid modal tutorials during shooting; display the desktop/touch control legend in briefing and pause.

### Depot

Debrief with result, one-time credits earned and narrative consequence. Three affordable, capped upgrade tracks: armor, gun power, reload. Show level, exact effect and next price. Full repair between missions. Resume the next sortie from the depot. Preserve purchased upgrades across reloads.

### Accessibility and responsive behavior

Keyboard-accessible buttons, visible focus, semantic headings, sensible focus after overlays, no keyboard trap. Escape pauses; blur and hidden tab pause too. Reduced-motion preference disables screen shake. High contrast UI, text labels on actions and scalable layout. Touch pads use pointer capture with cancellation cleanup; never rely on hover. Do not block browser zoom on ordinary menu content.

## 5. Runtime architecture

- `src/three/rules.ts`: pure collision, armor and economy rules; deterministic unit tests.
- `src/three/campaign.ts`: authored briefings, missions, checkpoint schema and validated persistence.
- `src/three/world.ts`: asset loading, arena generation, camera, lighting, tanks, cover and bounded effects.
- `src/three/input.ts`: keyboard/mouse and independent touch pointer ownership.
- `src/three/game.ts`: simulation, enemy AI, mission conditions, projectiles, rewards, HUD and screen flow.
- `src/three/style.css`: responsive game interface.
- `src/main.ts`: 3D bootstrap with loading/error UI.
- `legacy.html` and `src/legacy-main.ts`: original game entry point.

Simulation uses a fixed timestep with bounded catch-up. Map movement and collisions operate on the XZ plane while meshes provide real 3D depth. Projectiles use swept segment collisions, selecting the first impact so shells cannot tunnel through cover or hit a target behind it. Player and enemy shells obey the same cover geometry. Use simple circle/box collisions instead of adding a heavyweight physics runtime for a flat battlefield.

## 6. Blender pipeline

Located executable: `C:/Users/n/source/repos/3d_astra/.tools/blender-4.5.3-windows-x64/blender.exe`.

Commit a deterministic Python generator under `tools/blender/`. Run Blender in background mode to create editable `.blend` source and exported `.glb` assets. The runtime loads actual Blender exports with GLTFLoader; no remote asset hosting or runtime Blender process is required.

Asset set: tracked tank with hull, independently rotating turret and muzzle; rescue transport; concrete barricade; supply crate; fuel barrel; communications relay. Use beveled low-poly forms, warm muted terrain, dark tracks, pale armored plates, mint player markings and red hostile markings. Objects have explicit names; all dimensions are in meters. Blender uses Z up; glTF export converts to Y up. Author the front toward Blender -Y, corresponding to runtime +Z. Turret pivot remains centered. Avoid textures for this release so materials remain small and self-contained.

Target budgets: tank under 12k triangles; prop under 3k triangles; all production GLBs together under 3 MB; no external texture requests. Inspect exported bounds and required node names automatically. Retain generator plus source for later hand refinement. Budget checks are measured after export, not assumed.

## 7. Gameplay rules

- WASD/arrows drive relative to the overhead view. Mouse aims on ground plane; hold primary mouse or Space fires. Touch: left pad drives; right pad aims and fires.
- Cannon: deliberate, high-impact armor-piercing shells. Autocannon: quick low-damage suppressive bursts. Rockets: slower splash damage with a longer reload. Switch with 1/2/3 or a visible weapon button. Unlock autocannon after operation 1 and rockets after operation 3.
- Q activates a three-second protective shield with cooldown. E consumes a repair kit; each mission restores one kit. Visible touch equivalents.
- Raiders close and strafe, sentries hold lanes, heavies pressure objectives; Warden increases fire pressure below half health. A visible aiming beam warns before enemy firing.
- Hard barricades stop tanks and shells. Crates are destructible. Barrels explode and affect nearby units/cover. Eliminated enemies can drop field repair pickups.
- Mission completion freezes combat before opening the depot. Failure resolves before mission success when both occur in the same tick. Retry reconstructs the mission without accumulated stale timers or projectiles.
- Persist a versioned checkpoint and settings locally. Treat corrupt storage as recoverable. One-time clear rewards prevent replay credit farming. Campaign reset is an explicit user action.

## 8. Verification and acceptance

1. TypeScript and production Vite build pass for 3D and legacy entries.
2. Unit tests cover swept collision, first-hit ordering, armor orientation, purchase bounds, checkpoint validation and first-clear rewards.
3. Browser tests load real GLB files without missing requests or console errors; deploy, drive, fire, pause/resume, switch weapons, shield and repair; verify progress persistence, depot buying, retry and ending.
4. Responsive checks at desktop and phone landscape/portrait sizes verify no horizontal overflow or blocked primary actions; touch movement and firing can be held simultaneously.
5. Browser screenshot inspection verifies actual 3D assets, legible UI and mission views. Record observed render stats without claiming physical-phone performance from emulation.
6. Original game continues to build as a separate entry. Android application ID and label must be unique; native APK validation is separate from browser validation.
7. Git commit contains assets, source, plan, tests, lockfile and CI. Push to `git@github.com:buicongnguyen/Tankgame_3D.git` over SSH. Enable GitHub Pages using the Actions workflow. Wait for successful deployment and verify the public URL and model loads.

## 9. Execution order

1. Inspect baseline, Blender and SSH; write this plan.
2. Generate and verify Blender assets.
3. Implement 3D world, simulation and combat.
4. Implement the six-operation story, mission objectives and progression.
5. Implement the new UI, mobile inputs, settings and checkpoint recovery.
6. Test and visually inspect; repair issues before publication.
7. Update README with controls, Blender rebuild commands and known limitations.
8. Commit, create the new repository, push through SSH, enable Pages, and verify deployment.

## 10. Follow-up roadmap (outside the initial release)

Expand to the original fifteen-stage scale only after the six-mission loop is validated. Port infantry shelters, the complete fifteen-weapon arsenal, chassis purchases and air drones deliberately. Add hand-authored terrain routes, authored sound/music, additional biomes, replay medals and controller support. Consider pathfinding and more complex physics only if map design requires them. Multiplayer is not part of this release.

## References

- https://threejs.org/docs/pages/GLTFLoader.html
- https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/rest/pages/pages

## Implementation results

Local implementation results and release limitations are recorded below.

### Local release verification — 2026-09-10

Implemented the six-mission 3D campaign, all five objective types, three weapons, shield/repair, directional damage, swept projectile collision, destructible crates and fuel drums, local checkpoints, capped upgrades, command/depot/failure/ending screens, minimap, responsive touch controls, sound and low graphics settings. The original 2D entry is preserved separately. Blender was located and used successfully, superseding the earlier setup note.

- TypeScript + production build passed for both entries.
- Eight Playwright tests passed: desktop controls and real asset loading; campaign conditions and progression; simultaneous mobile touch; real cannon/shield/repair/escort behavior; swept collision; directional armor; purchase/collision bounds; corrupt-save recovery and idempotent rewards.
- Six Blender GLBs validated: tank 2,024 triangles; transport 660; barricade 220; crate 132; barrel 176; relay 324. Total: 296,140 bytes. Editable source is committed.
- Screenshots inspected at 1440×900 desktop, 390×844 portrait and 844×390 landscape. Fixed landscape HUD/radio overlap and portrait horizontal camera tracking during verification.
- npm audit after compatible dependency fixes: 0 vulnerabilities.
- Capacitor sync passed with com.tankgame.steelfront3d, distinct from the original application.
- Font files are bundled locally under their included SIL licenses.

Browser integration fixtures intentionally set up specific mission boundary states; they do not establish difficulty balance through human playtesting. Physical-device performance and all-original-content parity are not claimed. The current release uses the shared flat Meridian arena with different objectives/opposition, local enemy steering, synthesized effects and text dialogue. Those are the explicit limits of this release.

Public GitHub and GitHub Pages publication was explicitly approved by the user. Deployment evidence follows once Actions completes.


### Compact UI revision

Reduced title scale, briefing width and padding, route cards, combat HUD height and radio copy. Moved extended story and instructions into a closed disclosure. Retained readable combat text and touch action targets. All eight regression tests and the production build passed after this revision; desktop, portrait and landscape screenshots were inspected.

### Public deployment verified

- Public source: https://github.com/buicongnguyen/Tankgame_3D
- Live game: https://buicongnguyen.github.io/Tankgame_3D/
- Deployed game commit: 56dcf65fd0026f317c7e2d92370027bfd9cc12d1, pushed using git@github.com:buicongnguyen/Tankgame_3D.git.
- Pages build, all eight browser/rules tests, and deploy succeeded: https://github.com/buicongnguyen/Tankgame_3D/actions/runs/34473414973
- Android debug APK build succeeded: https://github.com/buicongnguyen/Tankgame_3D/actions/runs/34473414827 (artifact: steel-front-3d-debug-apk).
- Public-browser verification: HTTP 200; all six GLB assets loaded; compact briefing collapsed by default; deploy, movement and fire reached the playing state; legacy canvas loaded; no page errors or failed requests.
- The original Tank_game repository remains unchanged.
