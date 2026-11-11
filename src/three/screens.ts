import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Game, Unit } from './game';
import type { Cover, World } from './world';
import type { Box, Point } from './rules';
import { circleBox, distance } from './rules';
import type { EncounterOrder } from './encounters';
import { ENCOUNTER_FRACTIONS, overlapsReservation, routeSample } from './stage-layout';
import type { StageLayout } from './stage-layout';
import { terrainSpeed } from './terrain';

/** Plank fences: light walls beside the road, just short of each later enemy group. They hide the tank from
 *  that group (cover blocks sight), and the tank bursts through them at speed for a surprise attack. */
export const FENCE_HP = 60;
export const FENCE_LENGTH = 6;
/** Hull damage per second of pushing, by cover kind. A fence gives way in about 0.15 s, a crate in about 0.3 s. */
export const RAM_RATE: Partial<Record<Cover['kind'], number>> = { fence: 400, crate: 200 };
const LATERALS = [8, 10, 12, 14.5, 17];
const BEFORE_GROUP = [13, 17, 9.5];

export interface FenceBox extends Box { vertical: boolean; group: number; }
const overlap = (a: Box, b: Box, margin: number) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + margin && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + margin;

/** Where the fences go: one each side of the road before groups 1 to 3, clear of the road, reserved ground
 *  and existing cover. Pure, so the same stage always gets the same fences. */
export function fenceBoxes(layout: StageLayout, bounds: Point, taken: Box[], firm: (p: Point) => boolean = () => true): FenceBox[] {
  const out: FenceBox[] = [];
  for (let group = 1; group < ENCOUNTER_FRACTIONS.length; group++) {
    for (const side of [-1, 1]) {
      search: for (const before of BEFORE_GROUP) for (const lateral of LATERALS) {
        const meters = layout.length * ENCOUNTER_FRACTIONS[group] - before;
        if (meters < 18) continue;
        const s = routeSample(layout.points, meters), vertical = Math.abs(s.dx) > Math.abs(s.dz);
        const box: FenceBox = { x: s.x + s.dz * side * lateral, z: s.z - s.dx * side * lateral, w: vertical ? 1 : FENCE_LENGTH, d: vertical ? FENCE_LENGTH : 1, vertical, group };
        if (Math.abs(box.x) > bounds.x - 5 || Math.abs(box.z) > bounds.z - 5) continue;
        if (distance(box, layout.spawn) < 16 || overlapsReservation(layout, box, 1.5)) continue;
        // Dry, ordinary ground only: no fences in rivers, mud or on ice.
        const reach = FENCE_LENGTH / 2 + 1.5, ends = vertical ? { x: 0, z: reach } : { x: reach, z: 0 };
        if (![-1, 0, 1].every(k => firm({ x: box.x + ends.x * k, z: box.z + ends.z * k }))) continue;
        // 3 m of clearance: a tank can always pass between a fence and its neighbours.
        if (taken.some(c => overlap(c, box, 3)) || out.some(c => overlap(c, box, 3))) continue;
        out.push(box); break search;
      }
    }
  }
  return out;
}

/** One plank panel, 6 m long: uneven boards on two rails, coloured in the vertices (one draw for all fences). */
function fenceGeometry() {
  const pieces: T.BufferGeometry[] = [];
  const add = (w: number, h: number, d: number, x: number, y: number, shade: number) => {
    const g = new T.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, 0);
    const c = new T.Color(0xd9a35e).multiplyScalar(shade), n = g.attributes.position.count, colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(colors, 3)); pieces.push(g);
  };
  const boards = 10, step = FENCE_LENGTH / boards;
  for (let i = 0; i < boards; i++) { const h = 1.75 + ((i * 7) % 5) * .09; add(step * .86, h, .46, -FENCE_LENGTH / 2 + step * (i + .5), h / 2, .86 + ((i * 3) % 4) * .08); }
  add(FENCE_LENGTH, .18, .6, 0, .55, .55); add(FENCE_LENGTH, .18, .6, 0, 1.4, .55);
  for (const x of [-FENCE_LENGTH / 2 + .2, -1, 1, FENCE_LENGTH / 2 - .2]) add(.5, 2.25, .72, x, 1.125, .48);
  const merged = mergeGeometries(pieces)!; for (const p of pieces) p.dispose();
  return merged;
}

let shared: { geometry: T.BufferGeometry; material: T.Material } | undefined;
/** Adds this stage's fences to the world as breakable cover. Called after the stage is built. */
export function buildFences(world: World) {
  const boxes = fenceBoxes(world.layout, world.bounds, world.covers.filter(c => c.hp > 0), p => terrainSpeed(world.environment.biome, p.x, p.z) > .5);
  if (!boxes.length) return boxes;
  // Shared for the life of the page, so rebuilding a stage adds no geometry or material.
  shared ??= { geometry: fenceGeometry(), material: new T.MeshLambertMaterial({ vertexColors: true }) };
  const mesh = new T.InstancedMesh(shared.geometry, shared.material, boxes.length);
  mesh.name = 'PlankFences'; mesh.castShadow = false; mesh.receiveShadow = true;
  const matrix = new T.Matrix4(), turn = new T.Quaternion(), up = new T.Vector3(0, 1, 0), one = new T.Vector3(1, 1, 1);
  boxes.forEach((box, index) => {
    matrix.compose(new T.Vector3(box.x, 0, box.z), turn.setFromAxisAngle(up, box.vertical ? Math.PI / 2 : 0), one);
    mesh.setMatrixAt(index, matrix); mesh.setColorAt(index, new T.Color(0xffffff));
    const anchor = new T.Group(); anchor.name = 'PlankFence'; anchor.position.set(box.x, 0, box.z); world.arena.add(anchor);
    world.covers.push({ x: box.x, z: box.z, w: box.w, d: box.d, kind: 'fence', hp: FENCE_HP, mesh: anchor, scenery: { parts: [mesh], index, maxHP: FENCE_HP } });
  });
  mesh.computeBoundingSphere(); world.arena.add(mesh);
  return boxes;
}

/** The player's tank pushes light cover over. `at` is where the blocked step wanted to go. */
export function ramCover(g: Game, at: Point, radius: number, dt: number) {
  for (const cover of g.world.covers) {
    const rate = RAM_RATE[cover.kind];
    if (!rate || cover.hp <= 0 || !circleBox(at, radius + .15, cover)) continue;
    g.hitCover(cover, rate * dt, false, false);
    if (cover.hp <= 0) {
      g.world.shake(.18); g.sfx.play('blast', .5);
      if (cover.kind === 'fence' && !g.fenceCalled) { g.fenceCalled = true; g.radioMessage('KESTREL / Fence down. Hit them before they turn.', 3); }
    }
  }
}

/** Pacing on Easy and Normal: a later group does not wake on sight while earlier groups are still fighting,
 *  unless the tank comes close. Shooting a unit, and the convoy or allies coming into view, wake it as before. */
export function holdsBack(g: Game, unit: Unit, order: EncounterOrder) {
  const difficulty = g.save.difficulty;
  if (order.group === 0 || g.skirmish || g.training || difficulty !== 'easy' && difficulty !== 'normal') return false;
  if (distance(unit.visual.root.position, g.player.visual.root.position) < (difficulty === 'easy' ? 20 : 26)) return false;
  let earlier = 0;
  for (const e of g.enemies) if (!e.dead && !e.pending && e.role !== 'boss' && e.encounter && e.encounter.group < order.group) earlier++;
  return earlier > (difficulty === 'easy' ? 0 : 2);
}
