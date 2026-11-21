# Cover art brief for Codex (Steel Front: Last Signal)

The command screen now draws a procedural space sky (`src/three/cover.ts`), with a holographic orbit and planet buttons on top. This brief asks for painted art that can replace or enrich that sky.

Hand the prompt below to Codex as it is. Once the files are in `public/cover/`, ask Claude to wire them in. Wiring means three things:
- the key art becomes the `--cover-sky` background;
- the planet icons become the stage buttons and orbit worlds;
- the procedural sky stays as the fallback while the images load.

---

## Prompt for Codex

**Where to work**
- Repository: `C:\Users\n\source\repos\Tank_game_3D` (GitHub: buicongnguyen/Tankgame_3D).
- Save every image in `C:\Users\n\source\repos\Tank_game_3D\public\cover\`, and create the folder if it is missing. The files to create are:
  - `key-art-landscape-a.webp` (and `-b`, `-c`)
  - `key-art-portrait-a.webp` (and `-b`, `-c`)
  - `key-art-square.webp`
  - `world-01.webp` … `world-16.webp`
  - `logo-steel-front.webp`
  - `app-icon.webp`
  - `README.md`
- Put scratch files only in `C:\Users\n\source\repos\Tank_game_3D\.tools\` (git-ignored), and delete them when done.
- Do not switch branches, commit, push, or edit or revert any other file. The folder holds someone else's unfinished work; only add the files above.
- To match the real tank's colours and shape, use `C:\Users\n\source\repos\Tank_game_3D\public\skins\classic.png` as the reference image.

You are making the cover and menu art for **Steel Front: Last Signal**. It is a stylized 3D tank game for the browser and phones (Three.js). Generate the images listed below, save them under `public/cover/` with the exact file names and sizes given, and change no code.

### The game, so the art tells the right story

The player commands one tank, the **Cobalt Kestrel**, in the **Kestrel Division**. A machine network called **the Warden** has besieged the **Meridian system**. The campaign is a road home across 16 stages on many worlds: forest valleys, river villages, snow passes, highland transmitters, industrial plants, red wastelands, seismic rifts, marshes and a final city citadel. The mood is a heroic rescue against overwhelming machines: hope against the odds, not grimdark.

### Art style (applies to every image)

- **The game's own look, polished to a premium console-game cover.** Chunky, readable, slightly toy-like low-poly 3D forms with clean bevels. Think bright, collectible miniatures in a cinematic scene. Aim for a top-tier family-friendly console racing or arcade game. Do not imitate any real game, brand or logo.
- **The hero tank** must match the in-game Cobalt Kestrel:
  - a compact, chunky, stylized main battle tank;
  - royal-blue hull and turret with bright golden-yellow side skirts, track guards and gun-barrel band;
  - a white five-point star on the hull side and a white stripe across the turret top;
  - dark grey tracks with round golden road wheels and a thin radio antenna;
  - gun pointing forward and slightly up, three-quarter front view.
- **The enemy (the Warden):**
  - angular dark gunmetal machines with **red** glowing sensor eyes and red engine light;
  - walkers, spider tanks, gunships and wedge-shaped warships;
  - never human soldiers; never gore.
- **Allies:** sleek blue-grey ships with **cyan** engine glow.
- **Light and colour:**
  - very dark blue-black space;
  - vivid nebulae in magenta, violet and warm orange;
  - a warm amber sun as the key light, from the upper left;
  - cyan rim light on the planets' atmospheres;
  - strong value contrast.
  - Colours are vivid and saturated, not pastel and not washed out.
- **Rendering:** clean stylized 3D render: soft global illumination, crisp edges, gentle depth of field, subtle bloom on lights. No photo-real grime, no film grain, no chromatic aberration.
- **Never include:**
  - text, letters, numbers, logos, UI, watermarks or signatures (the game adds its own text);
  - real-world flags or insignia, or national symbols other than the plain white star.

### Files to make

**1. `key-art-landscape.webp`: 2560 × 1440, the desktop and landscape cover.**

Composition (the game overlays a menu, so these areas matter):
- **Lower left to centre:** the curved horizon of a blue ocean planet with green and amber continents and city lights on its night side. Its thin cyan atmosphere glows along the curve. The Cobalt Kestrel stands **on a rocky outcrop or landing pad on that horizon**, centred at about 30% of the width and 62% of the height. The tank fills about 30% of the image width and is lit by the amber sun, with a cyan rim light.
- **Upper middle, around 60% of the width and 25% of the height:** a large ringed gas giant with cream, amber and rust bands, its rings tilted about −18°.
- **Between the gas giant and the tank:** a distant space battle. Small allied ships with cyan engines trade tracer fire with red-lit Warden warships, with a few bright explosion flashes.
- **Top left:** a small red, burning war world with orange fire-light on its night side, and a small grey moon. Above them, a band of nebula.
- **Right third, from 70% to 100% of the width:** keep it calmer and darker (deep space, faint stars, a soft violet nebula edge), because the mission card sits there.
- **Top-left 35% × 30%:** keep it calm and dark-ish, because the title "STEEL FRONT" sits there.
- **Bottom 15%:** planet surface fading into darkness, because the dock buttons sit there.

**2. `key-art-portrait.webp`: 1290 × 2796, the phone portrait cover.**

The same world, recomposed for a tall screen:
- **Top 45%:** the scene.
  - The ringed gas giant is large on the right, at about 80% of the width and 17% of the height, and partly cropped by the right edge.
  - The Cobalt Kestrel stands at about 72% of the width and 26% of the height, in front of the gas giant, slightly smaller.
  - The space battle and tracers cross the middle at about 30% of the height.
- **Left 55% of the top 22%:** calm and dark, for the title.
- **From 42% of the height down:** the ocean planet's horizon curves across, then everything fades to near-black navy. The mission card covers the lower 55%, so keep that part simple and dark with faint stars only.

**3. `key-art-square.webp`: 1600 × 1600, for loading and social posts.**

The tank centred on the planet horizon, with the gas giant behind and the battle in the sky. It may be more dramatic, with a low camera and a strong rim light. Keep a quiet dark margin of about 12% at the top and bottom.

**4. Stage worlds: sixteen planet icons, `world-01.webp` … `world-16.webp`, 512 × 512, transparent background.**

Each is a single stylized planet sphere:
- about 440 px across, centred, lit from the upper left;
- a thin atmospheric rim in its key colour, and a soft glow that fades out before the edges;
- readable at 44 px, so it needs a bold silhouette, two or three main colour masses and one signature feature;
- consistent lighting, scale and style across all sixteen, so they look like one set;
- no text or numbers.

| File | Stage | World look (key colour) |
|---|---|---|
| world-01 | First Light | Lush green forest world, morning-mist clouds, a tiny glint of a distress beacon (green) |
| world-02 | Open Frequency | Warm farmland and village patchwork, a relay tower spark (gold) |
| world-03 | Homeward | Blue river world with winding rivers through green land (sky blue) |
| world-04 | Long Night | Violet-grey highland ridges at dusk, a glowing uplink dot (lavender) |
| world-05 | Glass Road | Rust-orange industrial world, factory lights, smoke streaks (orange) |
| world-06 | Last Signal | Crimson wasteland, a dark Warden fortress scar with red light (red) |
| world-07 | River Run | Flooded valleys, bright blue water network (sky blue) |
| world-08 | Frozen Pass | White snow world with blue ice caps and mountain shadows (ice white) |
| world-09 | Ridge Watch | Dark violet highlands with a single bright transmitter beam (lavender) |
| world-10 | White Horizon | Pale-cyan glacier world, polar ice sheets, a tiny research-station light (pale cyan) |
| world-11 | Cinderfall | Black volcanic world with glowing magma rivers and ash clouds (magma orange) |
| world-12 | Dune Lifeline | Amber desert world with rippled dune seas and a thin green oasis line (amber) |
| world-13 | Canopy Hold | Vivid green jungle world with dense canopy, white storm clouds and an equatorial river (jungle green) |
| world-14 | Citadel Dawn | Violet city world with a glowing grid of city lights and one bright citadel spire at dawn (violet) |
| world-15 | Fault Line | Cracked amber-red rock with glowing magma rifts (ember orange) |
| world-16 | Mire Crossing | Teal-olive marsh world, misty swamps, reflective water (sea green) |

**5. `logo-steel-front.webp`: 2048 × 640, transparent.** This is the **only** file allowed to contain text. It reads exactly "STEEL FRONT":
- a bold condensed, slightly italic, military-sci-fi wordmark;
- "STEEL" in polished chrome-white with a cool blue reflection;
- "FRONT" in a hot gradient from gold through orange to magenta;
- a thin cyan edge glow and a subtle bevel;
- no other words, no emblem.

**6. `app-icon.webp`: 1024 × 1024, no transparency.** The Cobalt Kestrel's turret and barrel, three-quarter view, filling 70% of the icon, against a deep-space background with a glowing cyan planet rim behind it. Bold and readable at 48 px. No text.

### Delivery rules

- Save in WebP at quality 90; the planet icons and the logo need alpha. Keep each landscape or portrait file under 900 KB and each planet icon under 60 KB.
- Make two or three variants of files 1 and 2 (`-a`, `-b`, `-c` suffixes), so the owner can choose.
- Also write `public/cover/README.md` with, for every file: the prompt you actually used, the tool or model used, and the date.
- Change no source code, no tests and no other folder.
- All art must be original. Do not use any existing game's characters, logos or screenshots as input.

---

## Notes for wiring (Claude, later)

- **Key art:** set `--cover-sky` to `url(cover/key-art-landscape.webp)` or `url(cover/key-art-portrait.webp)` according to orientation, in `refreshCover()`. Keep the painted canvas as the instant first paint, then swap in the image once it has decoded (no 404 if it is missing: check `manifest.json`, or ship the files first).
- **Worlds:** use `world-NN.webp` as the background of `.route-item[data-value=N-1]` and `.orbit-world`, keeping the gradient as the fallback.
- **Size:** check the bundle stays small (lazy-load the worlds after the menu is up), and run `tests/ui-polish.spec.ts` and `tests/command-screen.spec.ts`.
