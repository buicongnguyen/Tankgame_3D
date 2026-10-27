# Steel Front: Last Signal — CrazyGames and Android launch plan

Prepared: 2026-09-11  
Repository: `C:\Users\n\source\repos\Tank_game_3D`  
Repository snapshot reviewed: `b482d96`, with existing uncommitted work  
Web game: https://buicongnguyen.github.io/Tankgame_3D/  
GitHub: https://github.com/buicongnguyen/Tankgame_3D

## 1. Decision and intended outcome

Launch the existing Three.js game on **CrazyGames** to evaluate browser-game demand, and prepare the existing **Capacitor Android app** for Google Play. Maintain one shared gameplay codebase and separate platform integrations.

Keep the current GitHub Pages edition free and ad-free initially. Use the existing Facebook audience for voluntary playtesting and feedback. Positive comments are an encouraging early signal reported by the developer; player counts, repeat play, and earnings have not yet been measured or verified.

First success means a stable game with returning players and an approved monetization channel. Revenue is a later measured outcome, not a guaranteed result of uploading.

Default commercial choices:

- CrazyGames: pursue the ordinary non-exclusive route initially, so the existing Pages game can remain playable. Review the offered agreement before accepting any exclusivity incentive.
- Android: free download; introduce optional rewarded ads after the core app is stable.
- Initial paid advertising budget: **$0**. Promote through gameplay clips and the existing community first.
- First release scope: existing campaign and assets, reliability, onboarding, platform integration, and store materials. Defer new campaigns, multiplayer, and real-money purchases.

This document is a plan only. No game changes, builds, uploads, advertising campaigns, or account registrations were performed while writing it.

## 2. What already exists

These findings come from local repository files; they are not claims that the deployed website or APK was tested during this review.

| Area | Observed state | Remaining work |
| --- | --- | --- |
| Game | Three.js + TypeScript + Vite; README describes 16 stages / 48 levels, a shop and skins | Validate onboarding, progression and phone performance |
| Assets | Blender exports bundled in `public/`; Detailed and Low detail modes | Measure actual launch payload and runtime performance |
| Browser release | GitHub Pages URL documented; relative Vite base configured | Preserve existing URL, controls and saves |
| Android wrapper | Capacitor 8 dependencies and `android/` already exist | Reuse and validate; do not recreate the wrapper |
| Android identity | `com.tankgame.steelfront3d`; display name `Steel Front 3D` | Confirm branding against `Steel Front: Last Signal` before public release |
| Android SDK | Minimum 24; compile and target 36 | Verify dependencies and release build compatibility |
| Android CI | `.github/workflows/android-apk.yml` builds a debug APK | Add a verified signed AAB release process |
| Release signing | No signing configuration in the inspected `android/app/build.gradle` | Configure upload signing and Play App Signing |
| Save storage | `src/three/game.ts` reads/writes localStorage | Preserve schema; plan platform storage and migration |
| Lifecycle | Input code already handles document visibility changes | Verify complete game/audio pause and native background behavior |
| Checks | Build, asset checks and Playwright scripts exist | Run them against each release candidate |
| Setup documentation | `docs/ANDROID_LOCAL_SETUP.md` still contains 2D/Phaser names and old package/artifact examples | Update to the actual 3D project and current workflow |

Existing changes observed: `tests/extreme-bosses.spec.ts` and `.release-checks/`. Preserve and review these with the developer before creating a release baseline; do not overwrite or revert them.

## 3. Suggested schedule and responsibilities

These are planning estimates for focused work, not platform approval promises. Android work can proceed while CrazyGames evaluates the browser build.

