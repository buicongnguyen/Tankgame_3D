# Combat balance reference

Snapshot: 20 September 2026, current local Three.js code (including uncommitted changes). Values are not necessarily the deployed website's values. Units: HP, damage points, seconds, and world meters. This document describes the implementation, not proposed balance changes.

## Player weapons — no upgrades, default skin

| Key | Weapon | Price (credits) | Base damage per projectile/burst | Reload | Nominal damage/sec | Ammo per mission | Quartermaster ammo | Blast / range |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| 1 | 120 mm cannon | 0 | 44 | 0.85 | 51.8 | Unlimited | Unlimited | No splash |
| 2 | 30 mm autocannon | 120; also campaign unlock | 13 | 0.19 | 68.4 | Unlimited | Unlimited | No splash |
| 3 | Siege rockets | 180 | 140 direct | 1.6 | 87.5 direct | Unlimited | Unlimited | 6.5 m splash |
| 4 | Pulse laser | 360 | 150 per enemy pierced | 0.6 | 250 | 12 | 15 | Pierces enemies and one concrete barrier |
| 5 | Arc rockets | 420 | 240 explosion | 2.4 | 100 | 6 | 8 | 8 m blast; flies over cover |
| 6 | Multi-barrel machine gun | 280 | 8 per bullet; 16 per two-round volley | 0.28 | 57.1 | Unlimited | Unlimited | Four bullets per volley at weapon level 10 |
| 7 | Micro missiles | 340 | 60 direct | 0.7 | 85.7 direct | Unlimited | Unlimited | 3.5 m splash |
| 8 | Triple arc launcher | 720 | 180 per rocket; 540 if all three blasts overlap | 3.2 | 168.8 combined | 3 volleys (9 rockets) | 4 volleys (12 rockets) | 5.5 m blast per rocket |
| 9 | Flamethrower | 800 | 19.2 direct + burn | 0.12 | 160 direct, near muzzle | 80 bursts | 200 bursts | 12 m, 60° cone; cover blocks flames |

Nominal damage/sec = base damage divided by reload. It excludes armor, travel time, misses, range falloff, upgrades, and burn. Triple Arc assumes all three explosions hit the same target; it is not guaranteed single-target output. Finite weapons cannot sustain this output indefinitely.

### Important damage rules

- Siege and Micro missiles apply direct damage and an additional explosion with **70% of projectile damage** as its center value. These can damage the same target twice. The table's direct DPS excludes this extra splash.
- Arc rockets apply explosion damage, not an additional direct-hit packet. Explosions affect nearby destructible objects and can hurt allies unless the attack explicitly spares them.
- Unit explosion falloff: `damage × (1 − 0.6 × distance / blastRadius)`, inside the radius only, then armor modifiers. Destructible cover receives the explosion damage without this distance falloff.
- Flamethrower direct damage and burn are multiplied by `1 − 0.55 × distance / 12`. At 12 m this is 45% of the close-range value.
- Flame burn: **14.4 damage/sec for 2 seconds** before falloff/modifiers. Repeated hits refresh duration; they do not stack separate burn DPS effects.
- Laser does not destroy concrete. It passes through one concrete barrier and stops at the second.
- Airborne bosses reject ordinary ground damage. Laser/arc attacks can hit them; ordinary weapons can hit the jet during its low return pass.

## Ground enemy health and weapons

| Enemy | Stage 1 / level 1 HP | Stage 16 / level 3 HP | Base outgoing damage | Armor |
| --- | ---: | ---: | --- | --- |
| Rifle soldier | 70 | 136 | 3 per bullet | None |
| Rocket soldier | 110 | 213 | 24 direct; 2.5 m splash | None |
| Scout jeep | 150 | 291 | 3 per bullet | None |
| Raider tank | 220 | 427 | 15 per shell | Directional |
| Sentry tank | 300 | 582 | 15 per shell | Directional |
| Heavy tank | 480 | 931 | 24 per shell | Directional |

All non-boss enemy HP formula (zero-based indices): `round(baseHP × (1 + clamp(stage × 3 + level, 0, 50) × 0.02))`.
Soldiers, jeeps, and tanks all gain 2% of base HP per campaign level, capped at +100%. Difficulty changes enemy counts, not these health values.

## Bosses — after the latest +20% HP change

