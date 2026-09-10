export interface Point { x: number; z: number }
export interface Box { x: number; z: number; w: number; d: number }
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export function segmentCircle(a: Point, b: Point, c: Point, radius: number): number | null {
  const dx = b.x - a.x, dz = b.z - a.z, fx = a.x - c.x, fz = a.z - c.z;
  const cc = fx * fx + fz * fz - radius * radius;
  if (cc <= 0) return 0;
  const aa = dx * dx + dz * dz;
  if (aa < 1e-12) return null;
  const bb = 2 * (fx * dx + fz * dz), disc = bb * bb - 4 * aa * cc;
  if (disc < 0) return null;
  const t = (-bb - Math.sqrt(disc)) / (2 * aa);
  return t >= 0 && t <= 1 ? t : null;
}
export function segmentBox(a: Point, b: Point, box: Box, padding = 0): number | null {
  let near = 0, far = 1;
  for (const [start, delta, center, half] of [[a.x, b.x - a.x, box.x, box.w / 2 + padding], [a.z, b.z - a.z, box.z, box.d / 2 + padding]]) {
    if (Math.abs(delta) < 1e-10) { if (start < center - half || start > center + half) return null; }
    else {
      let t1 = (center - half - start) / delta, t2 = (center + half - start) / delta;
      if (t1 > t2) [t1, t2] = [t2, t1];
      near = Math.max(near, t1); far = Math.min(far, t2);
      if (near > far) return null;
    }
  }
  return near;
}
export function circleBox(p: Point, r: number, box: Box): boolean {
  return Math.hypot(p.x - clamp(p.x, box.x - box.w / 2, box.x + box.w / 2), p.z - clamp(p.z, box.z - box.d / 2, box.z + box.d / 2)) < r;
}
/** Heading 0 faces +Z. The source is the shooter's location, not the projectile direction. */
export function armorMultiplier(target: Point, heading: number, source: Point): number {
  const dx = source.x - target.x, dz = source.z - target.z, length = Math.hypot(dx, dz);
  const dot = length ? (Math.sin(heading) * dx + Math.cos(heading) * dz) / length : 0;
  return dot > .55 ? .65 : dot < -.55 ? 1.5 : 1;
}
export function turnToward(current: number, target: number, amount: number): number {
  return current + clamp(Math.atan2(Math.sin(target - current), Math.cos(target - current)), -amount, amount);
}
export type Upgrade = 'armor' | 'power' | 'reload';
export const upgradeCost = (level: number) => 120 + level * 100;
export function purchase(credits: number, level: number): { credits: number; level: number } | null {
  if (!Number.isInteger(level) || level < 0 || level >= 3 || credits < upgradeCost(level)) return null;
  return { credits: credits - upgradeCost(level), level: level + 1 };
}
