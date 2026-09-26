# Profile save safety

The profile picker formerly wrote the active campaign and the parked profiles to separate keys. A quota failure between those writes could discard the previous campaign. A second tab could also overwrite a newer profile book with its cached copy.

## Storage transaction

- The canonical record is `steel-front-3d-state-v2`: the active campaign at its root, plus `profileVersion: 2`, `profileRevision` and `profileBook` (active index, all three names and parked campaigns).
- A single localStorage write commits the entire record. Switching, resetting and renaming use copies, and adopt them in memory only after that write succeeds.
- Writes queue within a tab. An exclusive Web Lock covers reading, comparing the last observed record and writing across tabs. A stale tab pauses and offers **Reload saved game**; it cannot resume saving from its old copy.
- Ordinary saves cannot queue old profile data while a profile transaction is pending. Training and skirmish saves continue to preserve the real campaign.
- Existing `steel-front-3d-v1`, `steel-front-3d-profiles-v1` and pilot-name data migrate together. The old campaign key is only a best-effort compatibility mirror after migration. Cached older builds cannot overwrite the canonical record.
- Full or blocked storage shows a persistent warning. Profile changes are cancelled, leaving the previous record intact; after freeing storage, retry the action. Ordinary gameplay can retain unsaved progress in the current tab.
- Web Locks require a supported browser and a secure context (HTTPS or localhost). Without locks the game reports that saving is unavailable instead of performing an unsafe multi-tab write.

## Regression coverage

`tests/profiles.spec.ts` covers existing profiles, names, reset confirmation, reloads, mobile layouts, legacy migration, simultaneous writers, stale tabs, real browser quota exhaustion before/after migration, failed mutations, old-build writes, queued saves, leaderboard names, late saves during a switch, compatibility-mirror failure and unavailable locks. Campaign, training, skirmish, shop, graphics and support-ammunition checks cover callers affected by asynchronous saving.

Browser guarantees: [Web Storage setItem](https://html.spec.whatwg.org/multipage/webstorage.html#dom-storage-setitem), [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
