# Beginner campaign, mission clarity and allied vehicles

Status: implemented; verification and deployment tracked in BEGINNER_CAMPAIGN_REVIEW.md.
The design below records the approved scope and initial tuning. Real-device beginner
playtesting remains useful for adjusting these values.

## 1. Assessment

The proposal addresses a real progression problem. The campaign has 16 stages,
each with three levels: 48 combat missions. The current first level on Easy/Normal
contains five tanks, nine riflemen, four rocketeers and one jeep: 19 enemies.
The playable bounds are approximately 144 × 120 world units. Halving Easy enemy
health makes combat more forgiving, but does not teach controls, reduce the number
of threats to understand, or remove long stretches of travel.

Recommended direction:

- Add three short, authored training missions before the existing campaign.
- Give each training mission one level. Do not require nine tutorial levels or a
  tutorial boss before players reach the story.
- Keep the 16 existing stage identities and save indices. Show Training separately
  from the campaign, for 51 playable missions in total.
- Improve defense visibility and escort support next, then add a later rescue
  mission. Friendly-unit AI should follow the recent mobile-stability work.
- Make the transition into First Light gentler on Easy. Otherwise, players would
  leave a tiny tutorial and immediately encounter the original 19-enemy jump.

## 2. Three small beginner missions

Dimensions are playable world units, with real collision boundaries—not simply a
closer camera looking at the original large arena.

| Mission | Map / route | Opposition | Main lessons | Target duration |
| --- | --- | --- | --- | --- |
| T1 — First Tracks | 32 × 48; bottom to top | Three riflemen, introduced as one then two | Drag to move; turn; aim and fire; reach the exit | 60–90 seconds |
| T2 — First Armor | 52 × 32; left to right | Four riflemen and two light tanks, in separate encounters | Use cover; flank a tank; collect a weapon; switch weapons | 90–120 seconds |
| T3 — Signal Drill | 44 × 40; one straight enemy approach from south to north | Two mini-waves, each with two riflemen and one light tank | Protect a bright relay; shield; call Strike | 90–120 seconds |

T3 starts the player beside the relay at the north end. The approach remains simple,
but the player can move around the relay and one piece of cover. It introduces
defense without requiring a full-map search.

Rules for all three:

- Easy training rules, fixed authored counts, and no boss. Selecting Hard/Crazy for
  the main campaign must not multiply tutorial enemies.
- First movement is safe. Enemies activate only after the relevant lesson begins.
  Ordinary sight ranges span almost the whole small arena, so distance alone must
  not activate every tutorial enemy.
- No mines, rockfalls, ice sliding, mud, dense buildings or surprise rear spawns.
- Two or three recognizable scenery pieces, a solid low-cost rock boundary,
  contrasting route arrows and a clearly marked destination.
- Useful training pickups are guaranteed. Do not make learning to switch weapons
  depend on the normal one-in-three loot roll.
- Training loan weapons, Strike charges and supply drops use a separate temporary
  loadout. They do not consume campaign stock, create background Strike grants, or
  permanently unlock weapons by accident.
- Suggested completion rewards: 10 / 20 / 30 credits once, not on every replay.
  No speed bonus, punitive star rating or competitive leaderboard in training.
- Completion requires the lesson and its destination/objective. Killing the last
  soldier must not skip an unfinished movement or weapon-switch lesson.

New players see Start Training as the primary action and a quieter Skip Training.
Existing saves continue their campaign and can find Replay Training in Settings.
Save completed lessons and one-time rewards; a mid-lesson reload can restart that
short lesson safely rather than persisting partially completed combat state.

### Transition into the campaign

On Easy, give First Light level 1 a medium arena around 72 × 64 with four riflemen
and two light tanks, split into two encounters. No rocketeer or jeep yet. Level 2
introduces those threats one at a time; level 3 introduces the existing boss with
its warning-and-vulnerability lesson. Restore full arena complexity gradually.
Keep Normal/Hard/Crazy campaign configurations available for experienced players.

The exact level-2/3 counts should follow playtesting. Avoid changing all 16 stages
at once merely to make the first ten minutes easier.

## 3. Contextual tutorial UI

Use one short hint and one highlighted control at a time. A gentle outline pulse
and a small arrow are enough; a static outline serves reduced-motion users.
Do not cover the battlefield with a tutorial paragraph or flash the whole screen.

