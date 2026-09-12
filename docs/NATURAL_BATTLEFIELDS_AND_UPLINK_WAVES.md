# Natural battlefields, continuous boss guns and finite uplink waves

## Behavior
- Every boss carries an independently aimed machine gun. It fires small 3-damage rounds about three times per second while its target is within 42 m and visible, including special-attack and exposed-core phases. Retain all heavy attack warnings, damage and recovery windows. Stop on death or pause; never accumulate a huge catch-up burst. Add the missing dedicated gun to the Vanguard in Blender, including its Low-detail rig.
- Clearing every hostile, including infantry, bosses and waiting waves, completes any non-escort mission from the current position. Retain the 0.8-second result transition, bonus calculation and shop/exit controls. Escort missions still require their transport to reach extraction.
- Uplink defense missions use four finite groups, beginning at 0, 4, 8 and 12 seconds. The first group advances immediately from the perimeter; later groups follow. Remove unlimited reinforcement spawning. Defense victory requires all hostiles defeated, so a timer cannot end the mission with waves still approaching. Capture missions retain their guards and ring objective and allow the all-hostiles-cleared shortcut.
- Remove the broad road surface on all 48 maps. Keep route signs, extraction markers and the minimap route. Reserve only the space required for a navigable path; shrink oversized encounter clearings. Populate the former road margins with biome-appropriate trees, buildings, crates and fuel, with collision footprints, destructibility and capped instanced rendering.
- Preserve a clear escort corridor along the signs, including bends and either branch of O maps. Narrow wheel traces show firm escort footing through ice, sand and mud. Other missions apply visible terrain effects without an invisible road-speed exemption.

## Review and verification
Check all nine boss rigs in both graphics tiers, sustained fire in each heavy-weapon phase, blocked sight, range, frame-rate independence and bounded effects. Exercise clear-field completion, pending-wave guards, loss-before-victory, reward-once behavior, capture and escort exceptions. Simulate relay approaches and all convoy routes. Audit every map for spawn/pickup access, navigability, denser central scenery, safe mine dodge space and indestructible boundaries. Inspect desktop and mobile screenshots in Detailed and Low settings, then run build, asset budgets, focused regressions and the full GitHub Pages gate before checking the live deployment.

Navigation review found vehicles trapped beside corners by square-expanded path checks. Navigation now uses rounded vehicle footprints, with separate cached clearance fields for large ground bosses. Recheck sustained wave arrivals as well as initial movement.

## Validation notes
- All 48 layouts were audited for vehicle-sized sign passages, safe spawns, service access and mine dodge space. Escort routes also passed every bend at transport clearance, including O-loop branch selection.
- Actual desktop overview captures covered grove, snow, ice, volcano, desert, jungle, city and marsh. Phone captures at 390 × 844 retained readable HUD and touch controls in Detailed and Low settings, without horizontal overflow or console errors.
- Ninety-second simulations on all three Normal defense finales found no surviving attackers stranded beyond 50 m after the corner-navigation and large-boss detour fixes.
- Capture guards stay near their landmarks; only defense missions use scheduled perimeter waves. The existing capture timer remains available alongside the all-hostiles-cleared shortcut.
- Detailed models total 3,997,296 bytes; Low models total 1,766,544 bytes and 14,727 triangles. The Vanguard gun is authored in Blender and both exported rigs retain LightGun and LightMuzzle attachments.

The wide campaign-road overlay is removed on all 48 layouts. City street textures remain part of the urban scenery; they do not reserve the old empty route strip. The full local browser suite passed 264 checks, including Chromium/WebKit mobile tests and resource cleanup. Production-preview checks passed at 1440 × 900, 390 × 844 and 844 × 390 with live wave advancement, Low detail, no console errors, no missing assets and no horizontal overflow. The finish HUD now refreshes immediately to show AREA SECURED while effects play.
