# Boss attack balance

Light attacks create pressure through cadence; heavy attacks control a larger, clearly warned area. Individual hit damage is unchanged, and each boss retains a recovery window.

| Boss | Change | Dodge / counterattack window |
| --- | --- | --- |
| Iron Sovereign | Three 33-damage shells every ~3.45 seconds after its opening volley, previously ~5.6 seconds. | 0.75-second locked warning, then 1.6 seconds of exposed core. |
| Rift Stalker | Three 33-damage shells every ~4.8 seconds on open ground, previously ~6.9 seconds. | 0.9-second warning; rests for 2.8 seconds with its core exposed. Climbing can delay its next attack. |
| Prism Reaper | 16-damage pulses every 0.14 seconds, previously 0.2 seconds, during its one-second burst. | Heading locks during the 1.5-second warning. Solid cover blocks it; 2.8-second recovery. |
| Rail Titan | 75-damage rail shot widens from 0.4 to 1.6 meters. Warning width, rendered beam and collision radius agree. | Keeps its 1.4-second warning and 2.4-second recovery. Solid cover and a sidestep protect the player. |
| Tempest Carrier | Three 70-damage blasts grow from 4.5 to 6.5 meters in radius (about twice the area per blast). Side targets spread from 5 to 8 meters. | Warning grows from 1.6 to 1.8 seconds. Targets lock and rings show the damage radius. |
| Sky Wraith | Same wider rocket salvo as Tempest. | Warning grows from 1.8 to 2 seconds. It still lands behind cover and exposes its core for 4 seconds. |

Times exclude frame rounding and the staggered opening delay. Below half hull, ground bosses reduce their tracking pause to 55%; warning and recovery durations remain fixed. Directional armor and shields still affect damage. Overlapping rocket circles retain the existing individual-explosion damage rules.

## Review and validation

- Exercise real boss state transitions, projectile creation and damage, including targets just inside and outside the enlarged areas.
- Check warnings do not deal damage, targets stay locked, cover blocks rails and lasers, and weak cores remain usable.
- Check laser cadence at 30 and 60 fps, expiring beams, death/reset cleanup and existing boss regressions.
- Reuse existing models, three rocket markers and the capped particle system. Light pulses use small impacts, avoiding repeated heavy explosion particles.
- Verify the desktop and mobile rendering, including Low detail, before release.

Validation completed: 27 focused combat/laser regressions and 2 desktop/mobile warning tests passed. Detailed desktop and Low mobile screenshots were inspected; the warning circles remain readable and preserve the same damage radius through graphics changes. TypeScript/Vite production build and whitespace checks passed. The Pages workflow runs the complete suite before publishing.