| Boss | Type | HP | Special attack base damage / behavior |
| --- | --- | ---: | --- |
| Rail Titan | Rail tank | 960 | 75 rail beam |
| Tempest Carrier | Missile carrier | 1,020 | 70 per explosion; 6.5 m radius |
| Iron Sovereign | Walker | 1,260 | Three 33-damage shells |
| Sky Wraith | Helicopter | 816 | 70 per explosion; 6.5 m radius; landing vulnerability |
| Rift Stalker | Spider | 1,104 | Three 33-damage shells; climbs obstacles |
| Prism Reaper | Laser tank | 936 | 16 per laser pulse, 0.14 s pulse interval during burst |
| Iron Vanguard | Four-gun mech | 1,200 | Eight 12-damage rounds, 0.13 s apart |
| Siege Marshal | Missile/gun mech | 1,320 | Two 60-damage explosions; 5.5 m radius; extra 8-damage gun shot every seventh auxiliary round |
| Atlas Launcher | Missile truck | 1,440 | Two 80-damage explosions; 7 m radius |
| Storm Kite | Quadcopter | 1,080 | Three 60-damage explosions; 4.5 m radius |
| Ash Falcon | Jet fighter | 912 | 18-damage ground bursts every 0.3 s during strafe; 2.4 m radius |

All bosses have a light gun: **3 damage per round, 0.32-second interval**, subject to range and line of sight. Special attack damage is not sustained DPS: warnings, movement, firing bursts, and recovery create gaps.

Jet: 2-second fixed-path warning, 24 m/s strafe at 6 m altitude, 8 m/s low return at 1.4 m altitude. Cinderfall finale uses the jet.

### Armor and boss vulnerability

| Hit direction / phase | Incoming damage multiplier |
| --- | ---: |
| Tank front | ×0.65 |
| Tank side | ×1 |
| Tank rear | ×1.5 |
| Boss protected phase | Additional ×0.65 |
| Boss exposed phase | Additional ×1.75 |

These multiply together. A 44-damage cannon shot against a boss deals **18.59 front/protected**, **28.6 side/protected**, **77 side/exposed**, or **115.5 rear/exposed**. Boss HP alone therefore understates durability.

## Mines, explosions, and difficulty

| Source | Base explosion damage | Radius |
| --- | ---: | ---: |
| Land mine | 130 | 4.5 m blast |
| Gasoline crate | 110 | 7 m |
| Fuel barrel | 65 | 5 m |

Mine trigger circle: **2.7 m**. A ground unit triggers on hull contact: `center distance ≤ 2.7 + unit collision radius`. Blast damage still uses center distance and falloff. **Review concern:** a large boss can touch the trigger circle while its center remains outside the 4.5 m blast, setting off a mine without taking its damage.

| Difficulty | Player health multiplier | Enemy count multiplier | Finale boss count |
| --- | ---: | ---: | ---: |
| Easy | ×3 | ×1 | 1 |
| Normal | ×1 | ×1 | 1 |
| Hard | ×1 | ×2 | 2 |
| Crazy | ×1 | ×4 | 4 |

Player base HP: `(240 + armorUpgradeLevel × 65) × difficultyHealthMultiplier`.

## Upgrade impact when judging late-game balance

- Individual weapon damage: +5% per level, capped at level 20 (×2).
- Global power: +20% per level for levels 1–3, then +6% per level through 20 (×2.62 at level 20).
- Combined individual/global damage multiplier can reach **×5.24**, before skin or temporary bonuses.
- Reload upgrades and weapon levels also shorten reload, with weapon-specific minimum intervals.
- Machine gun changes from two to four bullets per volley at weapon level 10, on top of its damage upgrade.
- Quartermaster provides 2.5 times the standard flame capacity (200 vs 80), unlike its roughly +25% benefit to other finite magazines.

## Suggested balance review priorities

1. Compare both early-game and fully upgraded loadouts: non-boss HP grows at most 100%, while weapon damage alone can exceed five times base.
2. Check unlimited siege/micro missiles against finite rockets, including direct-plus-splash damage and friendly-fire risk.
3. Judge flame output against multiple targets, not only one tank; cone damage and refreshed burns reward groups.
4. Test bosses with front armor and exposed rear hits separately; the same cannon shot varies more than sixfold between those conditions.
5. Review Quartermaster's large flame-ammo advantage and the machine gun's level-10 power jump.

## Code sources

- `src/three/armory.ts`: weapon prices, damage, reload, magazines, upgrade formulas.
- `src/three/skins.ts`: skin and ammo modifiers.
- `src/three/unit-health.ts`: ground enemy HP and progression.
- `src/three/bosses.ts`: boss HP, attack state machines, vulnerability.
- `src/three/flamethrower.ts`: cone, falloff, burn.
- `src/three/game.ts`: damage application, projectiles, mines, explosions.
- `src/three/rules.ts`: directional armor.
- `src/three/difficulty.ts`: difficulty multipliers and boss counts.

This is a manual snapshot; update it whenever the underlying balance values change.
