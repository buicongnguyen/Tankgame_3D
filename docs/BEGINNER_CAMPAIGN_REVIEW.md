# Beginner campaign implementation and review

## Delivered behavior

Three optional single-level tutorials precede the 48 campaign missions without
changing any saved stage index. New profiles see Start Training; existing profiles
continue normally. Settings contains Replay Training. The small maps teach driving,
firing, collecting/selecting the laser, Shield and Strike. Rewards are 10/20/30
credits once. Training uses loan supplies, no competitive scores or campaign unlocks.

Easy First Light starts in a 72 × 64 arena with four riflemen and two tanks. Its
second and third levels gradually introduce heavier units. Easy halves hostile HP.

Defense starts four units beside the new Blender relay. Seven seconds of preparation
precede wave one. Further waves get a nine-second warning after the active wave
falls to 25% strength on Easy or 40% on other modes. Pending waves are invisible,
cannot be hit or collide, and still prevent premature victory. The floating label
shows real relay health, current wave and actual scheduler countdown.

Homeward uses a guided missile roof module in level one (60 direct damage, 2.5 m
blast, six-second reload), a three-round machine gun in level two (3 damage per
round, two-second burst interval), and an unarmed transport in level three. Other
escort stages retain their equipment. Both support guns require an active visible
ground target and use independent ammo. Their direct blasts spare friendly units;
fuel explosions remain hazardous.

Citadel Dawn level two requires two rescues and at least one surviving ally. Clear
guards within ten units, then remain within four units for three seconds. Allies
have 560 HP, fire 34-damage cannon rounds every 2.8 seconds at targets within 26 m,
and follow a bounded breadcrumb trail. Two survivors add 40 credits. Disabled tanks
cannot be damaged before rescue. Once rescued, enemy rounds, boss beams, mines and
environmental explosions can damage them. Allied deaths never create loot or kills.

## Code and logic review findings resolved

- Removing an ally from instanced enemy batches left its original meshes on a
  disabled rendering layer. Removal now restores those mesh layers.
- Temporary training loadouts could leak through ordinary persistence calls.
  Persistence writes the original campaign profile; only training completion,
  one-time credits and user preferences are updated.
- The old global all-clear rule could skip unfinished lessons or rescue objectives.
  Both now use explicit completion predicates before the general campaign rule.
- Hidden defense reserves must be excluded from every damage and collision path,
  including flames, laser intersections, guided targeting, rockets and track contact.
- Compact arenas need consistent collision, navigation, support-drop, projectile,
  camera, minimap and salvage bounds. They now use the world arena bounds.
- Allied fire cannot call the player's weapon helper because it consumes player
  ammo/upgrades. A separate projectile helper handles allied damage and homing.
- Allied target scans and path refreshes are throttled; breadcrumb history is capped
  at 96 positions. Allies yield to a nearby moving player or transport.
- Historical leaderboards remain available through the Legacy rules filter; new
  runs use rules version 2, so changed missions do not replace old records.
- Mobile training hides abilities not yet introduced and uses one concise hint.

## Asset and performance checks

Blender source: `tools/blender/build_allied_support.py` and the three corresponding
`.blend` files. Matching low-detail exports preserve all pivots and attachment nodes.
All runtime GLBs total 4,295,472 bytes. The mobile tier totals 1,897,872 bytes and
16,016 triangles versus 57,075 detailed triangles (72% fewer). The effects, wreck,
navigation-cache, render pacing and mobile recovery limits from the preceding
performance review remain in place.

## Validation

TypeScript and asset-budget validation pass. New integration coverage tests tutorial
inventory/rewards/gates, actual compact boundaries, wave release timing, convoy
weapon independence, rescue contesting, ally death bookkeeping, friendly fire,
following, and mobile portrait/landscape layouts. Final regression and deployment
results are recorded below when the release finishes.

Browser/software-renderer checks cannot establish thermal stability on every phone.
Physical Android/iPhone testing and beginner timing playtests remain recommended.

### Release validation (21 September 2026)

- 66 affected campaign, desktop, touch, WebKit and endurance checks passed together
  against unchanged release code. The preceding 12 new tutorial/ally integration
  checks also passed; an additional training-reserve regression was then added.
- Three-minute mobile-sized Crazy battle: 179.7 simulated seconds, 5,430 rendered
  frames, no context loss or page errors. GPU geometries stabilized at 473 (initial
  sample 463), textures remained 11, shader programs remained 17, and active/pooled
  effect particles stayed within 48. This is a browser test, not a physical phone.
- In-game screenshots checked the relay, both transport attachments and guarded
  rescue tanks. Portrait and landscape tutorial hints fit outside the controls.
- Final logic pass: training reserves are hidden and excluded from Strike until
  their encounter is released, so the support lesson cannot skip its second wave.
- GitHub Pages deployment is gated by all eight full-suite verification jobs.
