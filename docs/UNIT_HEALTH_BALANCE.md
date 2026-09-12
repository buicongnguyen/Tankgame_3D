# Enemy durability balance

## Problem and scope

Ordinary enemy tanks died too easily. A raider had 65 HP, compared with a rocketeer's 55 HP; a single unupgraded cannon rear hit deals 66 damage. A jeep also had 55 HP. Regular enemy health stayed fixed throughout all 48 campaign levels despite permanent player weapon upgrades.

Strengthen regular armor, separate jeeps from infantry, and retain the usefulness of flanking and anti-tank weapons. Preserve Normal/Hard/Crazy player health, difficulty population multipliers, enemy firepower, boss attack cycles, recovery and loot limits.

## Health targets

| Unit | Previous HP | Opening level HP | Final campaign level HP |
| --- | ---: | ---: | ---: |
| Rifleman | 35 | 35 | 35 |
| Rocketeer | 55 | 55 | 55 |
| Scout jeep | 55 | 75 | 75 |
| Raider tank | 65 | 110 | 160 |
| Sentry tank | 90 | 150 | 220 |
| Heavy tank | 160 | 240 | 355 |
| Bosses | 680–1,200 | 680–1,200 | 680–1,200 |

Bosses retain their individual health: Sky Wraith 680, Prism Reaper 780, Rail Titan 800, Tempest Carrier 850, Rift Stalker 920, Iron Vanguard 1,000, Iron Sovereign 1,050, Siege Marshal 1,100, Atlas Launcher 1,200. Their protected phase already multiplies incoming damage by 0.65, and exposed cores by 1.75, in addition to directional armor. Increasing them alongside ordinary tanks would unnecessarily prolong their fights.

Only raiders, sentries and heavies gain 1% health per campaign level after the first: `progress = stageIndex * 3 + sublevelIndex`, both zero-based. Round the resulting HP to the nearest 5. The current final mission uses +47%; future additions are capped at +50%. Progress is independent of difficulty, equipment and purchases. Existing upgrades continue to make the player stronger. Infantry and jeeps remain quick to defeat throughout the campaign.

## Combat targets

The unupgraded cannon deals 44 damage. Tank front armor takes 65%, sides 100%, and rear armor 150%. Infantry and jeeps take normal damage from every direction.

| Unit | Previous cannon hits: front / side / rear | Opening level: front / side / rear |
| --- | --- | --- |
| Rifleman | 1 / 1 / 1 | 1 / 1 / 1 |
| Rocketeer | 2 / 2 / 2 | 2 / 2 / 2 |
| Scout jeep | 2 / 2 / 2 | 2 / 2 / 2 |
| Raider | 3 / 2 / 1 | 4 / 3 / 2 |
| Sentry | 4 / 3 / 2 | 6 / 4 / 3 |
| Heavy | 6 / 4 / 3 | 9 / 6 / 4 |

A jeep still takes two cannon hits, but requires six base autocannon rounds to destroy instead of five. Basic cannon frontal time from first hit to destruction is approximately 2.55 seconds for a raider and 6.8 seconds for a heavy, assuming each shot hits. Flanking a heavy reduces that to 2.55 seconds. Heavy tanks do not appear in the opening backgrounds.

Siege and micro missiles apply both a direct hit and falloff splash. Runtime tests fire actual projectiles rather than comparing only the displayed base damage. These are frontal shots against a stationary heavy, except arc rockets which land directly on its center:

| Loadout / encounter | Cannon | Siege | Laser | Arc | Micro missile |
| --- | ---: | ---: | ---: | ---: | ---: |
| Base weapons / base heavy | 9 | 2 | 3 | 1 | 4 |
| Base weapons / final-level heavy | 13 | 3 | 4 | 2 | 6 |
| Power 3 + weapon 3 / final-level heavy | 7 | 2 | 2 | 1 | 4 |

All values are shots to destroy; misses, falloff and movement change real fights. The upgraded example uses the Classic skin and no temporary damage boost. Laser piercing, finite special ammunition, area damage, concrete damage and armor rules remain unchanged.

## Implementation and review plan

1. Centralize regular enemy HP in `src/three/unit-health.ts` and use it for both current and maximum HP at spawn.
2. Keep player hull at `(240 + 65 * armorUpgrade) * difficultyHealth`; Easy is now 3x (+200%) after the [flamethrower/Easy update](FLAMETHROWER_AND_EASY_MODE.md); the other difficulties are 1x.
3. Verify actual cannon hits by unit and facing, missile/laser effectiveness, boss protected/exposed damage, and campaign progression with real runtime units.
4. Check that enemy HP does not change with difficulty or player purchases, health bars match HP, retries restore health, and defeating a tougher last enemy still reaches the results screen.
5. Run combat and progression regressions, build, then the release verification workflow before publishing.

No save migration or new render assets are required. Health is calculated at mission spawn; existing saves retain all purchases and progress.

## Validation

- Six new health regressions passed: campaign ordering/cap, real cannon hits by unit and facing, actual missile/laser/arc damage, mode and loadout independence, all nine boss cores, and delayed results after the last tougher tank.
- All 72 existing selected combat, infantry, jeep, patrol, wave, progression, difficulty, mobile, weapon and rule tests passed. The exact upgraded-weapon table was also checked again after adding explicit numerical assertions.
- Production TypeScript/Vite build passed. All 33 Blender model pairs passed the existing asset checks; this update adds no geometry, textures or per-frame work.
- Code and logic review confirmed current/max HP use the same spawn value, health bars normalize against that maximum, retries reconstruct healthy units, and Normal/Hard/Crazy player hull, save data, loot probabilities, enemy firepower, concrete damage and boss armor remain unchanged.
- The GitHub Pages workflow runs the complete browser suite before its build and deployment jobs.
