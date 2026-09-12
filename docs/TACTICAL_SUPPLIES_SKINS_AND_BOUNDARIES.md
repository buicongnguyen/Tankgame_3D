# Tactical supplies, markings and map boundaries

## Design
- Air Support supplies are available in every mission. Easy and Crazy allow two calls; Normal and Hard allow one. Keep small need-based payloads, the shared 28-second radio cooldown, clear landing checks and collection after touchdown. Wreck drop balance stays unchanged.
- Keep six mines per map. Place one, two or three on the road as stage level increases, alternating the occupied side and preserving the opposite dodge lane. Keep spawn, objective and supply access safe. Remaining mines stay off-road.
- Add five Blender-authored vivid skin tiers with one through five stars and racing stripes. Prices and actual damage, speed and shield bonuses rise together. Existing skins and saves retain their behavior. Share the markings geometry and materials; do not duplicate complete tank models or add realtime lights.
- Enclose all four map edges with continuous rectangular rock strata, one instanced draw call and four indestructible collision footprints. Keep existing playable bounds and all routes inside them.
- Expose eight compact desktop weapon buttons. Support 1–8 on the top row and number pad; retain the larger touch gun picker. The Air Support chooser keeps its contextual 1/2 actions.
- Empty advanced ammo switches left to the nearest usable weapon, skipping empty or unavailable slots. Preserve firing cooldown and the preferred loadout for the next mission.

## Skin tiers
| Skin | Stars | Price | Speed | Damage | Shield |
|---|---:|---:|---:|---:|---:|
| Rally Comet | 1 | 600 | +22% | +5% | 3 s |
| Neon Sentinel | 2 | 800 | +10% | +10% | 5 s |
| Solar Talon | 3 | 1100 | +18% | +20% | 5 s |
| Royal Nova | 4 | 1450 | +22% | +24% | 5.5 s |
| Prism Ace | 5 | 1900 | +25% | +28% | 6 s |

## Verification
Check all 48 layouts across four difficulties for road mines and dodge clearance. Exercise support landing, consumption and retry on every difficulty. Test actual keyboard and button selection, fallback ordering and saved preference. Verify all rock edges collide and survive attacks. Review Blender previews and runtime markings at both graphics settings, including mobile layouts, material reuse and old-save compatibility. Run build, asset checks, targeted browser regressions, then the complete GitHub Pages verification workflow before checking the public build.

## Implemented checks
- All 192 generated layouts keep six mines, with the intended one/two/three road placements. Real scenery across all 48 levels leaves the dodge lane, routes, objectives and pickups clear.
- Browser regressions verify leftward fallback, empty-attempt guards, next-mission preferred weapon restoration, 1–8 and Numpad selection, and the radio menu's contextual shortcuts.
- The five new Blender paint meshes use 32–112 triangles and one shared material. The existing GLB pack remains 3,991,144 bytes; Low remains 1,763,260 bytes. Runtime screenshots confirm paint placement in both detail tiers.
- Build and asset checks pass. Desktop 1440×900 and mobile 320×568, 390×844 and 844×390 controls and shop checks pass. Compiled production UI was also checked at desktop, portrait and landscape sizes with every difficulty, no script errors, missing assets or horizontal overflow.
- Reviewed and fixed an explicit weapon-button/radio-choice conflict. Isolated a laser regression fixture from newly generated road mines so the target stays in the intended beam path.
- GitHub Pages remains gated by the complete browser suite and a fresh production build.
