/** Limit GPU submissions without changing the fixed 60 Hz combat simulation. */
export class RenderPacer {
  private next = 0;
  private last = -Infinity;
  due(now: number, fps: number) {
    const interval = 1000 / fps;
    // Reset after a pause or backwards/stale RAF clock; never accumulate a backlog.
    if (now < this.last || now - this.last > 250) this.next = now;
    this.last = now;
    if (now + .5 < this.next) return false;
    this.next += Math.max(1, Math.floor((now - this.next) / interval) + 1) * interval;
    return true;
  }
}
