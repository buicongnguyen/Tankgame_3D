/** Aim setting: Manual (exact), Assist (a pointer or stick near a visible enemy settles on it), Auto (with no aim
 *  input the turret picks the nearest visible enemy). Firing is always a deliberate press. The choice is a device
 *  setting, kept outside the save so it follows the player across profiles and training. */
export type AimMode = 'manual' | 'assist' | 'auto';
const KEY = 'steel-front-aim-mode';
export const AIM_LABEL: Record<AimMode, string> = { manual: 'MANUAL', assist: 'ASSIST', auto: 'AUTO' };
export const AIM_HELP: Record<AimMode, string> = {
  manual: 'Manual: the turret goes exactly where you point.',
  assist: 'Assist: pointing near an enemy settles on it.',
  auto: 'Auto: with no aim input the turret picks the nearest enemy.',
};
/** Scripted runs (?e2e) keep exact aim unless a test sets `g.aimMode`. */
export function loadAimMode(): AimMode {
  try {
    if (new URLSearchParams(location.search).has('e2e')) return 'manual';
    const v = localStorage.getItem(KEY);
    if (v === 'manual' || v === 'assist' || v === 'auto') return v;
  } catch { /* storage can be blocked */ }
  return 'assist';
}
export function storeAimMode(mode: AimMode) { try { localStorage.setItem(KEY, mode); } catch { /* ignore */ } }
export const nextAimMode = (mode: AimMode): AimMode => mode === 'manual' ? 'assist' : mode === 'assist' ? 'auto' : 'manual';
/** How close, in radians, a mouse pointer or a stick must point to a visible enemy to settle on it. */
export const ASSIST_ANGLE = { stick: .21, mouse: .12 } as const;
/** Auto picks within this many metres. */
export const AUTO_RANGE = 36;
/** Seconds the mouse must rest before Auto takes over the aim. */
export const MOUSE_IDLE = 1.5;
