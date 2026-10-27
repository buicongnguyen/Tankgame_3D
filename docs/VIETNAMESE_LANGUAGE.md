# English / Vietnamese

Choose English or Tiếng Việt at the top of the command screen, before starting a mission. Pause also has the selector. English is the default; the choice persists in `steel-front-language-v1`, independently of campaign/profile saves. Unsupported stored values fall back to English. If storage is blocked or full, the choice works for the current session.

Vietnamese covers campaign briefings and objectives (16 stages × 3 levels), training, skirmish setup/results, menus, shops, weapon descriptions, combat messages, HUD, profiles, leaderboard and pickup labels. Character, boss, brand and most skin names retain their proper names. Pilot names are never translated. The legacy 2D game is unchanged.

## Implementation

- `src/three/i18n.ts`: language state, bounded translation cache, source restoration, rendering helpers and selector markup.
- `src/three/locales/vi-ui.ts`: menu and interface phrases.
- `src/three/locales/vi-messages.ts`: tutorial, combat and skirmish phrases.
- `src/three/locales/vi-story.ts`: campaign narrative and manual.
- `src/three/locales/vi-patterns.ts`: dynamic phrases for counts, prices, stats and messages.
- `src/three/language.css`: Vietnamese text spacing and responsive selector layout.

The English copy is the catalog key. Use `setHtml`, `setText` and `setAttribute` at UI rendering boundaries. Whole phrases take precedence over composed text; dynamic patterns are matched from most specific to least specific. Composite HUD fields are translated independently. Missing translations fall back to English. The development-only `translationGaps` set helps audit new copy.

Language changes translate existing text and accessibility labels in place, preserving listeners, focus, inputs and open details. Runtime IDs, keyboard controls, save values and game rules remain language independent. Mark user-authored DOM text `translate="no"`; use `{raw_name}` or other `raw_` placeholders for user data inside dynamic text. Escape untrusted values before interpolating HTML, as usual.

Normal text updates are cached and skip identical DOM writes. There is no DOM observer, periodic translation traversal, translation service or additional font download. Pickup labels redraw into their existing canvas textures when switching language; no new GPU texture is allocated.

## Validation

`npx playwright test tests/language.spec.ts` covers persistence and profile switching, paused combat state, texture reuse, HUD updates, weapon purchases, literal player names, leaderboard filters, campaign coverage, training/results, unavailable storage and 320×568 / 390×844 / 844×390 touch layouts. Use `npm run build` for TypeScript and production bundle validation. Browser emulation checks layout and controls, not physical-device performance.

When changing English copy, update its Vietnamese key and add any new dynamic variants to these checks. Keep labels short enough for portrait and landscape phones.
