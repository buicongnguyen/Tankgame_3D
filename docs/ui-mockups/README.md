# Steel Front UI mockups

Stored as WebP (quality 82) to keep the repository small; Codex exported them as PNG.

Design references for an HTML/CSS rebuild, created 2026-11-22. Open each PNG at its intended logical size to evaluate spacing. Desktop uses 1280 × 720 CSS pixels at 1.5×. Phone portrait uses 390 × 844 at 3× and phone landscape uses 844 × 390 at 3×.

## Design rationale

The desktop card sits on the right so the Kestrel remains visible on the left. Phone portraits use one column with 16 px side margins. In battle, the sticks sit in opposite lower corners and the stage announcement leaves the central aiming area open. Use a 4 px spacing scale, 12 px modal corners, a 3 px accent rail and an 8 px cut on primary buttons. The cyan frame identifies ordinary panels, coral identifies defeat, and gold identifies results. Filled and outlined stars and medals distinguish earned status without relying on color. Use Barlow Condensed for titles and numbers and Barlow for labels and body copy. Keep phone controls at least 44 CSS px tall, including the whole row for compact settings. Allow wrapping for Vietnamese; the supplied screens use English copy.

## Files

| File | Export | Prompt | Tool | Date |
| --- | --- | --- | --- | --- |
| [battle-hud-pc.webp](battle-hud-pc.webp) | 1920 × 1080 | battle-hud / desktop | HTML/CSS + Chromium + OpenAI imagegen backdrop | 2026-11-22 |
| [battle-hud-phone-land.webp](battle-hud-phone-land.webp) | 2532 × 1170 | battle-hud / landscape | HTML/CSS + Chromium + OpenAI imagegen backdrop | 2026-11-22 |
| [battle-hud-phone.webp](battle-hud-phone.webp) | 1170 × 2532 | battle-hud / portrait | HTML/CSS + Chromium + OpenAI imagegen backdrop | 2026-11-22 |
| [components-pc.webp](components-pc.webp) | 1920 × 1080 | components / desktop | HTML/CSS + Chromium | 2026-11-22 |
| [defeat-pc.webp](defeat-pc.webp) | 1920 × 1080 | defeat / desktop | HTML/CSS + Chromium | 2026-11-22 |
| [defeat-phone.webp](defeat-phone.webp) | 1170 × 2532 | defeat / portrait | HTML/CSS + Chromium | 2026-11-22 |
| [pause-pc.webp](pause-pc.webp) | 1920 × 1080 | pause / desktop | HTML/CSS + Chromium | 2026-11-22 |
| [pause-phone.webp](pause-phone.webp) | 1170 × 2532 | pause / portrait | HTML/CSS + Chromium | 2026-11-22 |
| [results-pc.webp](results-pc.webp) | 1920 × 1080 | results / desktop | HTML/CSS + Chromium | 2026-11-22 |
| [results-phone.webp](results-phone.webp) | 1170 × 2532 | results / portrait | HTML/CSS + Chromium | 2026-11-22 |
| [shop-pc.webp](shop-pc.webp) | 1920 × 1080 | shop / desktop | HTML/CSS + Chromium | 2026-11-22 |
| [shop-phone.webp](shop-phone.webp) | 1170 × 2532 | shop / portrait | HTML/CSS + Chromium | 2026-11-22 |

## Shared design prompt

