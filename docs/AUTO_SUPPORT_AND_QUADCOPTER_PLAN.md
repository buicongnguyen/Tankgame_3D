# Direct support, field missiles, skins and quadcopter

## Player experience
- Strike (R) and Drop (T) are separate one-tap buttons. They retain the shared 28-second radio cooldown; Drop shows its mission allowance. Number keys always select weapons.
- Auto (E) replaces the repair finder. Repair pads remain visible as green crosses on the minimap.
- A 40-credit pack contains six guided missiles. Buy at most one pack for the next deployment, including a replay. Menu previews, difficulty changes and skin selection do not consume it. Deployment transfers the pack into runtime ammunition and clears the saved pack immediately. Unused missiles expire on completion, defeat, restart, return to command or reload; pause and graphics changes retain them. The shop states this explicitly.
- Each Auto press launches one missile at the nearest living jeep, tank or boss within 42 m. It flies over cover, retargets vehicles if necessary, has a 1.6-second launch interval, 160 damage and a small 3.5 m blast. No target means no ammunition spent. Direct blasts spare the player/transport; fuel remains hazardous. Free Strike remains the larger 12-missile attack.

## Star skins
- Verdant Bastion: emerald stars, 6-second shield.
- Cobalt Sprint: blue stars, +30% movement speed.
- Ruby Lance: red stars, +30% weapon damage.
- Quartermaster: violet stars, +25% finite ammunition rounded up: laser 12 to 15, arc rockets 6 to 8, triple arc 3 to 4, Auto pack 6 to 8. Unlimited guns stay unlimited. Initial ammo and pickups share one capacity function.
- Blender authors the paint triangles and renders compact preview images. Existing purchases and paint schemes are preserved.

## Quadcopter boss: Storm Kite
- Four independently spinning rotors, braced arms, motor housings, armored fuselage, sensor optics, missile pods, skid gear and a light machine gun. Save an editable Blender scene and Detailed/Low GLBs; merge static meshes while preserving rig nodes.
- Attack: a pincer of three missiles at visibly marked points across the player's position. The aim locks during a 2-second warning, leaving time to escape. Missiles launch from the aircraft over cover, then the aircraft lands/lowers to expose its core for 3.5 seconds before taking off again. Its weak machine gun continues between special attacks, respecting cover.
- Debuts as White Horizon's final boss, also available in later Crazy reinforcements. Flying state integrates anti-air damage, collisions and mines like the helicopter.

## Compact shop
- Icon-led rows, compact level and stat lines, coin-and-price purchase buttons with full accessible names and at least 44 px touch targets. Optional weapon details remain expandable.
- Keep tank systems, weapons and skins recognizable; smaller preview cards and concise bonuses reduce mobile scrolling. Preserve scroll position on purchases.

## Validation and release
- Tests cover legacy save migration, exact one-sortie expiry, no-ammo-waste, targeting/retargeting/cover, shared radio cooldown, direct keyboard/touch controls, ammo refill caps, all skin bonuses, quadcopter flight/attack/recovery and Low rig integrity.
- Inspect desktop, portrait and landscape UI; build TypeScript/Vite, validate Blender assets and run affected regressions, then full GitHub CI before Pages deployment.

## Implementation and review
- Implemented all items above. White Horizon level 3 introduces Storm Kite; later Crazy finales include it among reinforcements. Detailed/Low meshes have 2,496/742 triangles and preserve four rotor pivots, three launch points, core and light gun.
- Save migration defaults old profiles to no queued pack. Pack consumption occurs only in `start`, never in preview `prepare`; pause and quality swaps keep runtime ammo. Pack purchase is bounded, and no-target Auto calls spend nothing.
- Vehicle-only homing, retargeting, allied blast protection, magazine refill caps, nearest-left fallback, all ten bosses' light guns, safe Crazy spawns and every escort variation were checked locally. Existing shield/transport behavior remains covered.
- Shop review removed a redundant detail row, repaired missing weapon icon paths and reset initial shop scroll. Purchases retain their scroll position. Desktop and 320/390/844 px shop controls pass; seven portrait/landscape mobile sizes preserve 44 px action targets without overlaps.
- TypeScript/Vite build and asset checks pass. Full release workflow runs 305 browser/logic checks, followed by Pages publication and isolated public desktop/mobile smoke checks.