| Teaching moment | Mobile | Desktop | Completion event |
| --- | --- | --- | --- |
| Move | Highlight left stick; animated thumb/arrow says “Drag to move” | Show WASD / arrows | Actual displacement through the marked checkpoint |
| Aim and fire | Highlight right stick; “Drag to aim & fire” | Mouse + click, or aim keys + Space/F | A shot hits the marked target |
| Change weapon | Highlight Switch Gun, then the available weapon | Show the corresponding number key or C | Requested weapon is selected |
| Shield | Highlight Shield | Show Q | Shield activates |
| Strike | Highlight Strike; mark a nearby enemy group | Show R | Strike is accepted with valid targets |
| Drop / Auto | Show only when first relevant or bought | Show T / E | Drop request / missile launch succeeds |

The mobile game uses sticks, so instructions must teach dragging left/right, not
pretend there are separate left/right buttons. Listen to successful gameplay
actions rather than raw clicks: keyboard, touch, mouse and remapped actions should
all satisfy the same lesson.

Stage the UI: T1 shows movement and firing; T2 adds weapon selection; T3 introduces
Shield and Strike. Teach Drop and purchased Auto missiles when they first become
useful, or offer them in an optional practice step. Do not teach every button at
once. A skipped hint must never block a mission.

During a mandatory introductory explanation, suspend enemy attacks and objective
timers while keeping the relevant practice control usable. Do not use the normal
Pause state indiscriminately: it disables the very input being taught. Main-campaign
hints should be brief and nonblocking. Clear pointers/highlights on pause, retry,
rotation, backgrounding and mission transitions.

## 4. Defense: start beside a readable objective

Currently the relay is at (0, −13) and the player starts at (−4, −3), approximately
11 units away. Start 3–5 units beside it, facing the first approach. Reserve this
space before placing scenery; do not place the tank inside the relay model.

Use a recognizable relay silhouette with cyan/white panels, amber antenna strips,
a strong ground ring and a shield/antenna icon. Critical health changes the icon
and outline as well as color. Keep enemy danger markers red. Blender can provide
a detailed and low-detail version with shared materials; avoid extra point lights,
large transparent glow volumes or extra shadow passes.

Attach one compact label above the relay:

```
UPLINK  86%
WAVE 2/4 · NEXT IN 08s
```

The existing defense rules are four-wave elimination, not timed survival. Current
activation times are 0, 4, 8 and 12 seconds, which can make all four groups overlap.
Do not show “45 seconds remaining” and then keep the player fighting indefinitely.

Recommended wave schedule on Easy:

1. Seven seconds of preparation before the first approach.
2. Next-wave countdown begins when the active wave is cleared or nearly cleared
   (initial target: 25% remaining), with an 8–10 second warning.
3. Show an approach-edge arrow during the warning. Spawn beyond immediate firing
   distance and have enemies advance toward the objective.
4. After the final wave releases, replace the countdown with “N hostiles left”.
5. Complete only when all planned waves are released and all their hostiles are
   defeated; fail immediately if the uplink is destroyed.

Higher difficulties can overlap waves more, within an explicit active-enemy budget.
Reserve units should stay as data until needed where practical, reducing the cost
of rendering dormant groups. Do not let an empty interval between waves trigger
the generic “all enemies dead” completion rule.

A future timed-survival variant is also possible, but it needs its own objective:
“Keep the uplink alive until 00:00”, explicit reinforcement rules, and a truthful
survival clock. Keep that separate from wave defense.

Update label position with the camera; update countdown text only when its displayed
second changes. One projected HTML label or shared sprite is enough. Keep the relay
icon on the minimap and use an edge arrow when it is off screen.

## 5. Transport support that tapers as the player learns

Recommended interpretation of “first, second, then unarmed”: use Homeward's three
levels to teach this progression before the longer snow/desert/marsh escorts.

| Homeward level | Transport | Initial tuning proposal |
| --- | --- | --- |
| 1 | Roof missile launcher | One guided missile every six seconds; 60 direct damage, small 2.5-unit blast; 24-unit target range |
| 2 | Roof machine gun | Three-round burst every two seconds; 3 damage per bullet; 22-unit range |
| 3 | Unarmed | Current transport behavior |

Frozen Pass, Dune Lifeline and Mire Crossing remain unarmed by default. If weapon
variants should instead distinguish entire backgrounds, the alternative is
Homeward = missiles, Frozen Pass = machine gun, desert/marsh = unarmed. Choose one
consistent progression, rather than changing equipment unpredictably.

Support should noticeably assist without completing the fight for the player.
Use unlimited transport ammunition with a conservative cooldown so the player does
not have to manage another inventory. Reuse the current 1,040-HP hull, escort-distance
rule and player/transport shield behavior during the first tuning pass.

