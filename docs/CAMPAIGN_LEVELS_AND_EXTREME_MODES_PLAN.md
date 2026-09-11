# Campaign levels, extreme modes and frontier expansion

## Player-facing design

- Four modes: Easy gives 150% player hull and normal enemy numbers; Normal retains base tank counts and damage; Hard doubles hostile armor/infantry; Crazy quadruples both. Do not silently reduce player health or increase enemy damage on higher modes. Finale boss counts are 1 / 1 / 2 / 4. Enemy multipliers also apply to reinforcements.
- Sixteen stages with three levels each (48 levels): Approach, Counterattack, Command battle. Keep the stage identity and objective; counterattacks change approach positions and lengthen timed objectives; the third level also requires every boss to be defeated. Former boss stages use patrol battles in their first two levels. A shop and the existing 0.8-second result delay follow every level.
- Store the next unfinished stage and level, preserving completed historical stages, credits, skins, guns and graphics preference. Replaying a completed level must never grant another first-clear reward. Level selection exposes only unlocked levels. Existing Story/Standard/Veteran saves migrate to Easy/Normal/Hard.
- Dense White Horizon ice, snow-white pines and extra fuel crates; more Canopy Hold jungle trees, Citadel Dawn buildings/soldiers, and Dune Lifeline sand traps. The central convoy road, service pads and usable flanking paths remain clear.
- Fault Line: a new earthquake stage with a visible warning, rising dust and 1.6 seconds of stopped ground tanks. Weapons still function; airborne helicopters and infantry are exempt. Pausing stops the hazard clock.
- Mire Crossing: a new marsh escort stage with visible water/mud holes. Entering a hole slows tanks and sinks their hull visually; periodic traction recovery allows escape. Convoy roads remain firm. No permanent trapping or unavoidable damage.
- Three new Blender bosses: helicopter (flies over cover, attacks with warned rockets, then lands behind cover); eight-legged spider (climbs obstacles, then rests with exposed core); laser tank (warned beam burst, cover blocks it, then a cooldown vulnerability). Existing rail, missile and walker bosses remain. Each boss owns independent state, warnings and cleanup; mixed Crazy encounters require all four deaths.

## Implementation sequence

1. Introduce validated difficulty settings, per-level checkpoint/reward logic, encounter counts and level UI.
2. Extend spawning for multiplied armies, safe positions, per-unit boss types and objective gating. Keep telegraphs readable, supplies finite and entity/effect work bounded.
3. Add earthquake/marsh mechanics and denser authored environment layouts using shared terrain definitions for movement, visuals and minimap.
4. Author helicopter, spider and laser rigs plus white pine in Blender. Export real detailed/low GLBs, retaining pivots, attachment names, material compatibility and genuine geometry reduction.
5. Integrate boss movement, landing/climbing, warned attacks and individual weak points. Ground shots and mines cannot strike an airborne helicopter; lasers and arc rockets can, and ordinary guns work when it lands.
6. Review progression, migration, rewards, four-boss completion, wall/cover interactions, hazard timing, navigation, mobile layout, quality swaps and resource cleanup. Validate all 48 level configurations and all four modes, run focused browser regressions and the complete suite.
7. Record actual results, commit and push through the existing SSH remote, and verify GitHub Pages and live gameplay before reporting deployment.

## Budgets and acceptance

- No new dynamic lights, large textures, rigid-body debris or unbounded particle emitters. Reuse existing pooled dust/smoke and batched static scenery. Crazy retains the exact requested enemy counts in Low detail.
- Expanded kit ceiling: 4 MB detailed / 2 MB Low; props below 3,000 triangles, new bosses below 4,500 detailed triangles, Low below 40% of detailed total. Record measured values.
- Warning markers remain visible in both detail tiers. No repeat of snow-depth flicker, render-order occlusion or shared-geometry disposal bugs.
- Test logical counts and movement separately from wall-clock gameplay, and bound multi-stage tests so CI software rendering does not exhaust a monolithic timeout.
- Mobile emulation checks touch/layout/quality behavior; physical-phone frame rate and thermal behavior are not assumed.

## Implementation record

Steps 1–6 are implemented. The expanded Blender catalog, per-level checkpoints, four modes, two new scenarios, denser environments and independent boss behaviors are in the runtime. Code/logic review reproduced and fixed helicopter landing/pursuit and spider rest problems. All 36 focused checks and the touch-emulation follow-up passed; the release workflow gates publication on the complete 133-test suite. See [review findings, measurements and release procedure](CAMPAIGN_LEVELS_AND_EXTREME_MODES_REVIEW.md).