| Phase | Suggested window | Engineering work | Developer participation | Exit condition |
| --- | --- | --- | --- | --- |
| A. Baseline | Days 1–3 | Audit, run checks, build APK, record issues | Confirm branding; choose test phones | Reproducible web and Android builds |
| B. First-player experience | Days 3–7 | Fix onboarding and phone blockers | Invite existing players; gather structured feedback | New players can start and complete the first mission |
| C. CrazyGames Basic Launch | Submit after B; allow platform review and evaluation | Prepare web ZIP and QA evidence | Create account; review terms; submit | Platform returns measured results and next steps |
| D. Android preparation | Weeks 2–3, alongside C | Signing, lifecycle, listing assets, test builds | Play account verification; recruit testers | Internal build accepted and ready for closed testing |
| E. Monetization and release | Week 3 onward, conditional | Platform-specific ads and focused tests | Complete required testing and review submissions | CrazyGames Full Launch and/or approved Play production release |
| F. Improvement | First 30 days after each launch | Review errors, retention and revenue weekly | Gather feedback and post gameplay updates | Evidence-based decision to improve, expand or promote |

CrazyGames currently describes Basic Launch as a 7–21 day evaluation; it is not a paid release. Full Launch depends on performance and further integration/review. [Source](https://docs.crazygames.com/)

For applicable personal Play accounts created after November 13, 2023, plan for at least 12 testers opted in continuously for 14 days before applying for production access. Recruit 15–20 willing testers as a buffer; they should actually play and provide feedback. Approval can require more testing. [Source](https://support.google.com/googleplay/android-developer/answer/14151465)

## 4. Phase A — establish a release baseline

- [ ] Record the intended release commit and review existing uncommitted changes.
- [ ] Confirm the public title; retain the existing Android application ID unless there is a deliberate reason to change it before first release.
- [ ] Verify the installed Node, Java and Android SDK versions against the project's dependencies. Existing setup documentation is a starting point, not proof of the current machine state.
- [ ] Run the existing checks and record results, commands and commit in a release checklist.
- [ ] Build and install the existing debug APK on a physical Android phone.
- [ ] Correct the outdated Android setup document and artifact/package examples.

Existing PowerShell commands, from the repository root:

```powershell
npm ci
npm run build
npm run test:assets
npx playwright install chromium webkit
npm test
npm run android:sync
Push-Location android
.\gradlew.bat assembleDebug
Pop-Location
```

Expected local APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Existing CI artifact: `steel-front-3d-debug-apk`. These commands are instructions for the implementation phase and were not run for this document.

Acceptance: web and debug APK build reproducibly; automated failures are resolved; no known blocker prevents starting, finishing, saving or resuming a mission.

## 5. Phase B — turn Facebook feedback into useful evidence

Keep the existing Facebook play link working. Ask current players to try the first three levels, then report:

1. Phone model, browser, graphics setting and approximate session length.
2. Whether driving, aiming, firing and the first objective were clear.
3. The first confusing or frustrating moment.
4. Whether the game slowed down or the phone became unusually hot.
5. Whether they would return tomorrow, and what would make them return.

Track feedback in a small issue table: issue, affected device, reproduction steps, severity, fix, retest result. Positive comments are not a substitute for observing where players stop.

Test both a lower-powered and a mid-range Android phone. Include simultaneous touch controls, safe areas, sound after interruptions, Back navigation, graphics switching, offline Android play, reloads and app restarts. Run a 20-minute session and sample demanding scenes, including multiple bosses and environmental hazards.

Suggested internal quality target: sustained playable performance around 30 FPS or better in Low detail on the selected minimum test phone, with no repeated long stalls or progress loss. This is a project target, not a CrazyGames acceptance benchmark. Record actual devices and measurements.

Saves are currently local. GitHub Pages, CrazyGames and the Android app use different storage contexts: progress will not automatically follow a player between them. Explain this to testers; defer cross-platform accounts and cloud synchronization.

## 6. Phase C — CrazyGames submission and Full Launch

### Basic Launch

- [ ] Create the developer account and confirm payout availability and the actual offered terms.
- [ ] Keep the ordinary non-exclusive distribution choice initially. The optional two-month exclusivity incentive would need a separate decision about the existing playable Pages edition; do not assume free hosting is exempt. [Terms](https://files.crazygames.com/documents/developer_terms_20250818.pdf)
- [ ] Prepare a production ZIP with `index.html` at its root and all required runtime assets. Exclude source art, tests, `node_modules`, secrets and Android files.
- [ ] Decide whether to exclude `legacy.html` and its 2D assets from the portal artifact; preserve the existing Pages edition separately.
- [ ] Check the current file limits, initial download size, iframe behavior, browser support, mobile layout and content requirements in the portal QA tool. [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- [ ] Prepare title, short description, controls, genre tags, screenshots, cover art and a short gameplay trailer.
- [ ] Review the tank-combat content against the platform's current content guidance; describe it accurately and do not assume suitability for children.
- [ ] Submit the Basic build and record the build identifier.

Basic Launch has no monetization. Avoid dead ad buttons and dependencies on an ad response. Follow the platform's measured engagement results and feedback before doing the full monetization integration.

### If invited to Full Launch

- [ ] Implement the current HTML5 SDK and all applicable Full Implementation requirements, including gameplay/loading lifecycle and required account/storage behavior.
- [ ] Add ads through the CrazyGames SDK only; do not bundle AdMob or unrelated web ads into this build.
- [ ] Test preview and production environments, ad failures, slow responses, muted audio, pause/resume and saved progress.
- [ ] Complete Full QA and obtain release approval before projecting ad income.

If not selected, use the reported reasons to improve the first-player experience and performance. Continue Android testing independently. Do not treat a rejected Basic build as a reason to buy traffic immediately.

## 7. Phase D — Android and Google Play

- [ ] Reuse `capacitor.config.ts`, `android/` and existing npm scripts.
- [ ] Validate local asset loading, offline core gameplay, app suspension, screen locking, audio interruption and Back behavior.
- [ ] Choose and test landscape behavior and safe-area layout; retain the existing mobile browser experience.
- [ ] Create/verify the Play Console account and register the app. Budget the current US$25 one-time registration fee. [Account setup](https://support.google.com/googleplay/android-developer/answer/6112435)
- [ ] Configure release upload signing, keep the key/password out of Git, and keep a recoverable private backup. Enroll in Play App Signing.
- [ ] Set release versionName and a monotonically increasing versionCode; the inspected project currently uses versionCode 1 / versionName 1.0.
- [ ] Produce a signed release AAB using `bundleRelease` after signing is configured. A successful debug APK does not prove the release artifact is ready.
- [ ] Verify the target API at submission time. The project already targets 36, matching the currently published mobile submission requirement. [Target API policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [ ] Prepare icon, feature graphic, screenshots, store description, support contact, privacy policy, content rating, audience selection, Data safety and ads declaration. Describe SDK data practices accurately. [Review checklist](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [ ] Test installation through Play internal testing, then run the required closed test where applicable. Test upgrading an existing installed build and retaining progress.
- [ ] Review automated Play reports and physical-device findings, fix blockers, and apply for production access/release.

Keep debug APK distribution separate from the production process. Do not use an `android-v*` tag as a substitute for a Play release: the existing workflow publishes debug prerelease APKs. Add a dedicated verified release workflow only when signing and release ownership are configured.

## 8. Phase E — ads that fit this game

Use one shared platform interface with separate implementations: `web` (no ads), `crazygames`, and `android`. Select the build target explicitly. Keep provider-specific imports out of other artifacts and use a no-op fallback during ordinary web development.

Proposed first ad experience:

| Placement | First-release choice | Behavior |
| --- | --- | --- |
| After a first-time mission completion | Optional rewarded ad | Offer a clearly stated extra supply-credit bonus, initially 25% of the already-earned first-clear total, rounded down |
| Between missions | Later experiment only | Consider occasional interstitials after rewarded ads and retention are validated |
| During tank combat | No ads | Preserve aiming, movement and mission flow |
| Banner over controls/minimap | No banners | Preserve usable screen space |
| GitHub Pages edition | No ads initially | Keep the existing free community build |

The 25% bonus is a proposed balancing decision, not an existing mechanic or proven optimum. Keep ordinary rewards, free retries and the full campaign available without watching ads. Replays remain ineligible for additional completion credits.

Reward correctness is critical because the game saves completion before displaying results:

- [ ] Give each eligible first-clear reward a persisted receipt/state.
- [ ] Grant the ad bonus only after the provider's verified earned/completed callback, exactly once.
- [ ] Handle double taps, duplicate callbacks, cancellation, no-fill, errors and reloads without duplicate credits or a blocked Continue button.
- [ ] Preserve base mission rewards regardless of ad outcome.
- [ ] Prevent overlapping ad requests. Pause gameplay/input and handle audio while ads display; restore the prior state safely.
- [ ] Do not show an unusable reward button in Basic Launch, offline mode or an unsupported environment.

CrazyGames integration must obey its placement and reward rules. [Ad requirements](https://docs.crazygames.com/requirements/ads/)

For Android, choose a maintained Capacitor-compatible AdMob integration after checking version compatibility. Configure test ad IDs during development, AdMob app/ad units, applicable consent flows and privacy options, and readiness verification before live ads. Use Google's UMP guidance and the SDK's ad-request eligibility rather than assuming every player has consented. [Rewarded ads](https://developers.google.com/admob/android/rewarded), [Consent integration](https://developers.google.com/admob/android/privacy)

## 9. Measurement and marketing

Use CrazyGames reporting for its build. For Android, choose a minimal analytics setup and document data collection before enabling it. Keep the initial Pages edition free of newly added tracking unless separately decided.

Track: successful loading, first mission start/completion, session length, next-day/7-day return rates, crashes, ad requests/fills/completions, unique reward grants and actual publisher revenue. Include build version and platform. Avoid collecting unnecessary personal information. Session length can improve because players are engaged or worsen because they are stuck; interpret it with completion and feedback.

Weekly scorecard:

| Metric | Baseline | Latest | Action |
| --- | --- | --- | --- |
| Players reaching first gameplay | To measure | | Fix loading/onboarding if weak |
| First mission completion | To measure | | Review controls and difficulty |
| Next-day / 7-day return rate | To measure | | Compare equivalent cohorts |
| Crashes / progress-loss reports | To measure | | Fix before increasing traffic |
| Net publisher ad revenue per active user | To measure | | Evaluate actual economics |
| Ad complaints / exits after ads | To measure | | Reduce or remove harmful placements |

Start promotion with three short clips: satisfying tank combat, a boss encounter, and a mobile-control demonstration. Share progress with the existing Facebook audience and relevant communities where promotion is allowed. Ask for specific feedback and link to the appropriate playable edition. Draft posts and clips first; the developer chooses when and where to publish. Do not send messages or post on the developer's behalf as part of this planning task.

Do not purchase advertising until retention and revenue have been observed across multiple cohorts. A later small campaign needs an explicit spending cap and a stop rule. Estimated net lifetime revenue per acquired player must exceed acquisition cost with room for uncertainty and operating costs. A Google Ads campaign does not guarantee profit. [App campaigns](https://support.google.com/google-ads/answer/6247380?hl=en)

## 10. Release gates and immediate next task

Before either monetized release:

- [ ] Gameplay, assets and existing browser tests pass on the release commit.
- [ ] Physical-phone results and known limitations are recorded.
- [ ] Existing saves survive relevant updates; no cross-platform save transfer is promised.
- [ ] Ad success, failure and duplicate-callback tests pass with no duplicate rewards.
- [ ] Each artifact includes only its intended platform SDK and configuration.
- [ ] Privacy, support, account and payout information are complete.
- [ ] A previous stable artifact and a documented recovery process are available. Android fixes use a higher versionCode.
- [ ] Platform review/testing requirements are satisfied; no approval status is inferred from a local build.

**Immediate next task:** execute Phase A, produce a tested debug APK and a baseline issue list, then prepare the CrazyGames Basic Launch ZIP. Recruit willing Android testers from the existing audience while the browser submission is being evaluated.

Implementation handoff prompt:

> Follow this plan starting with Phase A in Tank_game_3D. Preserve existing uncommitted work and the GitHub Pages release. Reuse the existing Capacitor Android project. Run the existing checks, verify a debug APK build, correct stale Android setup instructions, and report concrete results and blockers. Do not add live ads, upload a release, publish posts, accept commercial terms or spend money during this first implementation phase.
