import * as T from 'three';
import type { Game, Unit } from './game';
import type { Point } from './rules';
import { distance } from './rules';
import { reducedMotion } from './media';

/** The fun pass (docs/FUN_PASS_2026-11.md): a big finale, tips at the moment they matter, a revive at the last
 *  safe spot, and gentler enemy fire after repeated defeats. Easy and Normal campaign only (the finale shows on
 *  every campaign win). Scripted runs (?e2e) keep all of it off unless a test sets `g.helpers = true`. */

const soft = (g: Game) => g.helpers && !g.training && !g.skirmish && (g.save.difficulty === 'easy' || g.save.difficulty === 'normal');
const touch = () => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } };

export type TipId = 'fence' | 'kite' | 'strike' | 'ambush' | 'hull';
const TIP_KEY = 'steel-front-tips';
export const TIPS: Record<TipId, (touch: boolean) => string> = {
  fence: () => 'KESTREL / Enemies behind that fence have not seen you. Ram it at speed for a surprise attack.',
  kite: () => 'MARA / Keep about 35 m back. Their tank guns cannot reach you there.',
  strike: t => t ? 'KESTREL / Big group ahead. Tap STRIKE to call an airstrike.' : 'KESTREL / Big group ahead. Press R to call an airstrike.',
  ambush: () => 'MARA / Ambush! Enemies that have not seen you take 50% extra damage.',
  hull: t => t ? 'KESTREL / Hull low. Tap SHIELD and pull back behind cover.' : 'KESTREL / Hull low. Press Q for a shield and pull back behind cover.',
};
export const SUPPORT_LINE = 'KESTREL / Extra armour plates fitted. Enemy fire hurts less now.';
export const REVIVE_LINE = 'KESTREL / Back in the fight. Shield up.';
/** Revives per level, by difficulty. */
export const REVIVES = { easy: 2, normal: 1 } as const;
/** Enemy damage to the player after two defeats in a row on the same level. */
export const SUPPORT_SCALE = .75;
const FINALE_SECONDS = 1.5, FINALE_SPEED = .4;

/** Defeats in a row per level and difficulty, for this page session. */
const streaks = new Map<string, number>();
const streakKey = (g: Game) => `${g.mission}:${g.level}:${g.save.difficulty}`;

export class FunLayer {
  seen = new Set<TipId>();
  revivesLeft = 0;
  revived = 0;
  checkpoint: Point = { x: 0, z: 0 };
  support = false;
  finale = 0;
  lastKill: Point | null = null;
  private sampleAt = 0;
  private tipAt = -99;
  private banner?: HTMLElement;

  constructor() { try { for (const id of JSON.parse(localStorage.getItem(TIP_KEY) || '[]')) if (id in TIPS) this.seen.add(id); } catch { /* blocked storage */ } }

  /** Called from prepare(), after the player exists. */
  reset(g: Game) {
    const d = g.save.difficulty as 'easy' | 'normal';
    this.revivesLeft = soft(g) ? REVIVES[d] : 0; this.revived = 0; this.finale = 0; this.lastKill = null; this.sampleAt = 0; this.tipAt = -99;
    const p = g.player.visual.root.position; this.checkpoint = { x: p.x, z: p.z };
    this.support = soft(g) && (streaks.get(streakKey(g)) ?? 0) >= 2;
    this.banner?.remove(); this.banner = undefined;
  }
  /** Damage to the player is scaled by this. */
  playerDamageScale() { return this.support ? SUPPORT_SCALE : 1; }

  /** Once a battle is running: the support notice, safe-spot sampling and tips. */
  update(g: Game) {
    if (this.support && g.elapsed > .8 && g.elapsed < 1) g.radioMessage(SUPPORT_LINE, 4);
    if (!soft(g)) return;
    const p = g.player.visual.root.position;
    if (g.elapsed >= this.sampleAt) {
      this.sampleAt = g.elapsed + 1;
      if (!awakeNear(g, p, 35)) this.checkpoint = { x: p.x, z: p.z };
      this.checkTips(g, p);
    }
  }

