# Rendering, contact logic and frontier art review

## Findings resolved

| Area | Finding | Resolution and evidence |
| --- | --- | --- |
| Snow/ice wrecks | The old scorch disc sat at 0.035 m, close to snow at 0.025 m and under ice at 0.04 m. | World-space marks at 0.14 m, soft texture and depth bias; camera near plane increased from 0.1 to 0.5 m. Pixel samples stay visibly darker with the mark enabled throughout the snow/ice camera paths. |
| Effect ordering | Raised scorch marks dimmed the aiming ring in a pixel check (404 RGB-channel difference). | Cosmetic marks now render before transparent warnings; the aiming ring renders afterward with depth testing retained. |
| Wreck shading | Dense live-tank details retained moving self-shadows after destruction. | Burnt meshes retain cast shadows but disable shadow reception; hidden original tanks and boss cores remain hidden. |
| Wreck lifecycle | A mark separated from the rig needs coordinated removal. | The bounded wreck entry owns root and scorch references; eviction and stage cleanup remove both. Shared materials/geometries remain reusable. |
| Infantry contact | The 3D tank only collided with soldiers; no run-over behavior existed. | Player contact kills require at least 3 m/s of actual accepted travel. Short movement segments resolve cover/vehicles before swept infantry contact. |
| Kill accounting | Contact must not accidentally satisfy tank-only objectives or award tank drops. | Contact calls the existing infantry death path, which is idempotent and increments only infantry kills. Pause, death, slow movement and allied enemy armor cannot trigger a run-over. |
| Frontier geometry | Primitive silhouettes and empty surfaces made the new kit look unfinished. | Blender-authored ridges, caldera channels, basalt fractures, palm leaflets, branches, outer leaves and facade/roof details, with compact packed normal/albedo textures. |
| Low tier | Imported normals and many separate detail nodes wasted resources or produced harsh foliage facets. | Fine groups are omitted; remaining geometry is batched and decimated with imported normals cleared. Both tiers keep matching runtime surfaces. |
| Instancing | New boundary instances need disposal and updated culling bounds after a detail swap. | Instance disposal releases their buffers without freeing shared templates; geometry swaps recompute bounding spheres and retain transforms/materials. |
| Ground composition | Old untextured squares stood out against the new surface maps. | Removed those squares from frontier stages. Extended background ground beneath perimeter scenery and added natural sand ripples/city sidewalks. |

## Logic review

- Tank contact tests use the path actually accepted by collision resolution; a large requested displacement cannot hit infantry behind a blocking wall.
- A sand-trapped standard tank travels at 2.25 m/s, below the run-over threshold. Ice momentum can still produce a valid fast impact after the stick is released.
- Enemy tanks continue to collide with their own soldiers. The campaign has no allied player infantry, and this change does not add friendly crushing.
- Infantry death still uses ordinary non-graphic particles. It grants no new credit stream, weapon ownership or tank salvage.
- Neutral rockfall damage, mission metadata, saved progression, weapon selection, repair centers and the 0.8-second stage finish are unchanged.
- Terrain/trap footprints remain authoritative for visuals, movement and minimap. Added sidewalks and background instances create no collision barriers or hazards.
- No new per-frame texture generation, dynamic lights, postprocessing or physics debris. Texture/model ownership is separated from runtime instance ownership.

## Measured art budgets

- Detailed: **25 GLBs, 2,774,388 bytes, 34,350 triangles**.
- Low detail: **25 GLBs, 1,293,996 bytes, 8,952 triangles**, 74% fewer than Detailed.
- Each individual prop remains below 3,000 triangles; the existing tank remains 5,712 detailed / 1,692 low triangles.
- Frontier image dimensions are validated at no more than 128 × 128. All textures are authored locally and embedded in GLBs; no external texture requests.
- Detailed limit remains 3 MB. Low limit increases from 1.2 MB to 1.5 MB for packed surface maps, while its geometry total decreases relative to the previous release.

## Validation record

The initial focused run passed 26 checks covering all frontier layouts/objectives, both graphics packs, WebKit touch switching, contact cases, winter screenshots and pixel-level scorch visibility. The instance ownership/swap regression also passed in the full **93-test** run (4.6 minutes). A final pixel regression then reproduced aiming-ring occlusion by the raised scorch mark; draw order was corrected and all 12 affected rendering/contact checks passed (30.6 seconds). The production build and both-tier asset validation pass. GitHub Pages runs the complete suite again before publication.

The screenshots were checked at phone and desktop sizes. The work improves a stylized game; it does not claim AAA photorealism or a measured physical-phone frame rate. The gameplay plane remains flat, and no terrain climbing or rigid-body simulation was added.
