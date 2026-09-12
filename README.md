# Steel Front: Last Signal

A playable 3D tank rescue campaign built with **Three.js + TypeScript**, using original assets generated in **Blender 4.5**. Based on the Tank_game 2D baseline, preserved at [legacy.html](legacy.html).

**Play:** https://buicongnguyen.github.io/Tankgame_3D/

## The campaign

Lead Kestrel through sixteen stages, each with three levels (48 levels in total), to reopen the Meridian evacuation route: clear patrols, capture a relay, escort a rescue transport, defend an uplink, break a siege battery, and defeat Warden, then reclaim river villages, escort a winter relief convoy, and defend the ridge transmitter. The frontier chapter adds a polar relay, erupting volcano, desert convoy route, jungle defense and occupied city, followed by a seismic rift and flooded lowlands. Each stage includes a story briefing and debrief. First-clear credits from each level buy persistent armor, damage and reload upgrades, weapons and tank skins. Approach and Counterattack lead to a Command battle with one to four bosses.

- Independently aimed turret, directional armor and real projectile travel.
- Blender trees, houses, stone/steel walls, bridges, rocky hills, glaciers, white pines, a volcano, palms, dense broadleaf trees and city blocks.
- Polar ice carries momentum; desert sand traps reduce player and enemy speed to exactly one quarter.
- Volcanic rocks warn for 2.6 seconds before landing and can damage either side, infantry and destructible cover.
- Earthquakes warn before stopping ground tanks for 1.6 seconds, with rising dust; guns, infantry and airborne helicopters remain active.
- Marsh water holes slow and visually sink tanks; periodic traction recovery lets them escape. Bridge and road routes preserve speed.
- Destructible cover, supply crates, explosive fuel drums and gasoline crates.
- S, mirrored S, diagonal S, U and open O loops on 22 later levels. Every background starts with a direct route or short relay circuit, then uses progressively longer routes. O loops allow either direction during play. Most interior ridges become two or three rows of destructible concrete, with a few indestructible Blender hills and basalt landmarks remaining. See [O loops and boss reinforcements](docs/O_LOOPS_AND_BOSS_REINFORCEMENTS.md).
- Cannon, unlockable autocannon and siege rockets, plus collectible pulse laser and arc rockets.
- Nine boss types: Rail Titan, Tempest Carrier, Iron Sovereign, helicopter, climbing spider, laser tank, Iron Vanguard four-gun robot, Siege Marshal rocket/gun robot and Atlas Launcher missile truck. Each has attack warnings and exposed-core windows. Helicopters land behind cover; spiders climb it and rest; laser bursts stop at solid cover.
- Blender riflemen and rocketeers watch from trees; tanks guard buildings and fuel containers. Solid cover blocks detection and aimed fire. Nearby squadmates react to sightings or hits; ordinary enemies investigate the last sighting for six seconds. See [enemy guard posts and sight](docs/ENEMY_GUARD_POSTS_AND_SIGHT.md).
- Shield and fixed green repair centers.
- Four difficulty modes; stage/level checkpoints, retries and replay.
- Responsive command screen, minimap, objective HUD and simultaneous touch sticks.
- Optional synthesized combat audio; selectable Detailed / Low detail graphics; locally bundled fonts.

| Mode | Player hull | Regular enemies and reinforcement batches | Bosses on level 3 |
| --- | --- | --- | --- |
| Easy | +50% | 1× | 1 |
| Normal | Standard | 1× | 1 |
| Hard | Standard | 2× | 2 |
| Crazy | Standard | 4× | 4 |

Bosses use faster light volleys and wider warned heavy attacks; see [boss attack balance](docs/BOSS_ATTACK_BALANCE.md) for timings and counterplay.

Enemy armor and infantry both use the multiplier. Bosses are additional units on the third level; every boss must fall before completion, alongside the stage objective. The first two levels of former boss stages are patrol battles. Higher modes do not increase enemy damage or reduce player hull. A large Crazy finale starts with 32 tanks, 72 riflemen, 28 rocketeers, 12 scout jeeps and four bosses. Normal First Light starts with 5 tanks, 9 riflemen, 4 rocketeers and one jeep. Rifle and jeep bullets deal 3 damage; jeeps fire short three-round bursts.