- Modern premium sci-fi military UI, clean and professional, in the spirit of a top console game menu: glass panels on deep-navy space, thin cyan (#5FE6FF) edge lines, a small corner bracket detail, a gradient accent rail (cyan to violet to magenta) at the panel top, and strong typography (a condensed bold display font for titles and a clean sans for body text).
- Primary button: a warm plasma gradient (gold #FFD76B, then orange #FF9A3C, then coral #FF5E7A) with dark text and a slightly chamfered (cut) corner shape. Secondary button: dark navy glass with a thin cyan outline and white uppercase text. Text-link buttons for minor actions.
- Danger tone (defeat): a coral/red accent instead of cyan. Victory tone: a gold accent.
- Flat, readable and high contrast. No photo textures, no heavy noise, no fake 3D chrome on the text.
- Must be buildable in CSS: rectangles, rounded or chamfered corners, gradients, lines, glows. Avoid ornate shapes that need images.
- Accessibility: buttons at least 44 px tall on phone, body text at least 14 px and small labels at least 11 px at phone scale; nothing important near the screen edges.

## Screen prompts

### pause

pause: eyebrow "UPLINK ON HOLD", title "Take a breath.", subtitle "Ready when you are.". Buttons: [RESUME OPERATION →] primary, [RESTART THIS OPERATION] secondary, [RETURN TO COMMAND] secondary. Below: a "Controls +" fold, a language toggle "English | Tiếng Việt", and settings rows: SOUND [ON], AIM [ASSIST], GRAPHICS [HIGH DETAIL] with "Low detail: simpler models · fewer effects · 30 FPS cap".

### defeat

defeat: eyebrow "OPERATION INTERRUPTED", title "We go again.", a tip box "Kestrel is disabled. Use hard cover, keep your front toward incoming fire, and activate your shield before crossing a firing lane.". Stats: TIME 1:42 · TANKS 3 · SOLDIERS 7 · HOSTILES 6. Buttons: [REVIVE AT CHECKPOINT →] primary with the note "Full hull and a short shield.", [RETRY FIRST LIGHT →] secondary, [SHOP · UPGRADES & WEAPONS →] secondary, then "Return to command" as a text link, and the footnote "Your purchased upgrades and unlocked operations are safe."

### results

results: eyebrow "STAGE 01 · LEVEL 1 COMPLETE", title "Area clear.", 3 stars (2 lit), a stats row (TIME 2:15, HULL 64%, KILLS 12), rewards "+340 CR", 3 medals (Speed, Survivor, Sharpshooter; 1 earned). Buttons: [NEXT LEVEL →] primary, [SHOP] secondary, [RETURN TO COMMAND] text link.

### battle-hud

battle HUD over a light-green top-down battlefield (keep the battlefield simple and blurred): top-left a mission card ("STAGE 01 · LEVEL 1/3 · EASY", "First Light", "0 / 2 vehicles · 3 waiting ahead") and under it a RADIO COMMS CARD with a round speaker portrait slot (draw a placeholder circle with the letter M), "MARA" and the text "Flank the heavies. Aim for their rear armor."; top-centre a stage title band "STAGE 1 / 16 · LEVEL 1 / 3", "FIRST LIGHT", "Clear the outer patrol"; top-right PAUSE and a minimap; bottom-left HULL 864/1440 with a bar and a weapon card "120 MM CANNON · READY"; bottom-right ability buttons FIRE, STRIKE 2, DROP 2, SHIELD, AUTO 0 (phone: two thumb sticks and big round ability buttons).

### shop

shop: title "Field shop", credits "1,250 CREDITS" with a coin, tabs Weapons | Tank | Supplies | Skins (Weapons active), item cards (owned "120 mm cannon · LEVEL 3 / 20" with an upgrade price, locked "Pulse laser · 360" with a buy price, a maxed "MAX" chip), and a [DONE →] button.

### components

component sheet (PC only, 1920x1080): buttons (primary, secondary and text link) each in normal / hover / pressed / disabled / keyboard-focus states; a panel frame (normal / danger / victory); option chips (normal / selected); a toggle pill (ON / OFF); tabs; a text field; a dropdown; a price chip (buy / upgrade / can't afford / MAX); a radio comms card; and the colour swatches with HEX values and font names labelled.

## Artwork and rendering

Menu concepts use the provided landscape B and wordmark from the repository’s origin/main Git tree. UI text, controls and diagrams were typeset in HTML/CSS and exported with Playwright Chromium. The manual verification used decoded PNG dimensions, viewport bounds and a visual contact sheet. The illustrative cannon upgrade price is 135 credits. Survivor is the earned medal in the results example.

Battlefield artwork prompt for OpenAI imagegen:

Generate just the battlefield background plate for a Steel Front game UI mockup, full bleed, 16:9. Elevated overhead orthographic view of a light sage-green low-poly miniature battlefield. The little chunky royal blue and golden yellow hero tank sits slightly below dead center, diagonal dirt path, sparse cleanly beveled concrete cover, a few chunky blocky green pines in groves, two tiny gunmetal enemies far away. Pleasant warm daylight shadows. A simple legible game-level screenshot, no textures or noise. No interface, no marks, no letters, no logos, no text, no overlays. Keep center open and environment visually calm.

## Visual revision · 2026-11-22

Additional direction for all twelve files: “Make a little more visual beautiful and look like sci-fi.” The revised HTML/CSS and Chromium renders use the same artwork, dimensions and content prompts listed above. The shop uses three original equipment diagrams, with buy and upgrade captions. The fractured shield and gold crest distinguish defeat from completion. Radio waveforms, minimap terrain and ability pictograms carry the visual language into play. In phone portrait, hull and ammunition sit between the thumb sticks to keep the tank visible. Hover, pressed and focus are visual reference states on the component sheet. Vietnamese expansion and touch interaction require testing in the eventual implementation.
