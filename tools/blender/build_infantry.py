"""Soldier bodies for the rifleman and the rocketeer, authored for both detail tiers.

The old soldiers were stacked boxes: a slab torso, a flat hat and straight legs. These have a
tapered torso with shoulders, neck, a rounded head under a proper helmet, two-handed weapon
holds, a backpack, and legs with thigh, shin, knee and boot. The rig contract is unchanged:

    <name>            root
      Hull            (empty)  yaws with the hull heading
        LeftLeg  (-0.23, 0, 0.92)   hip pivots swung by the walk cycle (rotation about X)
        RightLeg ( 0.23, 0, 0.92)
      Turret          (0, 0, 1.2)  the upper body: aims and recoils
        Muzzle        rifleman (0.28, -1.18, 0.16), rocketeer (0.42, -1.08, 0.47)

Materials keep their runtime names (InfantryUniform/Boots/Face/Helmet/Gun): World.load merges them
into one crew surface per pivot and now multiplies the baked occlusion and paint in COLOR_0 into it.
Blender -Y is the soldier's front. Nothing hangs directly under Hull, so each model still merges
into three meshes (torso, left leg, right leg).

Headless:  blender --background --factory-startup --python tools/blender/build_infantry.py
Then:      node tools/check-assets.mjs
"""
import bpy, bmesh, math, sys
from pathlib import Path
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_aaa_props as A

ROOT = A.ROOT
NAMES = ('rifleman', 'rocketeer')
MUZZLE = {'rifleman': (.28, -1.18, .16), 'rocketeer': (.42, -1.08, .47)}
for n in NAMES:
    A.ROOTS[n] = n


