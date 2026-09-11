# Steel Front: Last Signal

A playable 3D tank rescue campaign built with **Three.js + TypeScript**, using original assets generated in **Blender 4.5**. Based on the Tank_game 2D baseline, preserved at [legacy.html](legacy.html).

**Play:** https://buicongnguyen.github.io/Tankgame_3D/

## The campaign

Lead Kestrel through nine operations to reopen the Meridian evacuation route: clear patrols, capture a relay, escort a rescue transport, defend an uplink, break a siege battery, and defeat Warden, then reclaim river villages, escort a winter relief convoy, and defend the ridge transmitter. Each operation includes a story briefing and debrief. First-clear credits buy persistent armor, damage and reload upgrades.

- Independently aimed turret, directional armor and real projectile travel.
- Blender trees, houses, stone/steel walls, bridges and rocky hills.
- Water, off-road snow and mud change tank speed; bridge and road routes preserve speed.
- Destructible cover, supply crates, explosive fuel drums and gasoline crates.
- Cannon, unlockable autocannon and siege rockets, plus collectible pulse laser and arc rockets.
- Three distinct bosses: Rail Titan, Tempest Carrier and the six-legged Iron Sovereign, with attack warnings and exposed-core windows.
- Blender riflemen and rocketeers support enemy armor across the campaign.
- Shield and fixed green repair centers.
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
| Aim/fire | Mouse or I/J/K/L aim; hold click, Space or F to fire | Right stick |
| Switch weapon | C opens selector; 1 / 2 / 3 / 4 / 5 selects directly | Tap Switch Gun, then choose a gun |
| Protective shield | Q | Shield button |
| Find repair center | E | Find Repair button |
| Pause | Escape | Pause button |

Autocannon unlocks after First Light; rockets unlock after Homeward. Stay within 12 meters of the convoy to move it. Capture progress requires occupying the amber ring without enemies inside it. The default shield lasts three seconds (4.5 seconds with Azure Guardian) and recharges in fourteen seconds. Healing during a mission is available only at repair centers. Settings and campaign checkpoints save in this browser; clearing site data resets them.

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

Explore a 144 × 120 m combat zone with flank cover, green repair pads, blue supply caches and proximity mines. **R / STRIKE** calls three artillery shells at your aim point; stay clear of the marked circles. Supplies provide sortie-only rockets, 25 seconds of boosted damage and a fresh strike.

Shell tracers, rocket exhaust, muzzle flashes, debris, shock rings, smoke, dust and persistent scorched wrecks replace the original simple hit/death effects. The escort route is now 98 m long. Effects are capped and reduced in low graphics mode.

Environment selection, behavior, source art and scope: [Environment expansion](docs/ENVIRONMENT_EXPANSION.md).

Infantry roles, weapon caches and ammunition: [Infantry and special weapons](docs/INFANTRY_AND_SPECIAL_WEAPONS.md).

Boss model kit, encounters and counterplay: [Boss variety](docs/BOSS_VARIETY.md).

## Explosives and rocket artwork

Mines hurt both sides. Gasoline crates damage nearby tanks, soldiers and destructible cover, and can set off nearby fuel containers. Rockets use a Blender model with fins, a nozzle and trailing smoke. See [combat rules and asset rebuilding](docs/EXPLOSIVES_AND_ROCKETS.md).

## Between-stage shop

Every stage completion, including the two campaign endings, offers **Shop · Upgrades & Weapons**. The command screen also opens the shop. Spend supply credits on permanent armor, damage and reload upgrades or weapon ownership. Autocannon costs 120 CR and siege rockets 180 CR; their existing free campaign unlocks still apply. Pulse laser costs 360 CR and starts each mission with 12 shots; arc rockets cost 420 CR and start with 6 rounds. Map caches supply extra ammo. Purchases persist across reloads and retries, and owned weapons cannot be purchased twice. Older saves migrate with their earned credits and upgrades intact.

## Combat usability update

Shop upgrades have shield, damage and reload icons. Every second enemy tank destroyed drops a labeled weapon box, alternating 12 laser shots and 6 arc rockets; drive over it to collect. These field drops last for the sortie and do not purchase permanent ownership. Infantry do not trigger tank drops, and no health pickups are dropped.

