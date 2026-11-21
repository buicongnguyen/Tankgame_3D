# AAA pass — November 2026

Baseline: `171b7e7` (live on GitHub Pages). Work branch: `aaa-pass`.

## 1. Evaluation

What is already strong: a clear command screen, tutorial, 16 stages x 3 levels, story scenes, medals, a shop with skins, squad tactics, damage numbers and hit-stop, plank fences, phone and PC layouts that fit.

What stops it feeling AAA, from playing it (PC 1366x768 and phone 844x390, Easy to Hard):

| # | Gap | Evidence |
|---|-----|----------|
| 1 | Aim help exists only on touch. A mouse player gets none, and there is no setting. | `assistAim` runs only when `input.touchAiming`. |
| 2 | No hit-and-run. Enemy tanks fire at 38 m but also advance to 17 m, so the player can never hold a distance. | `game.ts` enemy update: `advance` until `dist>17`, `range=38`. |
| 3 | The first contact is close. The nearest enemy is 36-40 m from the spawn and sight is 44 m, so Easy still opens with a fight. | Probe: nearest enemy 40 m (Easy stage 1), 36 m (Normal). |
| 4 | Surprise attacks are not rewarded. Fences hide the player, but a sneak shot does the same damage as any other. | `damageUnit` has no notion of an unaware target. |
| 5 | The battlefield looks washed out: pale beige ground, low contrast, flat grading, against the "vivid warm colour" art bar. | PC battle screenshots; `HemisphereLight` 1.6 + ACES at exposure 1.0. |
| 6 | The player gets no readable "I did that" feedback for a clever play (flank, ambush, kite). | Medals only pay out at the end. |

## 2. The user's ideas, checked

| Idea | Verdict |
|------|---------|
| Auto-select direction to fire, on by default | Yes, as a three-way setting: Manual / Assist / Auto, default **Assist** (helps without taking control). Auto picks the nearest visible threat when the player gives no aim input. |
| A button to collapse walls | No button. Light walls (fences) are already breakable by ramming; a button adds UI for what driving into a wall already says. |
| Limit bullet range so players hit and run | Limit the **enemy** instead. A shorter player range makes the player weaker; a shorter enemy range makes distance a tool. |
| Spread enemies into isolated groups | Already built (groups, fences, hold-back). This pass adds a calmer first contact. |
| Fewer, weaker enemies on Easy | Already ½ health on Easy; this pass delays first contact instead of cutting the fight. |

## 3. New ideas

1. **Ambush strike**: the first player hit on an enemy that has not noticed the tank does x1.5 damage and shows an AMBUSH tag. It rewards the fence and hold-back design.
2. **Kite window**: on Easy and Normal, enemy tanks stop advancing at about 24 m and fire only inside 32 m (Easy) or 35 m (Normal), so a player who keeps 34-40 m can shoot without being shot. Hard and Crazy are unchanged.
3. **Calm opening**: on Easy and Normal, the group nearest the spawn notices the tank from 15% (Easy) or 8% (Normal) closer.
4. **Colour grade**: warmer sun, a little more saturation in the hemisphere light, slightly stronger exposure; vertex-colour ground left alone.

## 4. Work packages

| WP | What | Files | Test |
|----|------|-------|------|
| 1 | Aim mode setting (Manual/Assist/Auto) in Settings, saved with the profile; mouse and stick assist; Auto picks a target when idle | new `aim-mode.ts`; small hooks in `campaign.ts`, `game.ts` | `tests/aim-mode.spec.ts` |
| 2 | Kite window | new `enemy-range.ts`; two hooks in the enemy update | `tests/kite-window.spec.ts` |
| 3 | Calm opening | `encounters.ts` sight factor | same spec |
| 4 | Ambush strike | `damageUnit` hook, `hit-feedback.ts` tag | `tests/ambush.spec.ts` |
| 5 | Colour grade | dropped, see section 7 | screenshot compare |
| 6 | README, Vietnamese strings, full suite, deploy, clean up | | full suite |

## 5. Refinement (risks found on review)

- **Merge risk**: the main clone has another session's uncommitted edits in `game.ts`, `input.ts`, `results.ts`. Keep my hooks to one line each and put logic in new files.
- **Determinism**: scripted runs and the leaderboard must not drift. Aim mode defaults to Assist, but Assist for mouse only moves the aim point, so tests that fire at fixed points keep exact aim by setting Manual. Ambush and kite apply only when `training` and `skirmish` are off, so tutorial and skirmish stay identical.
- **Leaderboard**: ambush and range changes alter results on Easy and Normal, so bump the rules version.
- **Exact-damage tests**: ambush could break tests that damage sleeping units. The ambush flag is cleared by any prior damage, and tests that need exact numbers wake the unit first. Run the suite to find any.
- **Auto mode on touch**: must not fire by itself. It only chooses direction; firing stays a deliberate press.
- **Colour grade**: judge by screenshots at both sizes, not by numbers. Skip the grade if it hurts night or snow stages.

## 6. Out of scope this pass

New biomes, new weapons, multiplayer, new bosses. These need art time and playtest evidence.

## 7. Result notes

- WP5 (colour grade) was trialled at runtime on four stages: sun x1.2, hemisphere x0.8, exposure 1.08. The change was small because the beige comes from the biome ground colour, not the lights, and stronger values risk night and snow stages. Dropped. A richer ground palette per biome is the real fix and is listed for a later pass.
- The leaderboard rules version is now 4, since Easy and Normal results change.