# ---------------------------------------------------------------- geometry helpers
def tube(path, rx, ry, n, cap0='flat', cap1='flat', exp=2.0, ref=None):
    """Swept superellipse: one ring per path point (half-widths rx, ry along `ref` and the other
    perpendicular axis), quad-stripped together. Caps are flat or a 'dome' pole."""
    pts = [Vector(p) for p in path]
    bm = bmesh.new()
    rings, frames = [], []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        r = Vector(ref) if ref is not None else (Vector((1, 0, 0)) if abs(t.x) < .9 else Vector((0, 1, 0)))
        side = (r - t * r.dot(t)).normalized()
        up = t.cross(side)
        frames.append((t, side, up))
        ring = []
        for s in range(n):
            a = s / n * math.tau
            c, sn = math.cos(a), math.sin(a)
            x = math.copysign(abs(c) ** (2 / exp), c) * rx[i]
            y = math.copysign(abs(sn) ** (2 / exp), sn) * ry[i]
            ring.append(bm.verts.new(p + side * x + up * y))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for s in range(n):
            t = (s + 1) % n
            bm.faces.new((a[s], a[t], b[t], b[s]))
    for ring, cap, end in ((rings[0], cap0, 0), (rings[-1], cap1, -1)):
        if cap == 'dome':
            t = frames[end][0]
            tip = pts[end] + t * (1 if end == -1 else -1) * max(rx[end], ry[end]) * .75
            apex = bm.verts.new(tip)
            for s in range(n):
                bm.faces.new((ring[s], ring[(s + 1) % n], apex))
        else:
            bm.faces.new(ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def blob(c, r, n, squash=(1, 1, 1)):
    """Rounded lump (fists, shoulder caps)."""
    c = Vector(c)
    bm = tube([c + Vector((0, 0, -r * .3)), c + Vector((0, 0, r * .3))], [r * .95, r * .95], [r * .95, r * .95], n,
              'dome', 'dome', ref=(1, 0, 0))
    if squash != (1, 1, 1):
        for v in bm.verts:
            d = v.co - c
            v.co = c + Vector((d.x * squash[0], d.y * squash[1], d.z * squash[2]))
    return bm


def box(lo, hi, bevel=0.0, tilt=(0, 0, 0)):
    return A.block(lo, hi, bevel=bevel, tilt=tilt)


def join(*parts):
    out = bmesh.new()
    for p in parts:
        A.merge(out, p)
    return out


# ---------------------------------------------------------------- one soldier
def build_soldier(root, low, kind):
    uni = A.material('InfantryUniform', (.17, .07, .05), .9, .0)
    boots = A.material('InfantryBoots', (.045, .06, .065), .75, .05)
    skin = A.material('InfantryFace', (.45, .27, .18), .62, .0)
    helm = A.material('InfantryHelmet', (.30, .25, .11), .55, .12)
    gun = A.material('InfantryGun', (.06, .08, .09), .38, .85)
    N, NL = (6, 5) if low else (10, 8)
    bev = 0

    hull = A.empty('Hull'); hull.parent = root
    turret = A.empty('Turret'); turret.parent = root; turret.location = (0, 0, 1.2)
    top = {uni: [], boots: [], skin: [], helm: [], gun: []}   # bmeshes per material, joined into one object each

    def put(mat, bm):
        top[mat].append(bm)

    # ---- torso: tapered ribcage with shoulders, neck at the top, hips at the bottom
    zs = [-.30, -.14, .08, .30, .47, .57]
    cy = [0, 0, 0, -.02, 0, 0]
    rx = [.27, .29, .31, .37, .375, .21]
    ry = [.19, .20, .215, .235, .20, .15]
    if low:
        pick = [0, 2, 3, 4, 5]
        zs, cy, rx, ry = [[v[i] for i in pick] for v in (zs, cy, rx, ry)]
    put(uni, tube([(0, c, z) for c, z in zip(cy, zs)], rx, ry, N, exp=2.6))
    if not low:
        put(skin, tube([(0, 0, .54), (0, 0, .68)], [.095, .09], [.095, .09], NL))

    # ---- head, helmet and face gear
    head = [(0, 0, .55), (0, -.015, .60), (0, -.02, .70), (0, -.01, .81), (0, -.005, .90), (0, 0, .945)]
    hx, hy = [.10, .15, .17, .17, .13, .05], [.10, .155, .185, .185, .15, .06]
    if low:
        head, hx, hy = head[1:5:1][::1], hx[1:5], hy[1:5]
    put(skin, tube(head, hx, hy, N, cap1='dome', exp=2.2))
    dome = [(0, -.01, .72), (0, -.01, .80), (0, -.005, .89), (0, 0, .97), (0, 0, 1.02), (0, 0, 1.045)]
    dx, dy = [.185, .195, .185, .15, .09, .03], [.205, .215, .205, .17, .10, .035]
    if low:
        dome, dx, dy = [dome[i] for i in (0, 2, 3, 5)], [dx[i] for i in (0, 2, 3, 5)], [dy[i] for i in (0, 2, 3, 5)]
    put(helm, tube(dome, dx, dy, N, cap1='dome', exp=2.1))
    put(helm, box((-.17, -.30, .735), (.17, -.20, .77), bevel=bev, tilt=(math.radians(-8), 0, 0)))       # front brim
    put(helm, box((-.16, .19, .67), (.16, .26, .75), bevel=bev, tilt=(math.radians(14), 0, 0)))          # neck flap
    put(boots, box((-.15, -.23, .685), (.15, -.19, .735)))                                               # goggles
    if not low:
        put(skin, box((-.028, -.225, .66), (.028, -.19, .72)))                               # nose

    # ---- backpack, bedroll (and spare rockets for the rocketeer)
    put(gun, box((-.23, .19, -.17), (.23, .44, .36), bevel=0 if low else .05))
    if not low:
        put(helm, tube([(-.26, .31, .43), (.26, .31, .43)], [.078, .078], [.078, .078], 8))
        put(boots, box((-.19, .42, -.08), (-.07, .49, .16)))
    if kind == 'rocketeer':
        seg = 6 if low else 8
        for sx in (-1, 1):
            put(gun, tube([(sx * .12, .34, .30), (sx * .12, .34, .76)], [.055, .055], [.055, .055], seg))
            put(helm, tube([(sx * .12, .34, .76), (sx * .12, .34, .86)], [.055, .01], [.055, .01], seg, cap1='dome'))

    # ---- vest, belt and pouches
    if not low:
        put(boots, box((-.26, -.29, -.06), (.26, -.19, .40), bevel=.035))
        put(boots, tube([(0, 0, -.26), (0, 0, -.17)], [.295, .295], [.215, .215], N, exp=2.6))
        for x in (-.17, 0, .17):
            put(boots, box((x - .06, -.31, -.24), (x + .06, -.235, -.10)))

    # ---- arms: shoulder, elbow, hand (gloved)
    arms = {
        'rifleman': (((.42, 0, .44), (.40, -.12, .18), (.30, -.34, .16)),
                     ((-.42, 0, .44), (-.22, -.26, .16), (.24, -.52, .16))),
        'rocketeer': (((.42, 0, .44), (.46, .06, .15), (.38, -.22, .28)),
                      ((-.42, 0, .44), (-.20, -.28, .14), (.34, -.55, .27))),
    }[kind]
    lump = 5 if low else 7
    for a in arms:
        put(uni, tube(a, [.09, .075, .06], [.09, .075, .06], NL))
        put(boots, blob(a[2], .065, lump))
        if not low:
            put(uni, blob((a[0][0] * .98, a[0][1], a[0][2] + .02), .125, lump, squash=(1, 1, .9)))

    # ---- weapon
    if kind == 'rifleman':
        x = .28
        put(gun, join(
            box((x - .05, -.34, .08), (x + .05, -.05, .24), bevel=bev),                 # stock
            box((x - .055, -.66, .10), (x + .055, -.34, .235), bevel=bev),              # receiver
            box((x - .05, -.98, .115), (x + .05, -.66, .22), bevel=bev),                # handguard
            tube([(x, -.98, .17), (x, -1.16, .17)], [.026, .026], [.026, .026], 6 if low else 8),
            tube([(x, -1.10, .17), (x, -1.19, .17)], [.04, .04], [.04, .04], 6 if low else 8),
            box((x - .02, -.58, .235), (x + .02, -.40, .29)),                            # sight
            *([box((x - .022, -.55, -.01), (x + .022, -.47, .10), tilt=(math.radians(10), 0, 0))] if not low else [])))  # magazine
    else:
        x, z = .42, .47
        put(gun, join(
            tube([(x, .30, z), (x, -.95, z)], [.17, .17], [.17, .17], N, exp=2.2),
            tube([(x, .30, z), (x, .42, z)], [.17, .235], [.17, .235], N, exp=2.2),
            tube([(x, -.86, z), (x, -.95, z)], [.19, .19], [.19, .19], N, exp=2.2),
            box((x - .02, -.7, z + .17), (x + .02, -.55, z + .24)),
            box((x - .03, -.28, z - .27), (x + .03, -.10, z - .16))))
        put(helm, tube([(x, -.95, z), (x, -1.05, z), (x, -1.12, z)], [.12, .09, .0], [.12, .09, .0], N, cap1='dome'))

    objs = []
    for mat, bms in top.items():
        if bms:
            name = {uni: 'Uniform', boots: 'Gear', skin: 'Skin', helm: 'Helmet', gun: 'Weapon'}[mat]
            objs.append((A.obj_from_bm(turret, name, join(*bms), [mat]), mat))

    # ---- legs (hip pivots under Hull)
    for side, name in ((-1, 'LeftLeg'), (1, 'RightLeg')):
        leg = A.empty(name); leg.parent = hull; leg.location = (side * .23, 0, .92)
        path = [(0, 0, .05), (0, -.03, -.20), (0, -.06, -.44), (0, -.045, -.62), (0, -.01, -.80)]
        lx, ly = [.15, .145, .125, .10, .085], [.155, .15, .13, .10, .085]
        if low:
            path, lx, ly = [path[i] for i in (0, 2, 4)], [lx[i] for i in (0, 2, 4)], [ly[i] for i in (0, 2, 4)]
        limb = tube(path, lx, ly, NL)
        objs.append((A.obj_from_bm(leg, name + ' limb', limb, [uni]), uni))
        parts = [tube([(0, .11, -.845), (0, -.06, -.855), (0, -.24, -.865), (0, -.33, -.87)],
                      [.105, .11, .10, .075], [.085, .085, .075, .055], NL, cap1='dome', exp=2.6)]
        if not low:
            parts += [tube([(0, 0, -.72), (0, 0, -.86)], [.095, .095], [.095, .095], NL),
                      box((-.115, -.34, -.93), (.115, .16, -.895)),
                      box((-.075, -.17, -.50), (.075, -.11, -.38))]
        objs.append((A.obj_from_bm(leg, name + ' boot', join(*parts), [boots]), boots))

    muzzle = A.empty('Muzzle'); muzzle.parent = turret; muzzle.location = MUZZLE[kind]

    # ---- finish: crease the hard parts, bake occlusion, paint mottling
    for o, mat in objs:
        if mat in (gun, boots, helm):
            A.harden(o, 38, weighted=False)
    ao = A.bake_ao([o for o, _ in objs], distance=.55, samples=32)
    import os
    if os.environ.get('INFANTRY_DEBUG'):
        for o, _ in objs:
            o.data.calc_loop_triangles()
            print('PART', kind, 'low' if low else 'high', o.name, len(o.data.loop_triangles))

    def cloth(co, no, part):
        n = .84 + .16 * (.5 + A.fbm(co * 9))
        return (n, n, n)

    def hard(co, no, part):
        n = .9 + .1 * (.5 + A.fbm(co * 14))
        return (n, n, n)

    def flesh(co, no, part):
        n = .96 + .04 * A.fbm(co * 6)
        return (n, n * .98, n * .96)

    fns = {uni: cloth, boots: hard, skin: flesh, helm: hard, gun: hard}
    for o, mat in objs:
        A.paint(o, fns[mat], ao[o], .6)


for n in NAMES:
    A.BUILDERS[n] = (lambda kind: lambda root, low=False: build_soldier(root, low, kind))(n)


def run():
    import os
    out = os.environ.get('INFANTRY_OUT')   # preview build: export elsewhere, touch nothing in the repo
    for n in NAMES:
        for low in (False, True):
            A.build(n, low)
            A.export(n, directory=(Path(out) / ('low' if low else '')) if out else None, low=low)
    print('INFANTRY_TRIANGLES', {f'{n}{"-low" if l else ""}': t for (n, l), t in A.TRIANGLES.items() if n in NAMES})
    if out:
        return
    A.record_low_manifest(list(NAMES))
    # A dedicated source file: build_aaa_props' own save would replace the prop scenes.
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets' / 'blender' / 'infantry.blend'), compress=True)


if __name__ == '__main__':
    run()
