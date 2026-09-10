# Weapon visibility and artillery review

The public description named three weapons, but new saves only had the cannon and the old weapon button silently cycled available guns. That made the other weapons difficult to discover. They were implemented, but the presentation did not explain progression clearly enough.

## Changes

- Weapon panel opens a three-choice armory. Each choice shows its role, selection and unlock requirement.
- Cannon: available immediately. Autocannon: clear First Light (operation 1). Rockets: clear Homeward (operation 3). Supply caches still grant temporary rocket access within the mission.
- Distinct projectile colors: warm cannon shells, short cyan autocannon tracers, orange rockets with exhaust. The three existing weapon mechanics remain heavy single shot, rapid fire and splash damage.
- Artillery: five staggered impacts in a wider pattern, each with a 9 m blast radius. Nominal combined footprint is 34 m wide by 28 m deep, clipped by target placement near arena boundaries. Targeting rings now match the damage radius, instead of showing a smaller area.
- Artillery call range increased from 34 m to 52 m; touch aiming reaches 28 m ahead instead of 18 m. Cooldown remains 28 seconds. Each impact deals 85 base damage instead of 110 to balance the extra shells. Friendly units can still be damaged.
- The chooser has a compact mobile layout, an accessible label and an introductory hint. Selection preserves normal keyboard hotkeys.

## Validation

Added regression coverage for fresh-save locks, earned unlocks, mobile weapon selection, distinct weapon characteristics, accurate danger radius, outer-flank damage, safety outside all impact circles and maximum call range. Existing movement, mobile layout, campaign and environment tests remain enabled.

No additional weapon types were added in this revision: it makes the existing three weapons visible and improves artillery coverage. The Facebook description should continue to say three progressively unlocked weapons.
