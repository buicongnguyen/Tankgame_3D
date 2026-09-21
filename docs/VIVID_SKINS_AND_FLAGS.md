# Vivid skins, optional flags and High Detail defaults

## Result

- New campaigns start in **High Detail** on desktop and mobile. Low Detail remains in Settings.
- Automatic mobile Low saves (`graphicsChosen: false`) move to High. Explicit choices, graphics-loss recovery Low and legacy Low saves without a preference marker stay unchanged. Purchases, progress and selected skins are preserved.
- The free starter **Cobalt Kestrel** uses vivid cobalt armor, amber trim and white stars. The existing `classic` save ID is retained.
- Four additional Blender variants add bright colors, six painted stripes and two to five stars per fender. Their prices and combat bonuses match existing skins:

| Skin | Colors / stars | Credits | Bonus |
| --- | --- | ---: | --- |
| Coral Flash | Coral / white · 2 | 300 | +18% speed |
| Tropical Wave | Turquoise / yellow · 3 | 350 | +1.5 s shield |
| Lime Viper | Lime / magenta · 4 | 450 | +15% damage |
| Electric Aurora | Violet / mint · 5 | 800 | +10% speed and damage; 5 s shield |

## Country flag

Choose **Skin → Country flag**. None is the default; flags are free, cosmetic and saved independently of the skin. Available choices: Vietnam, Japan, France, Germany, Italy, Ukraine, Poland and Indonesia.

A small rigid pennant sits on the rear fender. Its vertex colors and mast merge into the existing skin paint mesh: no texture, light, animation, collision, targeting or combat bonus. Already-painted skins need no additional draw call; older unmarked skins use one additional draw call for the combined pennant mesh. At most 70 extra triangles appear on the player's tank. Paint geometry is cached per skin and flag and reused. Both sides display the flag; the reverse mirrors the front like a real flag. Enemies and allies retain their original markings. Training retains the selected flag while using its standard loan tank.

## Authoring

`tools/blender/build_skins.py -- --only=classic,coral,tropical,acid,aurora` renders only these shop previews and saves their `.blend` sources while regenerating the complete palette/paint catalog. Runtime geometry is in `skin-markings.json`; preview PNGs and Blender source files are separate from gameplay downloads.

## Review and validation

Regression coverage checks graphics preference migration; skin purchase persistence and equivalent combat tiers; mobile flag selection and clearing; training and mission persistence; enemy isolation; matching star counts; bounded geometry caching; unchanged draw calls on painted skins (at most one additional call on unmarked skins); and geometry retention across High/Low swaps. Existing graphics tests cover Chromium mobile portrait/landscape, iPhone WebKit and graphics-loss recovery. Visual checks include the mobile shop and the tank from front and rear.

Local validation: production build and Blender asset budgets passed; 89 distinct affected regression tests passed, including mobile Chromium and iPhone WebKit. New previews use a revision query so returning browsers see the updated starter paint. Physical-device frame rate remains device-dependent; the existing Low Detail setting and graphics-loss recovery remain available.
