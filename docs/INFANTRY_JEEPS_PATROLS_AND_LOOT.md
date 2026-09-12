# Infantry, scout jeeps, patrols and combat loot

## Balance plan

- Normal starting force: 5 tanks, 9 riflemen, 4 rocketeers and 1 scout jeep. Higher sublevels add tanks and riflemen; rocket troops increase modestly. Late command levels reach 8 tanks, 18 riflemen, 7 rocketeers and 3 jeeps plus the selected boss count. Easy retains 1x enemies and extra hull; Hard/Crazy retain 2x/4x actors.
- Rifle bullets deal 3 damage, jeep machine-gun rounds 3 damage with a faster cadence. They pressure the player without individual rifle hits behaving like shells. Preserve heavy tank, rocket and boss attack warnings.
- Author an open light jeep in Blender with four wheels, driver, standing gunner, rotating gun mount, receiver, barrel, belt box, roll cage, windshield and spare wheel. Export editable source, Detailed GLB and Low GLB; preserve wheel and gun pivots and the current model budgets.
- Most maps have one fixed repair center; Easy also receives one small field cache. Keep mines as hazards. Tank and boss destruction independently rolls a one-in-three chance for a health, shield, laser or arc-rocket crate. Infantry and jeeps do not produce loot.
- Drop crates within 8 m of the wreck, on reachable open ground. No relocation to distant road segments. Per-level limits: Easy 6, Normal 4, Hard 4, Crazy 5; harder modes do not multiply loot with enemy count. Later levels and harder modes grant smaller contents. Cap stored special ammunition to prevent hoarding. The unlimited cannon and purchased guns remain usable.
- Some infantry/tanks patrol locally; jeeps scout. Tanks positioned farther from the road get wider loops reaching toward it. Use collision-aware movement, bounded patrol areas, short observation pauses and cached navigation. Keep later squads in their sectors and retain timed defense waves. Spotting still requires clear sight; after investigating a lost target, patrols resume.

## Verification plan

Check force composition across all 192 stage/level/difficulty combinations; actor/road/supply clearances including crowded Crazy finales; real jeep firing damage and wheel/gun animation; visual detection during patrol and return after lost sight; local/wide patrol extents and navigation cost; random roll boundaries, no-drop outcomes, one death/one roll, no infantry/jeep farming, nearby reachable crates, reduced quantities/caps; campaign objectives, purchases, restart/save, desktop and mobile Detailed/Low renders. Run the full GitHub Pages release gate, SSH-push and verify the public build.

## Review changes

- Far-off-route patrols select an intermediate approach point when the road is outside their leash. Lost-target return paths may detour outside the patrol area to navigate cover, then resume the local loop.
- Raised the jeep mount above its windshield and roll cage; wheel/gun pivots survive live quality changes. Low geometry keeps 1,057 of its 2,384 triangles to preserve the body silhouette.
- Infantry and jeep colors, roughness and metallic finish are stored per vertex and merged within each moving pivot. This reduces draw calls without removing geometry, colors or animation.
- Partial ammunition pickups report the amount actually loaded. Full-ammo and full-health crates remain available; shield crates do not refresh the ability cooldown.
- Updated tests that assumed abundant static crates, fixed weapon drops or the previous actor counts. Retained spawn separation, route clearance, collision, damage, objective, save and render limits.
- Full model kit: 3,991,144 bytes Detailed, 1,763,260 bytes Low; 52,562 / 14,708 triangles. Existing 4 MB / 2 MB limits are unchanged.

- Reset the fire-warning interval after an enemy loses its target, preventing a stored negative cooldown from causing an immediate shot on reacquisition.

## Local validation

The initial 208-test sweep found outdated roster/cache assumptions, the reacquisition warning bug and an over-budget overview draw count. After the fixes, 84 checks passed in the broad review run; its remaining firing-warning failure was corrected and the final 38-test patrol/mobile/loot/material run passed. Asset validation and TypeScript/production builds pass. Desktop/portrait jeep images and Detailed/Low scenery were visually inspected. Crazy city retains all 148 actors; its tested Low view uses 226 draw calls and 33,613 triangles versus 510,700 triangles with Detailed shadows. The GitHub Pages workflow runs the full 209-test release suite before deployment. These are browser/emulator checks, not physical-phone framerate measurements.

Production preview smoke tests passed on desktop and portrait mobile: correct bundle, both jeep packs, owned weapon switching and live quality changes; no console/page errors, missing assets or horizontal overflow.
