import * as T from 'three';

/**
 * Floating damage numbers over hostile units. Damage to one unit inside a short window is summed
 * into a single number, so rapid fire and flame ticks read as one figure instead of a blur.
 * A fixed pool of DOM labels is reused; nothing is created while fighting.
 */
type Kind = 'normal' | 'weak' | 'kill' | 'ambush';
interface Pending { sum: number; age: number; kind: Kind; at: T.Vector3; }
interface Label { el: HTMLElement; at: T.Vector3; age: number; live: boolean; drift: number; }

const WINDOW = .14, LIFE = .75;

export class HitFeedback {
  private layer: HTMLElement;
  private labels: Label[] = [];
  private pending = new Map<object, Pending>();
  private v = new T.Vector3();
  /** Numbers shown since the battle was prepared (tests and tuning). */
  shown = 0;

  constructor(parent: HTMLElement, size = 12) {
    this.layer = document.createElement('div'); this.layer.className = 'hit-layer'; this.layer.setAttribute('aria-hidden', 'true');
    this.layer.setAttribute('translate', 'no'); parent.append(this.layer);
    for (let i = 0; i < size; i++) {
      const el = document.createElement('b'); el.hidden = true; this.layer.append(el);
      this.labels.push({ el, at: new T.Vector3(), age: 0, live: false, drift: 0 });
    }
  }

  /** Note damage done to a hostile unit at a world position. */
  add(unit: object, amount: number, at: T.Vector3, weak: boolean, killed: boolean, ambush = false) {
    if (!(amount > 0)) return;
    let p = this.pending.get(unit);
    if (!p) { p = { sum: 0, age: 0, kind: 'normal', at: new T.Vector3() }; this.pending.set(unit, p); }
    p.sum += amount; p.at.copy(at);
    if (killed) { p.kind = 'kill'; p.age = WINDOW; } else if (ambush) p.kind = 'ambush'; else if (weak && p.kind === 'normal') p.kind = 'weak';
  }

  private spawn(p: Pending) {
    const value = Math.round(p.sum); if (value < 1) return;
    // Reuse a free label, or the oldest one when all are busy.
    let label = this.labels.find(l => !l.live);
    if (!label) label = this.labels.reduce((a, b) => (b.age > a.age ? b : a));
    label.live = true; label.age = 0; label.at.copy(p.at); label.drift = (this.shown % 5 - 2) * 9;
    label.el.textContent = String(value); label.el.className = p.kind; label.el.hidden = false; this.shown++;
  }

  update(dt: number, camera: T.Camera, width: number, height: number) {
    if (this.pending.size) for (const [unit, p] of this.pending) { p.age += dt; if (p.age >= WINDOW) { this.pending.delete(unit); this.spawn(p); } }
    for (const l of this.labels) {
      if (!l.live) continue;
      l.age += dt;
      if (l.age >= LIFE) { l.live = false; l.el.hidden = true; continue; }
      const k = l.age / LIFE, p = this.v.copy(l.at).project(camera);
      if (p.z > 1) { l.el.style.opacity = '0'; continue; }
      const x = (p.x + 1) / 2 * width + l.drift * k, y = (1 - p.y) / 2 * height - 18 - 34 * (1 - (1 - k) * (1 - k));
      const pop = k < .14 ? .7 + k / .14 * .5 : 1.2 - Math.min(1, (k - .14) / .2) * .2;
      l.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${pop.toFixed(2)})`;
      l.el.style.opacity = k > .7 ? ((1 - k) / .3).toFixed(2) : '1';
    }
  }

  clear() { this.pending.clear(); this.shown = 0; for (const l of this.labels) { l.live = false; l.el.hidden = true; } }
}
