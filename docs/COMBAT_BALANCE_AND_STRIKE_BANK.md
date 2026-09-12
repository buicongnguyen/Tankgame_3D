# Combat balance and Strike bank

## Requested behavior and decisions
- Flamethrower: 600 credits (+25%), 200 trigger bursts each mission; Quartermaster rounds the 25% capacity bonus to 250. Direct damage 24 → 19.2, burn DPS 18 → 14.4; range, arc, armor and upgrades stay consistent.
- Consume one fuel unit per fired burst, regardless of targets, particle count or quality. Refill purchased fuel at mission start. Automatic empty-weapon selection searches the next available advanced slot to the right, then the nearest usable lower slot; preserve the player's saved preference and shot cooldown.
- Escort: all hostiles, including dormant reserves and bosses, must be defeated for early completion. A destroyed player, transport or relay loses before the victory check. Retain the 0.8-second effects delay and one-time stage reward.
- Strike: six guided missiles maximum, 90 damage each (half the previous count and individual damage). Range, targeting, blast radius and warning remain. Auto missiles use their own unchanged 160-damage configuration.
- Grant two Strike calls at the first deployment into each background. Persist unused charges and claimed backgrounds, spending only on an accepted call. Preview, retries, difficulty switches and revisits cannot farm allowances. Historical saves begin with a current-background allowance and keep all purchases/progress.
- Drop stays independent of Strike inventory, with its existing per-mission limit and shared cooldown. A supply crate may clear radio cooldown but never creates a Strike charge.
- Touch HUD: compact mission title + stage/level badge, short objective counter, progress line and short boss state. Full desktop readouts and accessible objective labels remain available.

## Implementation and review
Use the shared finite-ammo firing path for flame fuel, central capacity data, a saved background allowance helper, and the existing failure-before-completion order. Verify save round-trips, reload/retry persistence, one-shot consumption, precise damage, quality/FPS independence, reserved enemies and mobile card bounds. Check desktop, portrait, landscape and WebKit controls. Run build, asset budgets and the complete GitHub Pages verification workflow before publishing.

Local verification: build and Blender asset budgets passed. The focused combat run passed 68 checks; two incorrect test expectations were corrected. The follow-up run passed all 64 checks, including the corrected cases, iPhone WebKit, seven mobile viewport sizes, weapon purchase/selection and every escort route. Portrait and landscape screenshots were inspected. Full campaign CI and deployed smoke checks follow the SSH push.
