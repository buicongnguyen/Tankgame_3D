# Explosives and rockets

## Combat rules

- Existing proximity mines trigger for the player, enemy tanks and infantry. Each detonates once, with 85 base damage in a 4.5 m radius. Armor and distance affect damage; a healthy heavy tank is not guaranteed to die.
- Four red gasoline crates are placed around each battlefield. They have 35 HP and explode for 110 base damage within 7 m when destroyed.
- Explosions damage nearby tanks, soldiers and destructible cover on both sides. Nearby fuel containers can chain-react. Destroyed containers are marked before their blast, preventing repeated detonation.
- Existing fuel drums retain 65 base damage and a 5 m radius.

## Blender artwork

Run Blender in background mode with `--python tools/blender/build_rocket_fuel.py` to rebuild the editable `assets/blender/rocket.blend` and `fuelcrate.blend` sources and their runtime GLB exports.

The rocket has a cylindrical body, pointed nose, warning bands, four stabilizer fins and a metal nozzle. Its Exhaust attachment emits flame and smoke behind the projectile. Siege rockets, enemy rocketeer shots, collectible arc rockets and the missile boss use this model. Arc rockets retain their existing elevated trajectory; the artwork does not introduce rigid-body flight physics.

Gasoline crates contain red cans in a dark protective cage with yellow bands. The full game now loads 19 Blender GLBs. Mesh batching separates incompatible vertex attribute layouts so fins remain visible, and only replaces source geometry when merging succeeds. Shared rocket resources survive projectile removal and mission resets. Smoke uses the existing bounded effects pool.

## Verification

38 browser tests pass, including enemy-triggered mines, gasoline damage to tanks/infantry/cover, bounded chain reactions, rocket fins and rear exhaust, smoke placement, mission cleanup, and desktop/mobile controls. TypeScript production build and all 19 asset checks pass. Mobile coverage uses browser emulation.