  private checkTips(g: Game, p: T.Vector3) {
    if (g.elapsed - this.tipAt < 12 || g.radioTimer > 0) return;
    if (g.player.hp < g.player.max * .35) { this.tip(g, 'hull'); return; }
    const awake = g.enemies.filter(e => !e.dead && !e.pending && e.encounter?.active !== false);
    if (g.save.strikeCharges > 0 && awake.filter(e => distance(e.visual.root.position, p) < 30).length >= 3) { this.tip(g, 'strike'); return; }
    if (awake.some(e => (e.role === 'raider' || e.role === 'heavy') && between(distance(e.visual.root.position, p), 26, 40))) { this.tip(g, 'kite'); return; }
    const fence = g.world.covers.find(c => c.kind === 'fence' && c.hp > 0 && distance(c, p) < 14);
    if (fence && g.enemies.some(e => !e.dead && !e.pending && e.encounter?.active === false && distance(e.visual.root.position, fence) < 30)) this.tip(g, 'fence');
  }

  /** Shows a tip once per device. Returns whether it showed. */
  tip(g: Game, id: TipId) {
    if (!soft(g) || this.seen.has(id) || g.elapsed - this.tipAt < 12 || g.radioTimer > 0) return false;
    this.seen.add(id); this.tipAt = g.elapsed;
    try { localStorage.setItem(TIP_KEY, JSON.stringify([...this.seen])); } catch { /* ignore */ }
    g.radioMessage(TIPS[id](touch()), 6);
    return true;
  }

  noteKill(unit: Unit) { const p = unit.visual.root.position; this.lastKill = { x: p.x, z: p.z }; }

  /** The tank was destroyed: count the defeat and say whether a revive is on offer. */
  defeated(g: Game, tankLost: boolean) {
    if (!g.training && !g.skirmish) streaks.set(streakKey(g), (streaks.get(streakKey(g)) ?? 0) + 1);
    return tankLost && this.revivesLeft > 0;
  }
  won(g: Game) { streaks.delete(streakKey(g)); }

  /** Where a revived tank returns: the last safe spot, or the deployment point if enemies moved in. */
  revivePoint(g: Game): Point {
    return awakeNear(g, this.checkpoint, 20) ? { ...g.world.layout.spawn } : { ...this.checkpoint };
  }

  /** The last kill sets off a big blast; the finish plays in slow motion under an AREA CLEAR banner. */
  startFinale(g: Game, credits: number | null) {
    if (!g.helpers) return;
    const quiet = reducedMotion();
    if (this.lastKill && !quiet) {
      const at = new T.Vector3(this.lastKill.x, 1.2, this.lastKill.z);
      g.world.fx.impact(at, true); g.world.burst(at, 3, 9); g.world.shake(.35); g.sfx.play('blast', .8);
    }
    this.finale = quiet ? 0 : FINALE_SECONDS;
    const el = document.createElement('div'); el.className = 'finale-banner'; el.setAttribute('role', 'status');
    const title = document.createElement('strong'); title.textContent = 'AREA CLEAR'; el.append(title);
    if (credits !== null && credits > 0) { const c = document.createElement('span'); c.textContent = `+${credits} CR`; el.append(c); }
    g.hud.append(el); this.banner = el;
  }
  /** Speed for drawn motion (effects, camera) this frame. */
  drawSpeed(dt: number) { if (this.finale <= 0) return 1; this.finale = Math.max(0, this.finale - dt); return FINALE_SPEED; }
  clearBanner() { this.banner?.remove(); this.banner = undefined; }
}

const between = (v: number, a: number, b: number) => v >= a && v <= b;
function awakeNear(g: Game, p: Point, range: number) {
  return g.enemies.some(e => !e.dead && !e.pending && e.encounter?.active !== false && distance(e.visual.root.position, p) < range);
}
