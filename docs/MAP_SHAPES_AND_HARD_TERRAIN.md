# Map sweeps and indestructible terrain

## Plan

Expand selected existing levels across the arena without changing campaign checkpoints or enemy counts. Keep introductory, relay and defense layouts; use S, mirrored S, L and U patterns on 23 of the 48 levels.

- S / mirrored S: three full-width lanes joined by opposite turns. Bounds span 100 by 88 meters, and the route is 388 meters long.
- L: a long vertical leg and a horizontal crossing, 188 meters total.
- U: two long legs joined around a central landmass, 276 meters total.
- First Light level 2 introduces an S sweep. Glass Road offers S, mirrored S and U; Last Signal starts with L. Later escort, volcanic and seismic levels mix the patterns. Each level has a reproducible pattern and supply seed.
- Reserve the eight-meter road, spawn, encounter pockets, supply pads and their access paths before placing natural terrain. Hills and large volcanic rocks shape the spaces between lanes. Concrete remains separately destructible, one section at a time.
- Natural cover has infinite durability, blocks conventional projectiles and the laser, and uses the existing Blender assets in both detail tiers. Arc rockets retain their ability to fly over cover.
- Batch repeated natural props with instanced meshes; keep the same footprint for graphics, collision and navigation. Detail switching must preserve their placement and collision.
- Reuse route-based enemy activation, convoy movement and extraction. Increase time-bonus targets when necessary for the longer journey. Keep supplies off the route at existing difficulty counts.

## Level distribution

A dash means the existing winding route stays in place. Relay and defense stages retain their established approach/circuit.

| Stage | Level 1 | Level 2 | Level 3 |
| --- | --- | --- | --- |
| First Light | — | S | Mirrored S |
| Homeward | — | S | Mirrored S |
| Glass Road | S | Mirrored S | U |
| Last Signal | L | U | S |
| River Run | — | U | L |
| Frozen Pass | — | Mirrored S | U |
| Cinderfall | — | L | U |
| Dune Lifeline | — | U | S |
| Fault Line | S | Mirrored S | L |
| Mire Crossing | — | U | Mirrored S |

## Validation

Check all 192 difficulty layouts, all built route/spawn/service clearances, and all twelve convoy journeys. Verify the S covers all quadrants, its mirror is exact, L and U retain distinct turn geometry, and no route intersects the volcano. Fire real projectiles and lasers at natural cover; verify durability and protection behind it. Inspect desktop and mobile examples in Detailed and Low modes. Run the full release suite before GitHub Pages publication.

## Review results

- The first 27 tests passed, covering pattern geometry, all 192 difficulty layouts, all 48 built route clearances, all twelve convoy journeys, ambush activation, supply access, local concrete damage and laser behavior.
- A broader 52-test campaign/environment review passed 51 checks and found eight fuel crates in the volcanic U finale, below the existing density requirement. A free-area fallback restores the established fourteen-crate cap while retaining every clearance check.
- The final 14 affected checks passed, including all Crazy finale counts, fuel density, desktop/mobile views, natural cover durability and all 48 route clearances.
- Visual review found the first rock proportions too flat; raised the outcrops and brightened their instanced basalt tint without editing shared materials. Desktop and mobile S/L/U views were inspected in Detailed mode, and the U view in Low mode.
- Existing Blender assets are reused. Natural formations use per-model instanced draws, shared geometry and materials; restart disposes instance buffers, and graphics switching preserves transforms and collision. No new asset download is required.
- `npm run build`, `npm run test:assets` and `git diff --check` passed. Publication is gated on the complete 176-test CI suite, followed by live desktop/mobile smoke checks. Browser checks do not measure physical-phone frame rates.

The final two interaction checks also passed: all 23 shaped Crazy layouts keep units and pickup connections clear, and actual driving in Low detail stops at natural cover while an open flank remains drivable.

The first complete CI run exposed an old helicopter/convoy fixture that assumed Mire Crossing always starts at (0, -50) heading south. The fixture now places the helicopter one meter along the actual first route segment and checks convoy distance and its complete start position, so it also validates the new westbound mirrored-S start.

All eight extreme-boss regression tests passed after the convoy fixture correction, including helicopter landing, flight collision, spider traversal, laser bursts and mobile detail swaps.