The separate fifteen-stage 2D campaign and its enterable infantry shelters remain available through the legacy route. Historical six-, nine- and fourteen-stage saves retain completed stages, purchases, credits and graphics settings; completed old stages expose all three levels for replay. Story/Standard/Veteran settings migrate to Easy/Normal/Hard. New progress saves after every level; replaying a completed level never awards duplicate credits.

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
| Air support | R opens selector; then 1 barrage / 2 supply drop | Air Support button, then choose |
| Protective shield | Q | Shield button |
| Find repair center | E | Find Repair button |
| Pause | Escape | Pause button |

Autocannon unlocks after First Light; rockets unlock after Homeward. Stay within 12 meters of the convoy to move it. Capture progress requires occupying the amber ring without enemies inside it. The default shield lasts three seconds (4.5 seconds with Azure Guardian) and recharges in fourteen seconds. White medical cases restore up to 60 HP. Repair centers provide sustained healing; blue shield cases activate a field for the indicated duration without resetting Q. Settings and campaign checkpoints save in this browser; clearing site data resets them.

## Mobile graphics

Tap **Graphics** on the command screen or in **Pause** to choose **Detailed** or **Low detail**. Low detail uses simpler Blender models, a smaller rendering buffer, fewer effects, and no dynamic shadows or reflection lighting. Text and touch controls retain their normal resolution. The setting saves locally and applies to the current stage without resetting your tank or mission.

Only the selected model tier downloads on startup. Low detail contains 33 models totaling 1.76 MB; the tank uses 1,692 triangles instead of 5,712. Switch back to Detailed whenever desired. Actual frame rate depends on the phone.

## Rebuild the Blender assets

Editable sources include `assets/blender/steel-front.blend` and `assets/blender/frontier-environments.blend`. Generators include `tools/blender/build_assets.py`, `tools/blender/build_frontier.py` and `tools/blender/build_extreme_bosses.py`. The last generator writes four separate editable scenes for the helicopter, spider, laser tank and white pine. Runtime exports: `public/models/*.glb`. After the base and extreme boss generators, run `tools/blender/build_reinforcement_bosses.py` to create the two humanoids and missile truck and add light guns to all six older boss scenes. It saves editable meshes before merging runtime surfaces. Run `tools/blender/build_scout_jeep.py` for the crewed light jeep, then run `tools/blender/build_low_detail.py` with Blender to rebuild `public/models/low/*.glb`.

```powershell
& 'C:\Users\n\source\repos\3d_astra\.tools\blender-4.5.3-windows-x64\blender.exe' --background --factory-startup --python tools/blender/build_assets.py
npm run test:assets
```

Use your own Blender executable location on another machine. The 33 detailed exports total 3,991,144 bytes; the tank has 5,712 triangles. Tank hull and turret are independent nodes, and the muzzle attachment determines shot origin. Source files and exports are committed, so ordinary web builds do not require Blender.

## Architecture and planning

See [the detailed evaluation and production plan](docs/3D_PRODUCTION_PLAN.md), including scope, story, UX, Blender workflow, combat rules, acceptance checks, and future expansion. See also the [piercing laser and stage routes plan](docs/LASER_AND_STAGE_ROUTES_PLAN.md), [route and laser review](docs/LASER_AND_STAGE_ROUTES_REVIEW.md), [frontier campaign plan](docs/FRONTIER_CAMPAIGN_PLAN.md), [48-level expansion plan](docs/CAMPAIGN_LEVELS_AND_EXTREME_MODES_PLAN.md) and [expansion code, logic and visual review](docs/CAMPAIGN_LEVELS_AND_EXTREME_MODES_REVIEW.md). Runtime modules live in `src/three/`; original Phaser code is retained in `src/game/` and `src/legacy-main.ts`.

## Deployment

Git remote: `git@github.com:buicongnguyen/Tankgame_3D.git`. The Pages workflow runs asset validation, browser tests and the production build before deployment from `main`. Android CI builds a separate `com.tankgame.steelfront3d` application and uploads `steel-front-3d-debug.apk` as an Actions artifact. Tags matching `android-v*` publish a prerelease APK.

```powershell
npm run android:sync
npm run android:run
```

The APK is a debug build. The default web route is the 3D campaign; `legacy.html` loads the original 2D game separately, so Phaser is not part of the 3D runtime bundle.

## Known limits

