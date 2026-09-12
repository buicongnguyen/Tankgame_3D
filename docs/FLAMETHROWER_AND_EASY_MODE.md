# Flamethrower and more forgiving Easy mode

## Design

Add a ninth weapon: a 480 CR flamethrower, available in the shop with the same 20 upgrade levels as other weapons. Keys 9 / Numpad 9 and the mobile weapon picker select it. Existing weapon IDs, purchases and ammunition slots remain stable; older eight-weapon saves gain a level-zero upgrade slot.

- Reach: 12 m from the tank, 70 degree cone. The aim marker clamps to that range.
- Direct damage: 24 per 0.12-second burst, reduced toward maximum distance. Directional tank armor and boss core modifiers still apply.
- A hit burns for 2 seconds at 18 base damage per second, with the same distance and damage-upgrade factors. Refresh the duration without stacking burn damage. Switching weapons does not extinguish an already burning enemy.
- Each victim takes one hit per burst, irrespective of visible flame count, frame rate or graphics tier.
- Solid cover blocks the stream. Trees, houses, crates and fuel can burn; concrete, steel and indestructible terrain block fire without taking flame damage. Fuel uses the existing chain-reaction explosions.
- Airborne helicopters are outside this ground weapon's reach. Enemy soldiers and jeeps remain vulnerable; approaching tanks and bosses puts the player at risk, rewarding the high damage.
- Unlimited fuel, with a minimum 0.08-second interval after reload upgrades. No extra ammunition inventory or hidden resource to manage.

Easy mode now has **+200% player hull (3x Normal)**: 720 HP before armor upgrades, with the multiplier applied to upgraded hull too. Normal, Hard and Crazy keep their current hull and enemy-count settings. The menu clearly states +200%; no save migration is needed for difficulty.

## Blender and rendering

`tools/blender/build_flame.py` produces `assets/blender/flamethrower.blend` and Detailed/Low `flame.glb` assets. Curved, tapered flame tongues have authored warm vertex colors. Runtime instancing animates the Blender geometry with expansion, upward drift and fading; it does not run a fluid simulation.

One instanced draw call holds at most 96 tongues in Detailed or 36 in Low detail. Both models use the same material/geometry attributes so a live graphics change preserves the effect. Existing smoke and destruction pools remain capped. The asset checker reserves at most 16 KB for the new effect above the existing 4 MB model budget, and checks the Low model is genuinely simpler.

## Implementation and review

1. Author and export both Blender tiers and preserve the editable source.
2. Implement cone exposure, solid-cover visibility, non-stacking burns and bounded visual particles.
3. Add shop purchase/upgrades, persistent equipment, keyboard 9, a nine-weapon responsive picker, and a short-range aim marker.
4. Update Easy health, menu text and affected expectations.
5. Test range/angle boundaries, multi-target hits, cover, fuel chains, bosses, upgrades, pause/retry/quality changes, old saves and desktop/mobile controls. Visually inspect the stream in both tiers.
6. Build, review, commit, push over SSH and let the full GitHub Pages verification gate deploy the release.

## Validation

- All 81 selected Playwright regressions passed, including 11 new flame/Easy tests. Coverage includes cone range and angle, multiple victims, cover/wood/fuel, burn refresh and expiry, frame-rate/detail independence, tank armor, boss cores, level-20 upgrades, old-save migration, pause/retry and burn-triggered mission completion.
- Desktop, portrait and landscape controls passed. iPhone WebKit rendered the custom per-instance transparency shader in both tiers without graphics errors.
- The compiled production build passed real keyboard and touch checks in all three layouts: purchase, upgrade, direct selection, held fire, Low detail, reload and persistence. Easy displayed 720 HP. No script errors, missing assets or horizontal overflow were reported.
- Screenshots of the controlled combat scene and the production build were visually reviewed in both detail settings.
- TypeScript/Vite build and all 34 Blender asset pairs passed. Flame assets contain 189 Detailed / 25 Low triangles and total 6,156 / 1,860 bytes. Total models: 4,003,452 bytes Detailed and 1,768,404 bytes Low.
- Code review confirmed that flame visuals do not multiply damage, burn damage stops during pause, visibility is captured before fuel explosions, concrete/steel remain intact, existing ammunition slots stay stable and Easy health does not change enemy counts. Burn visuals reserve at least two thirds of the particle pool for the player's stream.
- GitHub Pages remains gated on the complete browser suite, asset checks and production build.

Rebuild the authored source and both GLBs from the repository root with Blender 4.5+: `blender --background --python tools/blender/build_flame.py`.
