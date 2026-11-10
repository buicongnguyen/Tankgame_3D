import type { Game, Unit } from './game';
import type { Point } from './rules';
import { circleBox, distance } from './rules';
import { seesTarget } from './encounters';
import { counterattackLevel } from './campaign';

/**
 * Level 2 of a stage is the "Counterattack": once half the patrol is down, a reinforcement group drives in
 * from behind the player (the deployment end of the route, or the far map edge if the player is still there).
 * The group knows roughly where the player is and hunts them until it has its own line of sight.
 *
 * Destroying the whole patrol in one blow before the call skips it; nothing arrives on an empty field.
 */
const KEEP_AWAY = 42;      // metres from the player (and transport) where the group may appear
const HUNT_SECONDS = 75;   // how long the group keeps heading for the player's position unseen

type Role = Unit['role'];
export function counterGroup(difficulty: string, mission: number): Role[] {
  if (difficulty === 'easy') return ['raider', 'rifleman', 'rifleman'];
  if (difficulty === 'normal') return ['raider', 'raider', 'rifleman', 'rifleman'];
  return ['raider', 'raider', mission >= 4 ? 'heavy' : 'raider', 'rifleman', 'rifleman', 'rocketeer'];
}

export class Counterattack {
  /** Hostiles on the field when the level started; 0 until the first update. */
  initial = 0;
  state: 'waiting' | 'arrived' | 'skipped' | 'off' = 'off';
  units: Unit[] = [];
  private huntUntil = 0;
  private nextFix = 0;

  reset(g: Game) {
    this.initial = 0; this.units = []; this.huntUntil = 0; this.nextFix = 0;
    this.state = !g.training && !g.skirmish && counterattackLevel(g.missionData().kind, g.level) ? 'waiting' : 'off';
  }

  private entry(g: Game): Point {
    const player = g.player.visual.root.position, b = g.world.bounds, start = g.world.layout.spawn;
    const far = (p: Point) => Math.min(distance(p, player), g.convoy ? distance(p, g.convoy.position) : Infinity);
    const edges: Point[] = [{ x: 0, z: b.z - 6 }, { x: 0, z: -b.z + 6 }, { x: b.x - 6, z: 0 }, { x: -b.x + 6, z: 0 }];
    if (far(start) >= KEEP_AWAY) return start;
    return edges.reduce((best, p) => (far(p) > far(best) ? p : best));
  }

  private open(g: Game, p: Point) {
    return Math.abs(p.x) < g.world.bounds.x - 2 && Math.abs(p.z) < g.world.bounds.z - 2 && !g.world.covers.some(c => c.hp > 0 && circleBox(p, 2.4, c));
  }

  update(g: Game) {
    if (g.phase !== 'playing') return;
    const player = g.player.visual.root.position;
    if (this.state === 'waiting') {
      const living = g.enemies.filter(e => !e.dead && e.role !== 'boss').length;
      if (!this.initial) { this.initial = living; return; }
      if (living === 0) { this.state = 'skipped'; return; }
      if (living > Math.ceil(this.initial / 2)) return;
      const at = this.entry(g), face = Math.atan2(player.x - at.x, player.z - at.z);
      counterGroup(g.save.difficulty, g.mission).forEach((role, i) => {
        // A row across the line of advance; step outward until the spot is clear of buildings.
        let p = at;
        for (let n = 0; n < 14; n++) {
          const lateral = (i - 2) * 4.5 + (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 2.5, back = Math.floor(n / 4) * 3;
          p = { x: at.x + Math.cos(face) * lateral - Math.sin(face) * back, z: at.z - Math.sin(face) * lateral - Math.cos(face) * back };
          if (this.open(g, p)) break;
        }
        const unit = g.makeUnit(p.x, p.z, role);
        unit.heading = unit.aim = face; unit.cooldown = 2.5;
        unit.encounter = { group: 3, anchor: { x: p.x, z: p.z }, meters: 0, active: true };
        g.enemies.push(unit); g.syncVisual(unit); this.units.push(unit);
      });
      this.state = 'arrived'; this.huntUntil = g.elapsed + HUNT_SECONDS;
      g.banner('COUNTERATTACK', 'Behind you', 'Hostile reinforcements are closing from the rear');
      g.radioMessage('MARA / Counterattack! Hostile armor coming up behind you. Turn and face them.', 5);
      g.sfx.play('alarm');
    }
    if (this.state === 'arrived' && g.elapsed < this.huntUntil && g.elapsed >= this.nextFix) {
      this.nextFix = g.elapsed + 1;
      for (const e of this.units) if (!e.dead && !seesTarget(g, e, player)) { e.lastSeen = { x: player.x, z: player.z }; e.searchUntil = g.elapsed + 8; }
    }
  }
}