Player movement uses a flat gameplay plane with ice momentum and visual mud sinking; helicopter flight and spider climbing use scripted elevation. There is no rigid-body simulation. Ground enemies combine local steering with shared navigation fields to get around cover. All sixteen stages use the 144 × 120 m battlefield bounds, with biome-specific scenery, terrain rules, hazards and objectives. Audio is procedural effects rather than voiced dialogue or an authored soundtrack. Physical-phone framerate and thermal testing remain follow-up work.

## Asset attribution

Game models and narrative are authored for this project. Barlow and Barlow Condensed are bundled under the SIL Open Font License; licenses are in `public/fonts/`. Three.js, Phaser and other dependencies retain their own package licenses.

## Battlefield update

Explore a 144 × 120 m combat zone with flank cover, a green repair stop, combat loot and proximity mines. **R / AIR SUPPORT** offers a five-shell barrage at your aim point or a nearby parachute supply drop. Stay clear of amber barrage circles. Hard capture/defense missions allow one supply drop; Crazy allows two. Both choices share a 28-second cooldown. Drops provide a small health, special-ammo or shield refill based on current needs, and can only be collected after landing. Red mine circles show the enlarged 2.7 m trigger radius. Destroyed tanks can leave medical, shield, laser or arc-rocket crates beside their wrecks.

Shell tracers, rocket exhaust, muzzle flashes, debris, shock rings, smoke, dust and persistent scorched wrecks replace the original simple hit/death effects. Escorts follow their stage-specific route through every bend. Effects are capped and reduced in low graphics mode.

Environment selection, behavior, source art and scope: [Environment expansion](docs/ENVIRONMENT_EXPANSION.md).

Infantry roles, weapon caches and ammunition: [Infantry and special weapons](docs/INFANTRY_AND_SPECIAL_WEAPONS.md).

Boss model kit, encounters and counterplay: [Boss variety](docs/BOSS_VARIETY.md).

## Explosives and rocket artwork

Mines hurt both sides. Gasoline crates damage nearby tanks, soldiers and destructible cover, and can set off nearby fuel containers. Rockets use a Blender model with fins, a nozzle and trailing smoke. See [combat rules and asset rebuilding](docs/EXPLOSIVES_AND_ROCKETS.md).

## Between-level shop

Every level completion, including the chapter and campaign endings, offers **Shop · Upgrades & Weapons**. The command screen also opens the shop. Spend supply credits on permanent armor, damage and reload upgrades or weapon ownership. Autocannon costs 120 CR and siege rockets 180 CR; their existing free campaign unlocks still apply. Pulse laser costs 360 CR and starts each mission with 12 shots; arc rockets cost 420 CR and start with 6 rounds. Wreck crates replenish ammunition up to the 12-laser / 6-rocket carry limits. Full ammunition leaves the crate available for later. Purchases persist across reloads and retries, and owned weapons cannot be purchased twice. Older saves migrate with their earned credits and upgrades intact.

## Combat usability update

Shop upgrades have shield, damage and reload icons. Tank salvage becomes rarer with difficulty: every 2 / 4 / 12 / 32 tank kills on Easy / Normal / Hard / Crazy, capped at 4 / 2 / 1 / 1 drops per stage. Boxes alternate 12 laser shots and 6 arc rockets and are placed on the clear nearby road; drive over one to collect. These field drops last for the sortie and do not purchase permanent ownership. Infantry do not trigger tank drops, and no health pickups are dropped.

All defense missions start Kestrel near the uplink. Initial opposition starts in staggered perimeter waves, including finale bosses; reinforcements also spawn at map corners and approach the center; ordinary enemies must close to 24 m to attack the relay. PC players can aim with I/J/K/L, fire with Space or F, open Air Support with R (1 barrage / 2 supply), shield with Q and locate a repair center with E. Mouse controls remain available, and the desktop HUD includes a Fire button and shortcut guide.

Repair centers are large green circular service pads, marked with a green cross on the minimap. Drive within 3 m to restore up to 32 HP per second; starting capacity is 160 / 100 / 80 / 60 HP on Easy / Normal / Hard / Crazy, falling by 20 HP per sublevel to a minimum of 40. Medical cases dropped by tanks can also heal; houses and weapon boxes do not. E / Find Repair reports the nearest available center and never restores health remotely.

## Lightweight destruction feedback

