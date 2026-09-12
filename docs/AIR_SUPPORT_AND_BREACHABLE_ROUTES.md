# Air support, threat ranges and route progression

## Design
- R / AIR SUPPORT opens two choices: 1 Barrage, 2 Supply drop. Escape closes the chooser. The barrage drops twelve bombs around the call position: 18 m ring radius, 8 m blast radius and a 10 m central gap. The ring stays fixed when the player moves. Opposite bomb pairs arrive from 1.2 to 2.3 seconds after the call. Off-map bomb centers are omitted to preserve the central gap. Warning circles and falling Blender munitions share the actual target positions. Blasts retain friendly fire and normal fuel chain reactions; supply drops stay separate.
- Hard capture/defense missions receive one supply call; Crazy receives two. Both options share a 28-second radio cooldown. Supply calls are separate from the limited 1-in-3 wreck drops; no unlimited healing or ammo loop.
- Supply payload: hull below 80% receives 40 HP (Hard) or 35 HP (Crazy); otherwise refill a depleted purchased special weapon with 2 arc rockets or 4 laser shots; otherwise deliver a 4-second shield. Existing health and ammo caps apply. A clear nearby landing site is required before spending the allowance.
- The crate descends for 3.2 seconds under a lightweight canopy, with a mint landing ring. It can only be collected on the ground. Pause freezes descent; retries remove the drop and reset its allowance.
- Sight radius: riflemen/rocketeers 34 m, vehicles 44 m, bosses 48 m. Cover still blocks sight; group alerts stay local and defense arrivals remain staggered. Ordinary aimed-fire warnings last up to 1.2 seconds. Actual weapon reach and boss heavy-attack warnings are unchanged.
- Mine trigger radius increases from 1.5 to 2.7 m. The red ring uses the same constant. Grounded enemies also trigger mines; high-flying helicopters do not. Blast radius stays 4.5 m.

## Route and scenery changes
- Each background starts with a direct travel route, short capture approach or small defense circuit. Level 2 introduces the longer approach/loop. Level 3 adds the longest sweep or circuit. O routes retain free branch selection.
- Most large interior ridge footprints now contain two concrete rows in Level 2 and three in Level 3. Keep at most two natural landmarks on these layouts and fewer scattered volcanic rocks/boundary hills.
- Preserve the road, convoy clearance, relay, pickup access and volcano footprint. Reserve shortcut space so scenery cannot fill a newly breached passage.
- Concrete remains 176 HP: four base cannon hits destroy only the struck section. Laser passes through one wall without damaging it and stops at the next layer.
- Instance concrete across the entire map to bound draw calls. Each physical wall retains its own identity for laser penetration, while each section retains independent damage and visibility.

## Verification and release
1. Check all 48 routes and all difficulties for monotonic route length, clear spawns, roads and supply access.
2. Exercise air support eligibility, cooldown, payload/caps, landing, pause/retry cleanup and keyboard/touch selection.
3. Check mine range boundaries, enemy activation/occlusion, local concrete destruction and laser wall identity.
4. Inspect desktop and phone UI, including Low detail; run the complete regression suite and production build.
5. Commit, push to GitHub main using the existing SSH remote, wait for the Pages verification/deployment workflow, and check the live production build.


## Ring-barrage verification
- Check all compass directions, both sides of the blast boundary and safe center; aim and later movement must not change the called coordinates.
- Check all four map corners and edges: no bomb is clamped into the safe center or outside the battlefield.
- Exercise damage to nearby soldiers, tanks and scenery, single detonation, cooldown, pause, death/phase gating and retry cleanup.
- Review desktop, portrait and landscape controls plus Detailed/Low warning circles and falling bombs. Keep shared model geometry and capped effects.
