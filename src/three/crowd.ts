import type { Game, Unit } from './game';
import type { Point } from './rules';
import { SOFT } from './surprise';

/**
 * Crowd control for campaign Easy and Normal (2026-11-21, owner: "enemies just go to your position and
 * eventually gather a crowd ... difficult to fire to kill them all").
 *
 *  - Attack slots: only a few hostiles press the attack at once. The rest of the awake ones that can see the
 *    tank close in to an outer ring (WAIT_RING), hold fire there, and step in when a slot frees. Fights become a steady line of
 *    duels instead of a blob. Nearest units get the slots, with a little stickiness so slots do not flicker.
 *  - Spread: attackers stop at staggered distances and keep a few metres from each other.
 *  - Search, do not stack: units that lost sight stop short of the last seen spot.
 *  - Go home: guards whose search ends walk back to their post and go back on watch.
 *
 * Hard, Crazy, training, skirmish, defense and capture missions keep the old behaviour; escorts keep the old rush
 * (no attack slots); bosses are never held.
 */
export const ATTACK_SLOTS = { easy: 3, normal: 4 } as const;
/** Waiting units close in to this ring and stop there, inside their sight (infantry 34 m, vehicles 44 m), so they
 *  keep watching. They never retreat: that lured the bot into the next group, and standing still far away left
 *  players hunting (and an escort transport running into them). */
export const WAIT_RING = { infantry: 30, vehicle: 38 } as const;
/** A waiting unit still defends itself when the tank drives this close. */
export const SELF_DEFENSE = 16;
/** Searching units stop this far from the last seen spot. */
export const SEARCH_STOP = 5;
/** Extra metres each attack slot holds back, so attackers form loose layers rather than one ring. */
export const LAYER_STEP = 3.5;
/** Attackers keep at least this far apart. */
export const SPACING = 4.5;
const STICKY = 6;

const applies = (g: Game) => {
  if (!SOFT(g)) return false;
  const kind = g.missionData().kind;
  return kind !== 'defense' && kind !== 'capture';
};
const hostile = (e: Unit) => !e.dead && !e.pending && e.team !== 'ally' && e.role !== 'boss' && e.role !== 'airlift';

export class CrowdControl {
  private attackers: Unit[] = [];
  private home = new WeakMap<Unit, Point>();
  private assignAt = 0;
  reset() { this.attackers = []; this.home = new WeakMap(); this.assignAt = 0; }

  /** Re-deal the attack slots a few times a second; remember each guard's post while it is still on watch. */
  update(g: Game) {
    if (!applies(g)) { this.attackers = []; return; }
    for (const e of g.enemies) if (hostile(e) && e.encounter?.active === false && !e.patrol && !this.home.has(e)) {
      const p = e.visual.root.position; this.home.set(e, { x: p.x, z: p.z });
    }
    if (g.elapsed < this.assignAt) return;
    this.assignAt = g.elapsed + .3;
    const player = g.player.visual.root.position, slots = ATTACK_SLOTS[g.save.difficulty as 'easy' | 'normal'];
    const engaged = g.enemies.filter(e => hostile(e) && e.encounter?.active !== false && ((e.searchUntil ?? 0) > g.elapsed || this.attackers.includes(e)));
    const score = (e: Unit) => e.visual.root.position.distanceTo(player) - (this.attackers.includes(e) ? STICKY : 0);
    this.attackers = engaged.sort((a, b) => score(a) - score(b)).slice(0, slots);
  }

  /** True when this unit should wait its turn instead of pressing the attack. Escorts keep the old rush: there the
   *  threat is the transport, and held-back enemies met it later on the road (measured: an extra transport loss). */
  waiting(g: Game, e: Unit) {
    if (!applies(g) || g.missionData().kind === 'escort' || !hostile(e)) return false;
    // Drop slot holders that died or left the battle (a restart or a scripted scene replaces g.enemies).
    this.attackers = this.attackers.filter(a => hostile(a) && g.enemies.includes(a));
    if (this.attackers.includes(e)) return false;
    // A free slot is taken at once, so a lone enemy never hesitates before its first shot.
    if (this.attackers.length < ATTACK_SLOTS[g.save.difficulty as 'easy' | 'normal']) { this.attackers.push(e); return false; }
    // Nearest first: a unit clearly closer than the farthest attacker takes that slot now.
    const player = g.player.visual.root.position, d = e.visual.root.position.distanceTo(player);
    let far = -1, farD = -1;
    this.attackers.forEach((a, i) => { const ad = a.visual.root.position.distanceTo(player); if (ad > farD) { farD = ad; far = i; } });
    if (far >= 0 && d + STICKY < farD) { this.attackers[far] = e; return false; }
    return true;
  }
  /** Stop distance for an attacker: its normal hold plus a layer per slot. */
  hold(g: Game, e: Unit, base: number) {
    if (!applies(g)) return base;
    const slot = this.attackers.indexOf(e);
    return slot < 0 ? base : base + slot * LAYER_STEP;
  }
  searchStop(g: Game) { return applies(g) ? SEARCH_STOP : 2; }
  /** Push away from other hostiles closer than SPACING (metres per second, already scaled by the caller). */
  separation(g: Game, e: Unit): Point {
    if (!applies(g)) return { x: 0, z: 0 };
    const p = e.visual.root.position; let x = 0, z = 0;
    for (const o of g.enemies) {
      if (o === e || o.dead || o.pending || o.team === 'ally') continue;
      const q = o.visual.root.position, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz);
      if (d > 0.01 && d < SPACING) { const push = (SPACING - d) / SPACING; x += dx / d * push; z += dz / d * push; }
    }
    return { x, z };
  }
  /** A guard that walked home goes back on watch (it can be alerted again like any sleeping guard). */
  backOnWatch(g: Game, e: Unit) {
    if (!applies(g) || e.patrol || !e.encounter) return false;
    const h = this.home.get(e); if (!h) return false;
    const p = e.visual.root.position;
    return Math.hypot(p.x - h.x, p.z - h.z) <= 2.5;
  }
  /** Where a guard that lost the tank should walk back to, or null when it is home or has no post. */
  homeFor(g: Game, e: Unit): Point | null {
    if (!applies(g) || e.patrol || !e.encounter) return null;
    const h = this.home.get(e); if (!h) return null;
    const p = e.visual.root.position;
    return Math.hypot(p.x - h.x, p.z - h.z) > 2.5 ? h : null;
  }
}
