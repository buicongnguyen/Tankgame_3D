# Piercing laser, field supplies and varied stage routes

## Combat rules
- Pulse laser has a 60 m range and damages every living enemy intersecting the beam once per shot, including infantry and airborne bosses. Armor and boss vulnerability still apply.
- A beam passes through the first concrete barricade or stone wall, damaging enemies behind it. The second concrete barrier stops that shot. Neither concrete barrier takes laser damage. Steel, hills, houses, trees and other cover stop the beam at the first contact.
- Repeated laser hits, damage upgrades and skins leave concrete intact, with no damage cracks. Existing cannon and explosion damage to destructible stone walls remains unchanged.
- Resolve ordered intersections before applying damage so chain explosions and salvage do not change which obstacles stop the current shot. Keep short-lived beam and dust effects bounded and use existing shared model geometry.

## Routes for all 16 stages
North is the top of the minimap (negative Z). A thin amber route and small ground chevrons show the direction; they are guidance, not a restriction on player movement. Concrete sections interrupt the old center lane, leaving broad alternating gaps. Outer flanks and concrete gaps stay accessible; the laser fires through cover without opening shortcuts. Reserve road clearance before placing scenery, rather than removing collisions after rendering.

| Stage | Route / purpose | Supply distribution |
| --- | --- | --- |
| First Light | South to north; introductory west/east dogleg | Early laser, recovery at turns, late rocket cache |
| Open Frequency | North to central relay via east approach | Supplies on approach and a reserve near the relay |
| Homeward | South to north convoy; central river bridge then alternating bends | Weapon before the bridge, defense/recovery at bends |
| Long Night | Relay hub with a western/eastern supply circuit | Supplies on multiple short sorties; keep corner attacks open |
| Glass Road | North to south through staggered concrete checkpoints | Laser before first checkpoint, staggered recovery and rockets |
| Last Signal | South to north through offset command defenses | Weapons at separate turns and recovery before command territory |
| River Run | North to south; switch flanks before crossing the central bridge | Caches at inland turns and either bridge approach |
| Frozen Pass | North to south relief convoy through winter bends | Recovery and shield caches near alternating road shoulders |
| Ridge Watch | Relay hub and supply circuit | Split supplies east/west so a single trip does not collect everything |
| White Horizon | North to central relay with an icy east/west approach | Laser early, recovery near the approach, reserve at the relay |
| Cinderfall | South to north through eastern basin, avoiding the caldera | Supplies at dispersed turns, never inside the volcano |
| Dune Lifeline | South to north convoy with offset bends | Supplies on the route shoulders; sand remains hazardous off the marked firm track |
| Canopy Hold | Jungle relay hub and short supply circuit | Near-hub recovery with weapons deeper along the clearings |
| Citadel Dawn | North to south through alternating city intersections | Weapons before roadblocks, shield/recovery at separated intersections |
| Fault Line | South to north via alternating rift checkpoints | Supplies at turns and beyond checkpoints, away from fuel/mines |
| Mire Crossing | North to south convoy on a winding firm track | Distributed recovery and weapons beside the track; water holes remain off-road hazards |

Each level has its own seeded supply layout. Level 2 mirrors suitable route bends; level 3 uses a different supply seed. Routes around the fixed volcano and city street grid retain their orientation. Retry uses the same seed: fair, learnable placement without restart farming. No save schema changes or purchased inventory changes.

## Supply placement and presentation
- Per level: four weapon/ammo caches (laser guaranteed early, arc rocket guaranteed), two shield boxes, two health boxes, two repair centers, and six mines off the safe route.
- Divide route distance into sections and shuffle shield, health and later weapon slots. Jitter positions along and across the road; reserve the chosen footprints before building cover. Keep distinct pickups apart, away from initial spawn, objective, fuel and mines.
- Health: white medical case with a green cross, +60 HP capped at maximum, consumed only if damaged. This adds the requested portable health while retaining 160 HP repair centers.
- Shield: blue hexagonal case with a shield emblem, starts/refills a 6-second shield and readies the Q ability; does not stack duration without limit.
- Weapons retain cyan/purple gun/rocket symbols and short labels. The minimap uses a cross for healing and a shield outline for shield supplies. No extra permanent text panels.
- Supplies are finite per deployment. Retries reset field objects; they do not grant permanent credits or duplicate campaign rewards. Defeated tanks retain their existing weapon salvage drops.

## Runtime integration
1. Pure route configuration and seeded supply planner shared by world building, convoy movement, briefing direction and minimap.
2. Concrete barriers, scenery, route surfaces and pickup footprints use the same reserved geometry. Keep relay approach and defense spawns usable.
3. Convoys follow waypoints, rotate at bends, stop for ground units/cover, pause outside 12 m escort radius, and finish only after the full route. Progress is distance traveled along the route, not world Z. Flying helicopters do not block them.
4. Marked convoy tracks provide firm traction through snow, sand and marsh; off-track terrain retains its existing effects. Render track surfaces above terrain without coplanar snow overlap.
5. Ground attackers use short obstacle-aware detours when a new roadblock obstructs their target. Avoid per-frame global pathfinding and preserve warning/firing behavior.
6. Update manual, shop laser description and radio cues to match the actual rules.

## Acceptance and review
- Beam: multiple enemies; one concrete then enemy; second concrete blocks; repeated upgraded/unupgraded hits leave both barriers intact; steel blocks; out-of-range targets safe; dead units and chain explosions cannot cause duplicate hits; restart cleans visuals.
- All 48 layouts: spawn clearance, supply count/spacing, route and pickups reachable without owning a laser, safe objectives and convoy swept footprint, route variation and reproducible retry.
- Every escort stage/level: actual waypoint simulation reaches extraction, stops for obstacles/player, does not teleport or complete after only changing Z; time target leaves combat allowance.
- Health/shield pickups: no wasted full-health collection, capped healing/shield, once-only consumption, distinct mobile silhouettes and minimap symbols.
- Desktop and phone screenshots in Detailed and Low; no additional heavy particles or persistent geometry leaks.
- Build, relevant regressions and full CI suite; inspect code/logic before commit. Push through the existing SSH remote and verify GitHub Pages deployment and live assets.
