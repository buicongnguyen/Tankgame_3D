# O loops, route progression and boss reinforcements

## Design

The O is a complete loop with both branches open during play, as requested. The player may circle clockwise, counterclockwise or turn back. Patrols wake by local proximity in either direction, and clearing the patrol opens extraction at the starting gate. A convoy waits at the fork, then follows the first branch the player takes for its full circuit; the player remains free to flank on either branch. No menu direction lock or enemy relocation is used.

Route lengths increase through the three levels of every traveling stage. Compact O loops are 225.6 m, U routes 276 m, diagonal S routes 302.64 m and full S/mirrored S routes 388 m. Existing short introduction paths remain where useful. Capture and timed defense retain their relay geography and increasing objective/boss challenge. The volcanic O shifts east to clear the caldera. Preserve weapon caches near ambushes, recovery detours, difficulty counts, save progress, indestructible terrain and realistic time bonuses.

## Bosses and Blender assets

- **Iron Vanguard (quad-mech):** a tall humanoid with articulated legs, armored torso, sensor head and two barrels on each forearm. A short warning precedes eight alternating rounds from its four guns, followed by an exposed-core recovery window.
- **Siege Marshal (siege-mech):** a humanoid with two hand guns and paired rocket pods. Guns fire during approach; two clearly marked rocket impacts deliver the heavy attack. Rockets launch from its model and leave smoke trails.
- **Atlas Launcher (missile-truck):** a large wheeled armored truck with two separate missile launchers, visible tires, cab, suspension and rear stabilizers. Two wide warned missile zones are slower and stronger than light gunfire.
- Fit each of the six existing boss rigs with a visible light gun and muzzle. It fires modest rounds during tracking, pauses for the main warning/attack and exposed-core window, and respects cover, death and dormant ambush state.
- Introduce new primary bosses at Glass Road, Cinderfall and Citadel Dawn command levels; retain all existing boss families elsewhere. Later multi-boss encounters can mix new and existing types without increasing the selected difficulty's boss count.

Use reproducible Blender scripts, editable .blend sources, GLB exports, shared PBR materials and corresponding Low geometry. Preserve attachment and animation pivots through material batching and quality swaps. Keep triangles, draw calls, projectile lifetime and visual effects bounded. No runtime procedural replacement for the requested Blender models.

## Implementation and verification

1. Build three new rigs and a reusable light-gun attachment; regenerate the six existing boss exports and all nine affected Low variants.
2. Replace L routes, reorder journey lengths, enable direction-independent O patrols and convoy branch selection, and match camera/minimap/road geometry.
3. Add distinct boss combat patterns, visible muzzle origins, finite secondary rounds and cleanup; place new types in the campaign and update concise briefing text.
4. Validate all layouts and both O directions, convoy completion, volcano clearance, supply spacing and route progression. Check all nine boss rigs, warning windows, secondary damage/cadence, projectiles, cover, death, restart and Detailed/Low preservation. Inspect actual desktop/mobile renders.
5. Run build, asset checks, targeted regressions and the full release suite; commit and SSH-push the reviewed changes, deploy through GitHub Pages, then smoke-test the live game.

Review results will be appended after verification.

## Initial review

The first 45 regressions passed: all 192 difficulty layouts, all 48 built maps, both O convoy directions, all twelve escort journeys, route-length progression, nine boss families, attack warnings/recovery, old-boss secondary guns, cover and death cleanup. Desktop/mobile renders confirmed the humanoid and truck silhouettes and all moving attachments survive Low-detail swaps.

Asset export review reduced GLB overhead by merging static surfaces per parent/material after saving the editable Blender scenes. The full 32-model set remains below the existing 4 MB cap; Low remains below 2 MB and uses 73% fewer triangles. No asset budget was increased.

Combat review corrected a central safe gap between paired missile blasts: modern launchers now aim two overlapping circles perpendicular to their heading, covering the original target while leaving an escape outside the marked zones. Siege Marshal now alternates both hand guns. Each new model uses its own named armor material, preserving distinct colors through the shared-material renderer.

## Current route distribution

| Background | Approach | Counterattack | Command battle |
| --- | --- | --- | --- |
| First Light | Original short route | U | S |
| Homeward | Original short route | O | 45° S |
| Glass Road | O | 45° S | S |
| Last Signal | O | U | 45° S |
| River Run | Original short route | O | Mirrored S |
| Frozen Pass | Original short route | 45° S | Mirrored S |
| Cinderfall | Original short route | O east of caldera | U |
| Dune Lifeline | Original short route | U | 45° S |
| Citadel Dawn | O | 45° S | S |
| Fault Line | O | 45° S | Mirrored S |
| Mire Crossing | Original short route | U | 45° S |

The five remaining backgrounds use relay capture or timed defense and keep their established routes. Save indices and 48 campaign levels are preserved.

The broader 39-check review passed 36 checks. It found that natural hills and the longer city road reduced Citadel Dawn to ten buildings, and two UI fixtures still expected the former exit direction. City now gives buildings priority over natural landforms, with smaller houses filling free lots under the existing 26-building cap. Roads, supply access and unit clearances remain reserved. The fixtures now check the correct northeast exit. Early multi-boss rosters remain explicit, including their existing repeated helicopter encounter; later rosters mix new types without relying on a missing array entry.

Final local review: the follow-up 39 checks all passed, including city density, Crazy-mode clearance, all built maps and escort journeys. Two additional desktop/mobile rendering checks passed for all three new bosses in Detailed and Low modes; inspected renders confirm distinct armor colors, four visible Vanguard barrels, Marshal shoulder rockets and both Atlas launchers. Build and 32-model asset validation passed. Removed the legacy Warden targeting-line hint from other boss encounters and made O-road guidance direction-neutral. Full release tests run in the GitHub Pages workflow before deployment.