Combat rules:

- Acquire only active, living hostile targets in range and line of sight. Do not
  reveal dormant ambushes or fire through a house with a machine gun.
- Missiles prioritize hostile vehicles; the machine gun prioritizes infantry.
  Ground-only targeting is the initial scope.
- Firing works while moving or waiting, but stops when paused, destroyed or after
  mission completion. Target scans can run around five times per second.
- Use independent cooldown and damage configuration. Do not call the player's
  Strike action or consume their missiles, support charges or ammo.
- Direct allied gunfire/blasts cannot damage Kestrel, the convoy, relay or allies.
  Environmental fuel chain reactions retain the existing hazard rules and warnings.
- Preserve current early completion when every hostile is defeated and the
  transport is alive; do not require an empty drive to the exit.

Blender asset work: reuse the current transport hull, adding detachable missile
and machine-gun modules with Turret/Muzzle/Exhaust pivots. Produce matching low/high
tiers. Weapon type should be obvious from shape, not only a small text label.

## 6. Later rescue mission: recover a small allied squad

Introduce this in Citadel Dawn level 2, currently a pre-boss assault. Keep level 1
as approach and level 3 as the command battle. This adds mission variety without
creating another large background before the feature is proven.

Suggested objective: recover two disabled friendly tanks and get at least one
survivor out. They are separated along the route, each protected by a small guard
group. Before rescue they are neutral mission objects, excluded from hostile
counts and normal target selection.

Rescue sequence:

1. Mark the disabled tank with a cyan wrench/ally icon.
2. Clear its nearby guards and stay within four units for three seconds. Show a
   small rescue progress ring; pause progress when enemies contest the area.
3. The tank changes to allied markings, joins behind Kestrel and fires automatically.
4. Recover the second tank. Track “2/2 rescued · 1/2 surviving”, for example.
5. Complete at the exit with the rescue requirement met and at least one survivor,
   or finish early if all hostiles are defeated and those same requirements hold.
   Killing the last guard before rescuing a tank must not finish the mission.

Cap the squad at two active allies. Give them modest cannon damage and limited
range, no special-weapon inventory, and no shop controls in the first version.
They follow Kestrel's recent traversable path with staggered spacing, yielding at
choke points instead of pushing the player or transport. Reuse navigation fields;
repath only when their route or cover changes. Recover from a stuck follower by
yielding/repathing first. Any emergency off-screen regroup must use a verified free,
reachable point and cannot bypass a locked objective or wall.

Allow enemies to shoot allies. Mines and environmental hazards affect them using
the same ground-unit rules. Stop allied attacks while paused or on the results
screen; remove all friendly AI, shots and visuals on retry. No loot or hostile-kill
credit for destroying an ally. Allied hostile kills contribute to mission progress
once, without double rewards or automatically borrowing player weapon upgrades.

Bonus credits for both allies surviving should be modest and separate from the
player's health rating. Keep allies for this mission only initially; carrying a
growing army across 16 stages would complicate balance, saves and mobile performance.

## 7. Implementation structure and migration

| Area | Required work |
| --- | --- |
| Campaign/save | Separate training definitions and completion IDs; keep existing 0–15 stage indices, cleared arrays, purchases and Strike-background records intact |
| Real map sizes | Shared per-mission bounds for terrain, solid borders, spawns, supplies, projectiles, guided missiles, minimap, camera and navigation grid |
| Tutorial controller | Event-driven steps; platform-aware hints; training inventory; safe encounter gates; skip/retry handling |
| Objectives | Explicit completion predicates for training, wave defense, escort and rescue; remaining reserves cannot count as an empty battlefield |
| Mission definitions | Per-level overrides for escort equipment and Citadel rescue; existing main campaign remains compatible |
| Factions | Player/ally/enemy/neutral classification independent of unit role; projectile targets, splash, mines, boss attacks, death bookkeeping and loot must use it |
| Friendly combat | Reusable targeting/projectile helpers with shooter-specific damage and cooldown; no reliance on `g.player` or the player's equipped weapon |
| Graphics | Shared vehicle geometry, cheap objective badge, low-detail attachment meshes, bounded missiles/effects and complete cleanup |
| Records | Training excluded; separate new mission-rule versions from old leaderboard records when objective or allied support changes |

Important current constraints:

- Bounds are imported globally from `activities.ts`; navigation has a fixed
  47 × 39 grid. Cropping the ground mesh alone does not create a smaller playable
  map. Parameterize the complete map contract before authoring training maps.
