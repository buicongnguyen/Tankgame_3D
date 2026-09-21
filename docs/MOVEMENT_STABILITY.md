# Camera and movement stability

The reported issue was background shaking during quick downward or sideways movement in level two. Terrain is constructed once per mission; no terrain streaming was running during movement.

## Findings and fix

- The render limiter tolerated only 0.5 ms of early frame timing. A simulated 60 Hz sequence with alternating +/-0.7 ms timestamps rendered 151 of 300 frames. A 2 ms tolerance preserves the deadline and frame cap while accepting ordinary timing variation. The same regression now renders all 300 frames. The fixed 60 Hz combat simulation is unchanged.
- The directional shadow camera followed every tiny player movement. Static objects consequently moved through fractional shadow texels, causing crawling/shimmering shadows. The shadow anchor now snaps to whole texels in the angled light's coordinate system. Shadow resolution, visible detail and light direction are unchanged. This uses reusable vectors and adds no textures, meshes or render passes.
- Route look-ahead could reverse by 16 metres at a nearby segment or when changing direction on a loop. Its existing easing now also limits lead movement to 8 metres per second. Paused/zero-time updates preserve the lead; a new mission still resets it immediately.

## Verification

- Regression tests reproduced all three failures before the fix.
- Timing tests retain the 30/60 FPS limits on 60/120/144 Hz displays and bounded simulation catch-up after stalls.
- Shadow projection checks cover six seconds of fast lateral/downward motion and reversals: stationary world points retain their shadow-texel alignment.
- Desktop and phone landscape checks exercise level-two O-loop direction reversals at 18 metres per second, in High and Low graphics modes, verifying the player stays framed and camera movement remains bounded.
- Existing camera bend/deployment, graphics switching, mobile recovery and route-preview tests remain applicable.

These automated browser checks validate motion and rendering correctness. They do not establish a guaranteed frame rate on every physical phone; High Detail remains the selected default and Low Detail remains available.