Hits on metal produce bright sparks; stone creates dust and gray chips; wood splinters and produces brief smoke. Destroyed wooden cover and fuel containers leave short flame/smoke effects and fading ground scorch marks. Existing fuel blast damage and chain reactions are unchanged; lingering flames are cosmetic.

Effects reuse the existing shard geometry and a single small procedural texture. Particles remain capped at 230 (85 in low mode), with at most six active cover fires (two in low mode). Fire lasts 2.8-4 seconds and scorch marks fade over eight seconds. Low mode also reduces large-explosion clouds. There are no added lights, shadow casters, physics debris or downloaded effect textures. Tests check particle/fire limits, expiration, repeat-hit behavior and mission cleanup; actual-device frame rates depend on hardware.

## Stage finish and performance bonuses

A completed objective starts a 0.8-second finish sequence: combat stops while destruction effects keep playing. The results screen then shows elapsed time, remaining hull, defeated tanks and soldiers, base reward, time bonus, hull bonus and total credits. Boss endings include the same breakdown and Shop access.

On the first clear, the hull bonus is 25% of the base reward multiplied by remaining hull percentage. The time bonus is 25% of the base reward multiplied by the fraction of the target time saved, clamped to zero for a late finish. Both round to whole credits. Target times for operations 1-9 are 90, 90, 150, fixed timer, 120, 150, 120, 150, fixed timer seconds. Level-one targets for stages 10–16 are 110, 150, 180, fixed timer, 170, 140 and 190 seconds. Counterattack target times increase by 20%; Command battle targets increase by 60%. Per-level base rewards are 65%, 80% and 100% of the stage reward. Counterattack capture/defense durations also increase by 20%. Fixed-duration defense stages have no time bonus. Replays show performance but do not grant duplicate rewards. Credits and progression save when the objective completes, before the short visual delay.

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

## Arc rocket range assistance

Arc rockets now adapt their landing distance to live enemies in an 18-degree cone when aiming with the touch stick or I/J/K/L. Assistance considers targets 10–45 meters away, favoring nearer aligned enemies; with no target the normal 28-meter aim remains. Mouse aim only snaps within 3 meters of an enemy, preserving deliberate ground targeting. The purple aim ring previews the seven-meter blast radius. Destinations stay fixed after launch; rockets still cross cover and blasts can hurt either side. Ordinary siege rockets remain direct-fire projectiles.

## Detailed Blender visual pass

The tank now has sloped armor, layered track shoes, wheel hubs, a gun mantlet and sleeve, optics, smoke launchers and engine louvres. Vehicles gain glazing, mirrors, grilles and cargo ribs; houses gain window frames, sills, roof seams, gutters and chimney details. Supplies, bosses, infantry and foliage have additional structural geometry. Metal, rubber, glass and paint use distinct PBR responses, with reflected studio lighting in normal mode and simplified lighting in low mode.

The expanded 33-model kit uses 3,991,144 bytes, below its 4 MB detailed-tier budget. Runtime meshes are grouped by material within animated pivots; turrets, legs, muzzle/exhaust attachments and boss weak points remain independent. Five shop previews are rendered in Blender Eevee at 512 x 384. See [visual quality scope and rebuilding](docs/VISUAL_QUALITY.md). This is a more detailed browser art pass, not a claim of full AAA photorealism.

## Winter wreck stability and infantry contact

Burnt wrecks use soft scorch marks placed above snow and ice, with explicit depth bias. Wrecks cast shadows but do not receive unstable self-shadows from their small mechanical details. Both the wreck and its mark are removed together when the 14-wreck limit is reached or a stage changes.

Driving Kestrel into hostile infantry at **3 m/s or more** now defeats them. Stationary contact and slow nudges do not. Sand penalties and ice momentum affect actual contact speed; walls and other vehicles still stop the tank. These defeats count as infantry kills, never tank-objective progress or tank weapon-box drops. Enemy armor does not run down its own infantry.

The frontier art now includes packed Blender albedo/normal maps (maximum 128 × 128), irregular ice and basalt, lava channels that follow the volcano slopes, palm leaflets, branched tree crowns, building sills/balconies/roof services, city sidewalks and textured terrain. Boundary scenery uses shared geometry instances. Low detail uses 14,708 triangles across the 33-model kit versus 52,562 in Detailed (72% fewer), with about 1.76 MB of GLBs. The new Blender scout jeep includes a visible driver and gunner, rotating machine gun, animated wheels, windshield, roll cage and spare tire.