- Campaign saves, unlocks, routes, biome selection, health progression and local
  leaderboard entries depend on numeric stage indices. Prepending three entries to
  `MISSIONS` would misidentify progress and unlocks. The separate prologue avoids it.
- `battlefieldClear()` currently completes any mission once its current enemies
  are dead. Pending waves, tutorial steps and unrescued tanks need explicit checks.
- Friendly projectiles currently assume the player. Enemy projectiles primarily
  target the player/transport/relay. Extending a boolean `friendly` flag alone is
  insufficient for combat allies.
- First Light and Homeward unlock weapons through fixed cleared-stage positions;
  training must not accidentally move or satisfy those unlocks.

## 8. Delivery order and acceptance criteria

1. **Stable foundation:** finish/device-check the pending mobile fixes; add map
   bounds and explicit objective predicates; regression-test existing saves/routes.
2. **Beginner experience:** three small maps, tutorial steps, skip/replay and the
   softer Easy transition. Test with a player who has not seen the controls.
3. **Defense clarity:** relay visuals, adjacent spawn, accurate wave clock and finite
   wave scheduler. Verify there is no premature success or distant final straggler.
4. **Supported escort:** Blender attachments and missile/MG/unarmed progression.
   Test cover, pauses, ally damage, targeting, early completion and normal escort
   movement before changing convoy HP or adding more escort enemies.
5. **Rescue allies:** two-tank squad, follower behavior and rescue-specific results.
   Stress-test crowded corners, O/S routes, destruction and repeated retries.

Acceptance targets:

- New player can move and hit a target within the first minute; no compulsory wall
  of text. Training can be skipped and replayed without repeated credit grants.
- Existing saved missions, credits, weapons, levels and rankings are preserved or
  explicitly labeled as legacy records, never silently reassigned to another stage.
- Beginner maps contain only the authored counts; no default rocketeer/jeep/boss
  population leaks in from the generic encounter generator.
- Defense countdown matches the actual scheduler. No success between waves. Relay
  health and next objective remain readable in portrait and landscape.
- An armed convoy assists but cannot farm the route while the player idles at spawn.
  Two rescued allies do not block a narrow route indefinitely or shoot through cover.
- Every death, pickup, rescue and mission reward is recorded once. Zero enemies is
  not sufficient to complete an unfinished tutorial or rescue objective.
- Low-detail budgets remain bounded. Run sustained mobile battles and repeated
  retries with armed transports/allies, plus real Android/iPhone tests. Target no
  more than a 10% steady-state frame-time increase from two allies in a comparable
  scene; measure it rather than assuming the new features are cheap.

## 9. Implementation checklist and final choices

- [x] Separate three-lesson prologue, fixed counts and actual compact collision bounds.
- [x] Start / skip / replay, one short contextual hint, joystick highlights, one-time rewards.
- [x] Isolated training inventory; preferences persist without leaking loan weapons or charges.
- [x] Easy First Light rosters: 2/3/4 tanks, 4/6/8 riflemen; later levels add a jeep and rocketeer.
- [x] Adjacent relay spawn, Blender signal beacon, projected HP / wave / countdown badge.
- [x] Seven-second initial grace; nine-second breaks triggered by remaining wave strength.
- [x] Homeward missile / machine gun / unarmed progression with matching Blender detail tiers.
- [x] Citadel Dawn level 2: two rescues, three-second uncontested hold, followers and automatic fire.
- [x] Friendly damage/death rules, capped breadcrumb history, target/repath throttling, pause/retry cleanup.
- [x] Separate ranking rules version; historical results remain stored, current board uses version 2.
- [x] Training, save, combat, wave and mobile regression tests; full campaign verification.

Implementation details that differ from exploratory options above:

- Navigation keeps its bounded 47 × 39 allocation but excludes cells outside each real
  arena. This preserves shared flow-field behavior without allocating a larger grid.
- Defense reserves are allocated with the mission, hidden and excluded from combat,
  collision and targeting until released. This avoids model creation during a wave.
- The projected objective label clamps to screen edges; no extra 3D text or lights.
- Rescued tanks use the existing Azure Guardian geometry/palette and cyan ground markers.
- Allies follow reachable breadcrumbs and yield locally. There is no teleport regroup.
- The two-survivor rescue bonus is 40 credits, independent of player hull stars.
- Browser tests cover touch-sized screens and software-rendered endurance; physical
  Android/iPhone playtests and first-time-user timing are not claimed as completed.
