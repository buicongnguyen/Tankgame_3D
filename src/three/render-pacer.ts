/** Limit GPU submissions without changing the fixed 60 Hz combat simulation. */
export class RenderPacer {
  private next = 0;
  private last = -Infinity;
  due(now: number, fps: number) {
    const interval = 1000 / fps;
    // Reset after a pause or backwards/stale RAF clock; never accumulate a backlog.
    if (now < this.last || now - this.last > 250) this.next = now;
    this.last = now;
    // RAF timestamps wobble around the refresh deadline. A half-millisecond
    // tolerance rejected alternate 60 Hz frames with only 0.7 ms of jitter.
    // Keep the deadline (and frame cap), but accept slightly early refreshes.
    if (now + Math.min(2, interval * .12) < this.next) return false;
    this.next += Math.max(1, Math.floor((now - this.next) / interval) + 1) * interval;
    return true;
  }
}