See the [implementation plan](docs/RENDERING_AND_FRONTIER_POLISH_PLAN.md) and [code, logic and visual review](docs/RENDERING_AND_FRONTIER_POLISH_REVIEW.md). This remains a stylized browser game; the art pass improves material and construction detail without claiming full AAA photorealism.

## Routes and field supplies

All 48 levels use marked routes, including west-to-east zigzags, south-to-north journeys, southwest-to-northeast approaches, southbound convoy tracks and circuits around defense relays. Each map has one fixed repair center, with one extra field cache on Easy, plus six off-road mines. Fixed recovery sits 7–10 m off the route; optional Easy weapon caches sit near road guards. Tank and boss kills roll a one-in-three chance for a nearby crate: medical 35%, shield 20%, laser 25%, arc rockets 20% of successful rolls. Drops must fit on reachable open ground within 8 m of the wreck. Infantry and jeeps never drop items. Per-level caps are 6 / 4 / 4 / 5 on Easy / Normal / Hard / Crazy, so larger enemy counts cannot multiply recovery indefinitely. Later sublevels and harder modes reduce crate contents. Layouts are reproducible; combat drops are random.

Enemies occupy route sectors near buildings, fuel or trees. Some guard their posts; others make local patrols with pauses to scan. Tanks farther from the road use wider patrol loops reaching toward it, and scout jeeps move faster. Clear sight or a hit alerts nearby squadmates; solid cover hides you. After investigating a lost sighting, patrolling units return home. Bosses guard the final approach; defense stages retain timed perimeter waves. Waiting and patrolling vehicles remain included in objectives. Assault and boss stages require the marked exit after clearing their combat objective. Convoys follow every bend, stop for ground traffic, and reach extraction only after the complete route.

The player pulse laser pierces multiple enemies and one concrete barrier. A second concrete barrier stops that shot. The laser does not damage either barrier, even with upgrades or repeated hits. Steel and other cover still block the beam. Medical cases heal only a damaged tank and cap at maximum hull; shield cases do not stack duration. Shield crates do not reset the shield ability cooldown. Concrete has independent 176 HP sections: four standard cannon hits open just the struck section, while stronger conventional attacks and local explosions use their usual damage. Adjacent sections keep their collision until individually destroyed. See the [route, supply and encounter plan](docs/ROUTE_ENCOUNTERS_AND_SUPPLIES_PLAN.md).

Eight levels feature a true 45° S route: Homeward 3, Glass Road 2, Last Signal 3, Frozen Pass 2, Dune Lifeline 3, Citadel Dawn 2, Fault Line 2 and Mire Crossing 3. Roads, convoy turns and terrain reservations follow the diagonal lanes. See [the route and cache plan](docs/DIAGONAL_ROUTES_AND_WEAPON_CACHES.md).

O loops replace L routes. Circle either way or turn back during play; ambushes wake locally in both directions. Clear the patrol and return to the starting gate. The Homeward level 2 convoy waits for your first left/right branch choice, then follows that full circuit while you remain free to flank. Every traveling background increases route length across its three levels; relay capture and timed defense keep their established objective geography.

Meet Iron Vanguard in **Glass Road 3**, Siege Marshal in **Cinderfall 3**, and Atlas Launcher in **Citadel Dawn 3**. Old bosses have an additional Blender light gun. Auxiliary fire pauses during heavy attack warnings and core recovery; the Marshal alternates both hand guns. New launchers fire paired, overlapping warned missile zones with visible arcing rockets and exhaust smoke. Later Hard/Crazy finales can mix the new bosses while retaining the existing boss-count limits.

See the [infantry, jeep, patrol and loot balance plan](docs/INFANTRY_JEEPS_PATROLS_AND_LOOT.md) for the current encounter and recovery rules.

## Air support and route progression

See [Air support, threat ranges and breachable routes](docs/AIR_SUPPORT_AND_BREACHABLE_ROUTES.md) for the design and verification plan. Enemy sight reaches 34 m for infantry, 44 m for ordinary vehicles and 48 m for bosses; solid cover still blocks detection. Concrete rows share batched rendering but keep independent wall and section damage. A base cannon breaks one section in four hits; laser passes through the first row without damaging it and stops at the second.
