# Fun pass — November 2026

Baseline: `e06799e` (aim setting, kite window, calm opening, ambush). Branch: `fun-pass`.

Player feedback: "too difficult" and "what is the fun?". The aim of this pass is that a new player on Easy or Normal (a) never feels stuck, (b) is told the clever play at the moment it matters, and (c) gets a big, clear payoff for winning. Nothing here makes any difficulty harder. Hard and Crazy are unchanged.

## The fun moments this pass makes obvious

| Moment | How the game shows it now | What this pass adds |
|---|---|---|
| Bursting through a fence onto a group that did not see you | Fences and ambush damage exist, but nobody tells the player | A tip the first time the tank is near a fence with sleeping enemies behind it; the AMBUSH tip on the first ambush |
| Picking off tanks they cannot reply to | Kite window exists, invisible | A tip the first time an enemy tank is awake at 26-40 m |
| A big airstrike on a crowd | Strikes are granted from stage 1, but most players never press R | A tip the first time 3 or more awake enemies are within 30 m and a strike is ready |
| Winning | 1.5 s pause, then the debrief | **Finale**: the last kill sets off a big blast, the world slows to 40% speed, and an AREA CLEAR banner shows the credits earned |

## Never stuck

| Problem | Change |
|---|---|
| Death restarts the whole level | **Revive**: when the tank is destroyed, the defeat card offers *Revive at checkpoint* (Easy: 2 per level, Normal: 1). The tank returns with full hull and a 4 s shield at the last safe spot it held (no awake enemy within 35 m, sampled every second). Losing the transport, uplink or rescued tanks still ends the level, because the objective itself failed. A revived run is not entered on the leaderboard. |
| Losing the same level again and again | **Field support**: after 2 defeats in a row on the same level (Easy/Normal), enemy fire does 25% less damage on the next tries, and the radio says so. A win resets it. |
| Low hull with no idea what to do | A tip at 35% hull: "Hull low. Press SHIELD and pull back behind cover." |

## Rules for tips

- Easy and Normal campaign only; never in training, skirmish, Hard or Crazy.
- Each tip shows once per device (stored in browser storage), at most one every 12 s, and never over another radio line.
- Text names the control for the device: keys on PC, buttons on touch.
- Every line has a Vietnamese translation.
- Scripted runs (`?e2e`) turn the helpers (tips, field support) off unless a test sets `g.helpers = true`, so existing exact tests stay exact.

## Work packages

| WP | What | Files |
|----|------|-------|
| F1 | Finale: last-kill blast, slow motion during the finish, AREA CLEAR banner with credits | `fun.ts` (new), hooks in `game.ts`, `finish.css` |
| F2 | Field tips (fence, kite, strike, ambush, low hull) | `fun.ts`, `vi-messages.ts` |
| F3 | Revive at checkpoint | `fun.ts`, defeat card in `game.ts` |
| F4 | Field support after two defeats | `fun.ts`, player damage in `damageUnit` |
| F5 | Tests, README, full suite, deploy, clean up | `tests/fun-pass.spec.ts` |

## Refinement (risks found on review)

- **Revive safety**: if the checkpoint has an awake enemy within 20 m by the time of revive, fall back to the deployment point. The 4 s shield covers the return.
- **Revive and medals**: Swift and Self-reliant still work from the real clock and support use; a revive adds nothing to the timer. The leaderboard skips revived runs so rankings stay fair.
- **Slow motion** touches only what is drawn during the 1.5 s finish (effects, camera); the results and rewards are already settled. Off with reduced motion.
- **Finale on objective wins** (capture, defense hold, escort arrival): the banner still shows, and the blast goes off at the tank's last kill, or not at all if there was none.
- **Merge risk** with the other session's uncommitted `game.ts` edits: logic lives in `fun.ts`, hooks stay one line each.