Both defense missions start Kestrel near the uplink. Initial opposition and reinforcements spawn at map corners and approach the center; ordinary enemies must close to 24 m to attack the relay. PC players can aim with I/J/K/L, fire with Space or F, strike with R, shield with Q and locate a repair center with E. Mouse controls remain available, and the desktop HUD includes a Fire button and shortcut guide.

Repair centers are large green circular service pads, marked with a green cross on the minimap. Drive within 3 m to restore up to 32 HP per second; each center provides 160 HP per mission. Tank wrecks, houses, weapon boxes and supply boxes do not heal. E / Find Repair reports the nearest available center and never restores health remotely.

## Lightweight destruction feedback

Hits on metal produce bright sparks; stone creates dust and gray chips; wood splinters and produces brief smoke. Destroyed wooden cover and fuel containers leave short flame/smoke effects and fading ground scorch marks. Existing fuel blast damage and chain reactions are unchanged; lingering flames are cosmetic.

Effects reuse the existing shard geometry and a single small procedural texture. Particles remain capped at 230 (85 in low mode), with at most six active cover fires (two in low mode). Fire lasts 2.8-4 seconds and scorch marks fade over eight seconds. Low mode also reduces large-explosion clouds. There are no added lights, shadow casters, physics debris or downloaded effect textures. Tests check particle/fire limits, expiration, repeat-hit behavior and mission cleanup; actual-device frame rates depend on hardware.

## Stage finish and performance bonuses

A completed objective starts a 0.8-second finish sequence: combat stops while destruction effects keep playing. The results screen then shows elapsed time, remaining hull, defeated tanks and soldiers, base reward, time bonus, hull bonus and total credits. Boss endings include the same breakdown and Shop access.

On the first clear, the hull bonus is 25% of the base reward multiplied by remaining hull percentage. The time bonus is 25% of the base reward multiplied by the fraction of the target time saved, clamped to zero for a late finish. Both round to whole credits. Target times for operations 1-9 are 90, 90, 150, fixed timer, 120, 150, 120, 150, fixed timer seconds. Fixed-duration defense stages have no time bonus. Replays show performance but do not grant duplicate rewards. Credits and progression save when the objective completes, before the short visual delay.

## Blender tank skins

Choose **Skin** before deploying, or open **Shop > Tank skins** between missions. Hull, trim, barrel, tracks and signal details use coordinated Blender palettes with rendered previews.

| Skin | Price | Equipped bonus |
| --- | --- | --- |
| Kestrel | Free | Standard performance |
| Sunburst | Free | Gold and purple colors |
| Volt Runner | 300 CR | +18% movement speed |
| Azure Guardian | 350 CR | Shield lasts 4.5 seconds instead of 3 |
| Crimson Fury | 450 CR | +15% weapon damage |

Buy once with earned supply credits. Ownership and selection persist; older saves keep their progress and receive both free skins. Equip one skin at a time, with its bonus applied next mission. Crimson Fury multiplies damage for all five tank weapons, including laser and arc rockets, alongside workshop upgrades and supply boosts. Artillery is unchanged. Volt Runner still respects terrain speed penalties; Guardian retains the fourteen-second shield cooldown.

Rebuild the artwork with your Blender executable:

```powershell
& 'C:\Users\n\source\repos\3d_astra\.tools\blender-4.5.3-windows-x64\blender.exe' --background --factory-startup --python tools/blender/build_skins.py
```

The generator writes five editable `assets/blender/skin-*.blend` files, transparent `public/skins/*.png` previews and `src/three/skin-palettes.ts`. Gameplay reuses the existing tank mesh with cached materials; skins add no combat geometry or lights. Tests cover purchases, save migration, damage, shield duration, movement, material reuse and the mobile shop.

## Purchased weapon selection

The combat weapon panel always shows **Switch Gun**. Click or tap it to select a weapon, press **C** to open the same selector on PC, or use **1–5** directly. Buying a weapon sets it as the next mission's starting gun. Selecting an owned gun in combat remembers that choice for reloads, retries and later missions; temporary map pickups do not become permanent purchases. Owned lasers receive 12 shots and arc rockets 6 rounds each mission. An empty special weapon is labeled **Empty · find ammo**, and its last shot returns to the cannon. Collect a cache or start the next mission to replenish it.
