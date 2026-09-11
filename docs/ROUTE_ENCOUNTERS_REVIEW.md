# Route encounter review

## Behavior reviewed

- The planner owns route direction, seeded supply locations, clear access lanes and encounter anchors. World construction, convoy navigation, camera lead, minimap and extraction markers consume the same layout.
- Useful field supplies total 10 / 8 / 6 / 4 by difficulty. Their centers are 7.3–9.3 meters from the route, and placement rejects any other route segment within 7.2 meters. Clearance reservations protect both the service pad and its short connection to the road. Mines and fuel remain separated from useful supplies.
- Tank salvage has difficulty-specific kill intervals and per-stage caps. It searches nearby clear road shoulders, checking cover, the connecting path, existing pickups, mines and fuel. It can produce fewer drops if every nearby shoulder is occupied.
- Armor and infantry wait in four route zones; final bosses use a separate final-approach group. Approaching, passing or damaging a group activates it. Activated units retain normal combat/navigation; dormant units stay in objective counts. Defense missions use timed corner waves, including bosses.
- Each instanced concrete panel has independent HP, collision and render state. Four standard cannon hits destroy one 176 HP panel. The zeroed instance opens that panel only; neighbors retain their transforms, HP and collision. Navigation rebuilds after destruction. Laser damage still skips concrete before applying damage. Adjacent panels share one wall identity for penetration, including diagonal shots through their seam.
- Assault/boss completion requires the exit; capture, escort and defense retain their established goals. The result delay, rewards, save schema and shop remain intact.

## Findings addressed during implementation

1. Reserving encounter pockets initially removed too many city buildings and volcanic fuel crates. Added additional placement candidates in free areas while preserving all route/service clearances and existing density requirements.
2. City scenery cleanup treated newly instanced route sections as generic outer barricades. Restricted that cleanup to generic props; explicit removal of an instanced section now updates its render state too.
3. Defense bosses initially inherited route-end placement. They now spawn from perimeter corners and join later waves.
4. A group bypassed by a shortcut could remain dormant behind the player. Advancing beyond its route zone now activates it so it can counterattack.
5. New extraction requirements invalidated tests that completed assault missions while still at the initial spawn. Completion fixtures now reach the exit; a dedicated regression verifies that clearing the patrol at the start does not finish the stage.
6. An overview screenshot retained gameplay fog while moving the camera far above the map. The overview fixture now disables fog; gameplay cameras retain normal fog.
7. A stress fixture attempted to drop 128 wrecks at one point and incorrectly required the maximum salvage budget despite occupied shoulders. The test now distributes wreck locations along the route, and still checks the cap and every drop's clearance.

8. Expanded reservations displaced both River Run steel walls. Free-flank fallback placements now preserve steel cover while respecting scenery, road and service clearances.
9. A mobile firing-warning fixture relocated a newly dormant enemy. It now explicitly activates that isolated enemy before testing its cooldown; route tests separately verify waiting groups.
10. Per-panel collision could treat two adjacent sections as two concrete walls for laser penetration. The laser now counts shared barrier identities, with a diagonal seam regression.

## Validation record

The first focused run passed 34 of 36 checks and exposed the scenery density issues above. Both density checks subsequently passed. The route, ambush, defense and four-hit concrete checks passed, including the unchanged laser rule and Low detail state.

The full local regression run passed 167 of 169 tests and exposed findings 8 and 9. After those fixes and the laser-seam correction, all 38 affected tests passed: environment, mobile controls (including WebKit), all 192 pure difficulty layouts, all 48 built route clearances, all 12 convoy journeys, ambush activation, salvage, extraction and concrete/laser behavior.

`npm run build`, `npm run test:assets` and `git diff --check` passed. GitHub Pages deployment is gated on a fresh complete 170-test run across eight CI shards; the final public bundle is smoke-tested after deployment. Browser emulation does not establish physical-phone frame rates.

The final two route presentation tests passed. Desktop overview and 390-pixel mobile screenshots were inspected in Detailed and Low modes: zigzag streets, local concrete panels, shoulder pickups and waiting units are visible; controls and HUD fit without horizontal overflow.
