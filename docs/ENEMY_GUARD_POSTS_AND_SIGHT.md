# Enemy guard posts and visual detection

## Plan

- Keep the existing four route sectors, difficulty counts and weapon-cache guards. Prefer buildings and fuel cylinders/crates for tank posts, and tree trunks for infantry. Use existing Blender scenery. Sparse sectors can receive at most one extra tree and one building/fuel landmark each, still respecting road, supply, relay and spawn reservations. Keep safe reachable fallback positions where no suitable post fits.
- Select perimeter positions outside collision footprints and within the assigned route sector. Never move later patrols to the opening area or block the convoy road.
- Replace proximity/progress activation with bounded visual detection: infantry 26 m, tanks 32 m, bosses 36 m. All live solid cover footprints block sight. Destruction opens sight immediately. A spotted player/convoy or a hit alerts only that squad.
- Ordinary enemies fire only with a clear view, then investigate the last observed position for up to six seconds after losing sight. Do not track an unseen player through walls. Keep existing warned boss heavy attacks and timed defense arrivals. A player who reaches a waiting wave can alert it early through sight. Capture reinforcements still advance toward their known relay objective even before seeing the player.
- Check every campaign layout, route-cache access, unit overlap, detection behind cover, exposed targets, destruction, last-seen pursuit, damage alerts, defense timing, and desktop/mobile rendering. Reuse existing models and batching to avoid adding GPU cost.

## Validation

Results will be recorded after implementation review.

Initial review passed 35 of 36 route/placement checks. The remaining old navigation fixture assumed an unseen distant player was always known; it now provokes the attacker with hits while testing the same large-checkpoint detour. Sightline, memory, squad, cache, O direction, all 48 built-map clearance and Crazy spawn checks passed. Review also restored relay-directed movement for capture reinforcements and moved the firing sight check after movement.

The next 33 regressions passed, including actual firing and cover, navigation under provocation, campaign purchases/objectives, touch controls, and Low-detail state preservation. Of 195 regular tanks on the 39 non-defense layouts, 179 spawn beside buildings/fuel; 306 of 366 infantry spawn beside trees. The remaining units use safe route positions. Final review limits squad alerts to 48 m, makes investigation approach the observed point instead of stopping at firing range, and lets capture reinforcements enter the relay without shooting at an imaginary target.

Final local release checks: 12 focused regressions passed after the AI review, including local alerts, last-sighting arrival, relay entry, defense timing, checkpoint navigation and desktop/mobile Low-detail renders. Build and all 32 model-pair checks passed; existing GLB budgets are unchanged. The complete 201-test suite runs as the GitHub Pages deployment gate.
