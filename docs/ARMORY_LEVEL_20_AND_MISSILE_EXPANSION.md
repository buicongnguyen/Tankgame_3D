# Level-20 workshop and expanded missile armory

## Objectives
Preserve existing saves and purchases, make every weapon individually upgradeable to level 20, strengthen missile combat, and add distinct multi-shot options without overwhelming mobile rendering.

## Workshop
- Raise the existing armor, damage and reload tracks from 3 to 20 levels.
- Add level-20 engine and shield tracks. Engine upgrades respect ice, sand, mud and earthquake movement rules; shield upgrades retain a cooldown.
- Add an individual level-20 upgrade track for every weapon, including the starting cannon. Only owned weapons can be upgraded. Clearly show current level, next price and actual benefit.
- Keep early upgrade benefits compatible with existing saves. Use diminishing returns and positive reload floors at higher levels, so level 20 cannot produce zero/negative cooldowns or excessive projectile counts.
- Add new save fields with defaults for older campaigns. Validate levels, ownership, prices, duplicate purchases and insufficient credits. Keep the current campaign reward rules.

## Weapons
1. Keep IDs 0–4 for cannon, autocannon, siege rockets, laser and arc rockets; preserve their purchases and keyboard shortcuts.
2. Strengthen siege rockets and arc rockets, with clear splash-radius aim cues. Explosions damage nearby destructible scenery by its collision footprint, including large buildings whose centers lie outside the radius. Preserve friendly fire and indestructible terrain.
3. Add a machine gun that fires two small rounds together; its individual level-10 upgrade unlocks four simultaneous barrels. Limit its minimum firing interval to keep mobile projectile counts bounded.
4. Add compact, fast small missiles. Reuse the detailed Blender rocket model at smaller scale, with correspondingly smaller exhaust and blast effects.
5. Add a special triple arc launcher. Each trigger launches three rockets over obstacles in a spread. It receives three volleys per mission and does not gain unlimited reloads from ordinary arc-ammo boxes.
6. Extend the weapon picker and keyboard shortcuts to all eight weapons. Keep ammo counts explicit for laser, arc and triple-arc weapons. Empty special weapons fall back to the cannon.

## Implementation and review
- Centralize weapon definitions and upgrade formulas so shop descriptions, projectile damage, cooldowns and aiming visuals agree.
- Keep splash hits independent for each concrete panel; destroyed panels open navigation while neighboring panels remain present.
- Keep projectile geometry shared and effects capped; reuse existing Blender rocket resources.
- Check actual firing and collisions at base and maximum upgrades, including three-rocket simultaneous launches, ammo consumption, friendly fire, nearby buildings and gasoline chains.
- Test old-save migration, all purchase limits, persistence, real desktop/touch weapon selection, compact shop layouts and Low detail.
- Run appropriate regressions and the full GitHub release gate, commit and push via the existing SSH remote, then verify the published game on desktop and phone layouts.


## Review outcome
- Implemented eight weapon tracks and five tank-system tracks, all capped at 20; new save fields migrate from the previous three-upgrade format.
- Siege direct damage is 140, arc damage 240. Micro missiles use a smaller Blender projectile, and triple arc consumes one volley for three projectiles.
- Missile splash checks cover footprints and preserves indestructible terrain and individual concrete sections. Enemy missile splash keeps its previous strength.
- Reviewed desktop, 320/390 px portrait phones and 844 px landscape. Corrected desktop hint placement for longer weapon labels. Detailed and Low rocket renders retain exhaust, with effect budgets of 230 and 85 particles.
- The existing 222 regression cases passed locally; eleven new armory cases cover upgrade caps, migration, real weapon selection, firing patterns, ammo limits, splash collision, terrain, shields and graphics. The release workflow reruns the complete suite before Pages deployment.
