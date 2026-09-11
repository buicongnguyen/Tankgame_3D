# Wreck stability, infantry contact, and frontier art polish

## Findings and goal

The 14-operation campaign is deployed at `ebfa114`. Review found a wreck scorch disc only 0.01 m above old snow and 0.005 m below the polar ice sheet. The camera uses a very small 0.1 m near plane despite its elevated viewpoint. This makes shallow depth separation fragile. Wrecks also retain dense live-vehicle self-shadowing. The 3D collision solver treats infantry as solid obstacles and has no run-over damage; the 2D reference has a speed-based infantry crush rule.

The frontier kit is readable but still visibly primitive: straight ice cones, a regular volcano cone with floating lava strips, broadleaf spheres, unsegmented palms, plain apartment facades, and flat circular sand marks. Improve construction detail, natural silhouettes, surface variation and composition while keeping Low detail useful. AAA art direction is a reference for material credibility and scene composition; this work must not claim the production scope or photorealism of a full AAA game.

## Implementation plan

1. **Stable wrecks and ground effects.** Put scorch marks above all flat terrain overlays, use a soft edge and explicit depth bias without disabling depth testing, and separate their transform from the tank rig. Increase the camera near plane within the safe overhead-camera clearance. Prevent tiny wreck details from self-shadowing while retaining their cast shadow. Keep at most 14 wrecks and release the associated ground mark when one is evicted. Verify snow, ice and road boundaries, overlapping wrecks, camera movement, both detail tiers and cleanup.
2. **Tank versus soldier.** Add deliberate player-tank run-over kills at a minimum actual travel speed of 3 m/s. Standing still or nudging does not kill. Resolve solid cover and vehicles before contact damage; test only the path the tank actually travels so walls protect soldiers. Use swept contact on accepted movement segments to avoid missing a soldier during a long frame. Keep infantry kills separate from tank objectives and weapon drops. Enemy armor does not crush its own infantry. Add a concise field message and ordinary non-graphic defeat effects. Verify slowed sand movement, ice momentum, diagonal movement, repeat contact and pause/death guards.
3. **Blender frontier artwork.** Rebuild the six frontier assets with irregular glacier ridges/fissures, a less regular caldera and surface-conforming lava channels, fractured basalt, branching jungle trees, split palm leaflets and richer city construction (recessed windows, sills, entrance, balconies, rooftop services and pipes). Add compact authored material surface variation where it improves the overhead view. Re-export the editable `.blend` and both GLB tiers. Recalculate low-tier normals after simplification and preserve material/rig compatibility.
4. **Environment composition.** Replace generic boundary cubes in the frontier with biome-appropriate shared scenery, give sand pockets natural ripple detail while retaining a readable exact hazard boundary, and enrich city sidewalks and vegetation accents without changing collision/service/convoy routes. Avoid decorative shapes that look like new gameplay hazards. Essential terrain and warning geometry stays visible in Low detail.
5. **Review and validation.** Review resource ownership, detail switching, collision ordering, death accounting, neutral hazards, save compatibility and mission completion. Add focused regression tests for actual failures and contact rules. Run model validation, TypeScript/build and the full browser suite including mobile/WebKit. Inspect real gameplay screenshots in all five frontier biomes and wreck camera paths.
6. **Release.** Document actual budgets and review results. Commit and push over the existing SSH remote. Wait for all Pages verification jobs and deployment, then smoke-test the live game in isolated browser contexts.

## Acceptance and budgets

- Scorch marks never intersect the snow/ice surface or inherit turret/hull transforms; hidden live tanks cannot reappear after destruction. No unbounded emitters, textures, lights or runtime debris.
- A moving player tank can defeat contacted hostile soldiers; a tank stopped by a wall cannot kill somebody behind that wall. Infantry kills do not complete tank-only objectives or drop tank salvage.
- All 14 starting layouts, service pads and convoy routes remain valid. The 0.8-second stage ending, rewards, skins and saved weapons remain intact.
- Prefer the existing asset budgets; if the authored detail exceeds them, allow up to 4 MB for detailed models and 1.5 MB for Low detail, with the low geometry still below 40% of the detailed total. Record actual bytes/triangles. No large downloaded texture packs, postprocessing stack or per-prop lights.
- Physical-phone frame rate and thermal behavior require device measurements; desktop emulation verifies functionality and layout only.

## Implementation and review record

Plan recorded before code/art changes. All implementation items are complete. The code/logic/art findings, measured budgets and validation record are in [RENDERING_AND_FRONTIER_POLISH_REVIEW.md](RENDERING_AND_FRONTIER_POLISH_REVIEW.md). The measured detailed tier stayed below the original 3 MB budget; the 1.29 MB low tier uses the planned 1.5 MB ceiling for packed surface maps.
