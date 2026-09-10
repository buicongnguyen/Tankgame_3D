# Steel Front: Last Signal

A playable 3D tank rescue campaign built with **Three.js + TypeScript**, using original assets generated in **Blender 4.5**. Based on the Tank_game 2D baseline, preserved at [legacy.html](legacy.html).

**Play:** https://buicongnguyen.github.io/Tankgame_3D/

## The campaign

Lead Kestrel through nine operations to reopen the Meridian evacuation route: clear patrols, capture a relay, escort a rescue transport, defend an uplink, break a siege battery, and defeat Warden, then reclaim river villages, escort a winter relief convoy, and defend the ridge transmitter. Each operation includes a story briefing and debrief. First-clear credits buy persistent armor, damage and reload upgrades.

- Independently aimed turret, directional armor and real projectile travel.
- Blender trees, houses, stone/steel walls, bridges and rocky hills.
- Water, off-road snow and mud change tank speed; bridge and road routes preserve speed.
- Destructible cover, house medical salvage, supply crates, explosive fuel drums and gasoline crates.
- Cannon, unlockable autocannon and siege rockets, plus collectible pulse laser and arc rockets.
- Three distinct bosses: Rail Titan, Tempest Carrier and the six-legged Iron Sovereign, with attack warnings and exposed-core windows.
- Blender riflemen and rocketeers support enemy armor across the campaign.
- Shield, consumable repair and field repair pickups.
- Three difficulty modes; mission checkpoints, retries and replay.
- Responsive command screen, minimap, objective HUD and simultaneous touch sticks.
- Optional synthesized combat audio; low graphics mode; locally bundled fonts.

This release is a nine-mission adaptation. The original fifteen-stage campaign, enterable infantry shelters, complete arsenal and chassis shop remain in the separate 2D reference; they are not all ported into this release.

## Run and verify

Requires Node.js 22+.

```powershell
npm ci
npm run dev
npm run build
npm run test:assets
npx playwright install chromium webkit
npm test
```

The browser tests use controlled integration fixtures for mission edge cases, along with real keyboard, mouse and multitouch events. Test-only access is enabled on the development server with `?e2e`; it is removed from production builds. Browser tests are not a substitute for physical Android device performance testing.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Drive | WASD or arrow keys | Left stick |
| Aim/fire | Mouse + hold primary click, or Space | Right stick |
| Switch weapon | 1 / 2 / 3 / 4 / 5 | Tap weapon panel, then choose a gun |
| Protective shield | Q | Shield button |
| Repair | E | Repair button |
| Pause | Escape | Pause button |

Autocannon unlocks after First Light; rockets unlock after Homeward. Stay within 12 meters of the convoy to move it. Capture progress requires occupying the amber ring without enemies inside it. The shield lasts three seconds and recharges in fourteen seconds. Each mission provides one repair kit. Settings and campaign checkpoints save in this browser; clearing site data resets them.

## Rebuild the Blender assets

Editable source: `assets/blender/steel-front.blend`. Generator: `tools/blender/build_assets.py`. Runtime exports: `public/models/*.glb`.

```powershell
& 'C:\Users\n\source\repos\3d_astra\.tools\blender-4.5.3-windows-x64\blender.exe' --background --factory-startup --python tools/blender/build_assets.py
npm run test:assets
```

Use your own Blender executable location on another machine. The 19 exported assets total 598,224 bytes; the tank has 2,024 triangles. Tank hull and turret are independent nodes, and the muzzle attachment determines shot origin. Source files and exports are committed, so ordinary web builds do not require Blender.

## Architecture and planning

See [the detailed evaluation and production plan](docs/3D_PRODUCTION_PLAN.md), including scope, story, UX, Blender workflow, combat rules, acceptance checks, and future expansion. Runtime modules live in `src/three/`; original Phaser code is retained in `src/game/` and `src/legacy-main.ts`.

## Deployment

Git remote: `git@github.com:buicongnguyen/Tankgame_3D.git`. The Pages workflow runs asset validation, browser tests and the production build before deployment from `main`. Android CI builds a separate `com.tankgame.steelfront3d` application and uploads `steel-front-3d-debug.apk` as an Actions artifact. Tags matching `android-v*` publish a prerelease APK.

```powershell
npm run android:sync
npm run android:run
```

The APK is a debug build. The default web route is the 3D campaign; `legacy.html` loads the original 2D game separately, so Phaser is not part of the 3D runtime bundle.

## Known limits

Flat gameplay plane with 3D models; no terrain climbing or rigid-body simulation. Enemy navigation uses local steering, not a global pathfinding solver. The six operations share the Meridian arena, with mission-specific objectives and opposition. Audio is procedural effects rather than voiced dialogue or an authored soundtrack. Physical-phone framerate and thermal testing remain follow-up work.

## Asset attribution

Game models and narrative are authored for this project. Barlow and Barlow Condensed are bundled under the SIL Open Font License; licenses are in `public/fonts/`. Three.js, Phaser and other dependencies retain their own package licenses.

## Battlefield update

Explore a 144 × 120 m combat zone with flank cover, green repair pads, blue supply caches and proximity mines. **R / STRIKE** calls three artillery shells at your aim point; stay clear of the marked circles. Supplies provide a repair kit, sortie-only rockets, 25 seconds of boosted damage and a fresh strike.

Shell tracers, rocket exhaust, muzzle flashes, debris, shock rings, smoke, dust and persistent scorched wrecks replace the original simple hit/death effects. The escort route is now 98 m long. Effects are capped and reduced in low graphics mode.

Environment selection, behavior, source art and scope: [Environment expansion](docs/ENVIRONMENT_EXPANSION.md).

Infantry roles, weapon caches and ammunition: [Infantry and special weapons](docs/INFANTRY_AND_SPECIAL_WEAPONS.md).

Boss model kit, encounters and counterplay: [Boss variety](docs/BOSS_VARIETY.md).

## Explosives and rocket artwork

Mines hurt both sides. Gasoline crates damage nearby tanks, soldiers and destructible cover, and can set off nearby fuel containers. Rockets use a Blender model with fins, a nozzle and trailing smoke. See [combat rules and asset rebuilding](docs/EXPLOSIVES_AND_ROCKETS.md).
