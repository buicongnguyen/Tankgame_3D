"""Hero-quality rebuild of the most visible static props.

Replaces pine, barricade, volcanic-rock, stonewall and barrel with sculpted
silhouettes, and authors the destructible concrete-block landmark that replaced
the hill and basalt landforms. All use weighted hard-surface normals and baked
vertex-colour occlusion and weathering (Cycles AO multiplied into a procedural
paint pass). No image textures except the 64 px basalt normal map that frontier
rocks require.

Run after build_assets.py, build_environment.py and build_frontier.py. Both
tiers are authored here (public/models and public/models/low); build_low_detail.py
skips these props so decimation cannot tear their seams.

Headless:  blender --background --factory-startup --python tools/blender/build_aaa_props.py -- [names]
Live (Blender MCP):
    ns = {'__file__': path, '__name__': 'aaa_props'}; exec(open(path).read(), ns)
    ns['run'](['pine'])            # or ns['build']('pine', low=False); ns['export']('pine')
"""
import bpy, bmesh, json, math, random, re, sys
from contextlib import contextmanager
from pathlib import Path
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'models'
SOURCE = ROOT / 'assets' / 'blender'
# Runtime file stem -> root node name kept from the original exports.
ROOTS = {'pine': 'pine', 'barricade': 'Barricade', 'volcanic-rock': 'volcanic-rock',
         'concrete-block': 'ConcreteBlock', 'stonewall': 'stonewall', 'barrel': 'Barrel', 'airlift': 'Airlift'}
TAG = 'aaa_props'
LIVE = bpy.context.window is not None


# ---------------------------------------------------------------- scene / materials
def prepare_scene(name):
    """Live: one clean scene per asset. Headless: park earlier roots far away."""
    if LIVE:
        label = f'AAA {name}'
        sc = bpy.data.scenes.get(label) or bpy.data.scenes.new(label)
        for o in list(sc.objects):
            data = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and not data.users:
                bpy.data.meshes.remove(data)
        bpy.context.window.scene = sc
    else:
        sc = bpy.context.scene
        for i, o in enumerate(o for o in sc.objects if o.parent is None):
            o.location.x += 60 * (i + 1)
    if sc.world is None:
        sc.world = bpy.data.worlds.new(f'{TAG} world')
    return sc


def material(name, color, rough, metal=0.0, emission=0.0, vcol=True, normal=None, normal_strength=0.9):
    """Principled material; base colour multiplied by the 'Col' attribute (glTF COLOR_0)."""
    m = next((m for m in bpy.data.materials if m.get(TAG) == name), None) or bpy.data.materials.new(name)
    m[TAG] = name
    m.use_backface_culling = True  # closed shells: exported as single-sided
    m.use_nodes = True
    m.diffuse_color = (*color, 1)
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs['Surface'])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if vcol:
        attr = nt.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        a = next(s for s in mix.inputs if s.name == 'A' and s.type == 'RGBA')
        b = next(s for s in mix.inputs if s.name == 'B' and s.type == 'RGBA')
        a.default_value = (*color, 1)
        nt.links.new(attr.outputs['Color'], b)
        nt.links.new(next(s for s in mix.outputs if s.type == 'RGBA'), bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = (*color, 1)
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*color, 1)
        bsdf.inputs['Emission Strength'].default_value = emission
    if normal is not None:
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = normal
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(tex.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def empty(name):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    return o


def obj_from_bm(parent, name, bm, mats, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    return o


def harden(o, sharp_deg=None, weighted=True):
    """Sharp creases plus face-area weighted normals: flat panels, soft machined edges."""
    me = o.data
    if sharp_deg is not None:
        me.set_sharp_from_angle(angle=math.radians(sharp_deg))
    if not weighted:
        return o
    mod = o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    mod.mode = 'FACE_AREA'
    mod.keep_sharp = True
    dg = bpy.context.evaluated_depsgraph_get()
    baked = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    old = o.data
    o.modifiers.clear()
    o.data = baked
    baked.name = old.name
    bpy.data.meshes.remove(old)
    return o


def bake_ao(objects, distance=1.0, samples=48, ground=True):
    """Cycles AO baked into a temporary point colour attribute; returns {obj: [ao,...]}."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.cycles.device = 'CPU'
    sc.world.light_settings.distance = distance
    plane = None
    if ground:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40)
        plane = obj_from_bm(None, f'{TAG} ground', bm, [])
    for o in sc.objects:
        o.select_set(False)
    for o in objects:
        attr = o.data.color_attributes.get('AO') or o.data.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT')
        o.data.color_attributes.active_color = attr
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    result = {}
    for o in objects:
        attr = o.data.color_attributes['AO']
        result[o] = [d.color[0] for d in attr.data]
        o.data.color_attributes.remove(attr)
    if plane:
        bpy.data.objects.remove(plane, do_unlink=True)
    return result


def paint(o, fn, ao=None, ao_strength=0.85):
    """Point-domain COLOR_0 = procedural paint(co, normal, part) x baked occlusion.

    `part` is the per-vertex integer written by merge(..., part) (0 when untagged); the
    helper attribute is removed afterwards so it never reaches the GLB."""
    me = o.data
    parts = [0] * len(me.vertices)
    if 'part' in me.attributes:
        me.attributes['part'].data.foreach_get('value', parts)
        me.attributes.remove(me.attributes['part'])
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    normals = [v.normal for v in me.vertices]
    flat = []
    for i, v in enumerate(me.vertices):
        r, g, b = fn(v.co, normals[i], parts[i])
        k = 1.0
        if ao is not None:
            k = 1.0 - ao_strength * (1.0 - ao[i])
        flat += [max(0, min(1, r * k)), max(0, min(1, g * k)), max(0, min(1, b * k)), 1.0]
    attr.data.foreach_set('color', flat)
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = me.color_attributes.find('Col')


def fbm(p, octaves=3):
    return noise.fractal(Vector(p), 1.0, 2.0, octaves, noise_basis='PERLIN_ORIGINAL')


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def smooth01(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def fractured_rock(bm, seed, scale, subdiv=2, cuts=7, rough=0.16, flat=0.8):
    """Icosphere broken by random cleavage planes: the classic faceted stylised rock."""
    rng = random.Random(seed)
    ret = bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    verts = ret['verts']
    off = Vector((rng.uniform(-50, 50), rng.uniform(-50, 50), rng.uniform(-50, 50)))
    for v in verts:
        v.co += v.co.normalized() * fbm(v.co * 1.4 + off) * rough
    planes = []
    for _ in range(cuts):
        n = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-.35, 1))).normalized()
        planes.append((n, rng.uniform(flat - .1, flat + .08)))
    for v in verts:
        for n, d in planes:
            h = v.co.dot(n)
            if h > d:
                v.co -= n * (h - d)
    for v in verts:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    return verts


# ---------------------------------------------------------------- pine
def build_pine(root, low=False):
    rng = random.Random(11)
    bark = material('Cedar', (0.19, 0.105, 0.06), 0.88)
    needles = material('Pine', (0.19, 0.36, 0.11), 0.8)
    # Trunk with root flare, slightly bent.
    bm = bmesh.new()
    rings = [(-0.12, 0.36), (0.10, 0.27), (0.38, 0.19), (1.4, 0.15), (2.6, 0.10), (3.5, 0.06), (4.1, 0.025)]
    sides = 6 if low else 8
    loops = []
    for z, r in rings:
        bend = Vector((0.05 * math.sin(z * 0.9), 0.035 * math.sin(z * 0.6 + 1), 0)) * smooth01((3.6 - z) / 1.5)
        loop = []
        for s in range(sides):
            a = s / sides * math.tau
            rr = r * (1 + (0.22 if z < 0.2 and s % 2 == 0 else 0) + rng.uniform(-.05, .05))
            loop.append(bm.verts.new((math.cos(a) * rr + bend.x, math.sin(a) * rr + bend.y, z)))
        loops.append(loop)
    for a, b in zip(loops, loops[1:]):
        for s in range(sides):
            bm.faces.new((a[s], a[(s + 1) % sides], b[(s + 1) % sides], b[s]))
    bm.faces.new(list(reversed(loops[0])))
    top = bm.verts.new((0, 0, 4.2))
    for s in range(sides):
        bm.faces.new((loops[-1][s], loops[-1][(s + 1) % sides], top))
    trunk = obj_from_bm(root, 'Pine trunk', bm, [bark])

    # Drooping star-shaped whorls (convex top, concave underside, jittered tips).
    # Each main whorl carries a smaller half-step-rotated secondary whorl that
    # fills the gaps between branch tips so the crown reads dense, not stacked.
    bm = bmesh.new()
    main = [(1.52, 1.42, 10), (1.30, 1.90, 10), (1.08, 2.36, 9), (0.87, 2.80, 8), (0.66, 3.22, 7), (0.46, 3.62, 6), (0.28, 3.98, 5)]
    tiers = []
    for R, zc, n in main:
        n = max(5, n - 3) if low else n
        spin = rng.uniform(0, math.tau)
        tiers.append((R, zc, n, spin, 1.0))
        if R > 0.4 and not low:  # the mobile tier keeps only the main whorls
            tiers.append((R * 0.8, zc + 0.23, n, spin + math.pi / n, 0.82))
    for R, zc, n, spin, sag in tiers:
        droop = (0.50 + 0.36 * R) * sag
        cx, cy = rng.uniform(-.04, .04), rng.uniform(-.04, .04)
        centre = bm.verts.new((cx, cy, zc + 0.10))
        mid, outer, under = [], [], []
        for k in range(2 * n):
            a = spin + k / (2 * n) * math.tau + rng.uniform(-.06, .06)
            tip = k % 2 == 0
            rk = R * (rng.uniform(.9, 1.1) if tip else rng.uniform(.56, .66))
            dk = droop * (rng.uniform(.9, 1.12) if tip else .62)
            ca, sa = math.cos(a), math.sin(a)
            mid.append(bm.verts.new((cx + ca * rk * .5, cy + sa * rk * .5, zc + .02 - dk * .30)))
            outer.append(bm.verts.new((cx + ca * rk, cy + sa * rk, zc - dk + (0.06 if tip else 0))))
            under.append(bm.verts.new((cx + ca * rk * .72, cy + sa * rk * .72, zc - dk * .80 - 0.12)))
        bottom = bm.verts.new((cx, cy, zc - droop * .62))
        m = 2 * n
        for k in range(m):
            j = (k + 1) % m
            bm.faces.new((centre, mid[k], mid[j]))
            bm.faces.new((mid[k], outer[k], outer[j], mid[j]))
            bm.faces.new((outer[k], under[k], under[j], outer[j]))
            bm.faces.new((under[k], bottom, under[j]))
    # Slender leader shoot rising out of the top whorl.
    base = [bm.verts.new((math.cos(a) * .11, math.sin(a) * .11, 3.9)) for a in (i / 5 * math.tau for i in range(5))]
    tip = bm.verts.new((0.015, 0.0, 4.78))
    for i in range(5):
        bm.faces.new((base[i], base[(i + 1) % 5], tip))
    bm.faces.new(list(reversed(base)))
    canopy = obj_from_bm(root, 'Pine needles', bm, [needles])
    fix_normals(canopy)

    ao = bake_ao([trunk, canopy], distance=1.4)
    seed = Vector((3.1, 7.7, 1.3))

    def needle(co, no, part):
        radial = Vector((co.x, co.y, 0)).length
        reach = smooth01(radial / 1.4)
        height = smooth01((co.z - 0.7) / 4.0)
        tint = lerp((0.20, 0.34, 0.40), (1.0, 1.0, 0.84), 0.2 + 0.6 * reach + 0.2 * height)
        under = 0.5 if no.z < -0.2 else 1.0
        n = 0.9 + 0.1 * fbm(co * 2.3 + seed)
        return tuple(c * under * n for c in tint)

    def wood(co, no, part):
        n = 0.82 + 0.18 * fbm(Vector((co.x * 9, co.y * 9, co.z * 0.8)))
        moss = smooth01((0.5 - co.z) / 0.5) * 0.35
        return lerp((n, n * 0.96, n * 0.9), (0.55, 0.75, 0.45), moss)

    paint(canopy, needle, ao[canopy], 0.9)
    paint(trunk, wood, ao[trunk], 0.7)


def fix_normals(o):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
    for p in o.data.polygons:
        p.use_smooth = True


# ---------------------------------------------------------------- shared geometry
def merge(dst, src, part=None):
    """Append src into dst (freeing src), optionally tagging every new vertex with `part`."""
    layer = None
    if part is not None:
        layer = dst.verts.layers.int.get('part') or dst.verts.layers.int.new('part')
    src.verts.index_update()
    new = [dst.verts.new(v.co) for v in src.verts]
    if layer is not None:
        for v in new:
            v[layer] = part
    for f in src.faces:
        dst.faces.new([new[v.index] for v in f.verts])
    src.free()
    return dst


def block(lo, hi, bevel=0.0, jitter=0.0, rng=None, tilt=(0.0, 0.0, 0.0)):
    """Box between two corners, optionally chamfered, chiselled and tilted."""
    from mathutils import Euler
    lo, hi = Vector(lo), Vector(hi)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=hi - lo, verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.verts) + list(bm.edges), offset=bevel, offset_type='OFFSET',
                        segments=1, profile=0.5, affect='EDGES', clamp_overlap=True)
    if jitter:
        for v in bm.verts:
            v.co += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * jitter
    if any(tilt):
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler(tilt).to_matrix())
    bmesh.ops.translate(bm, vec=(hi + lo) / 2, verts=bm.verts)
    return bm


def lathe(profile, segments, phase=0.0):
    """Surface of revolution from (radius, z) pairs; radius 0 collapses to a pole."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r <= 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((math.cos(phase + s / segments * math.tau) * r,
                                        math.sin(phase + s / segments * math.tau) * r, z)) for s in range(segments)])
    for a, b in zip(rings, rings[1:]):
        for s in range(segments):
            t = (s + 1) % segments
            if len(a) == 1:
                bm.faces.new((a[0], b[t], b[s]))
            elif len(b) == 1:
                bm.faces.new((a[s], a[t], b[0]))
            else:
                bm.faces.new((a[s], a[t], b[t], b[s]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def facing(bm, face, direction):
    bm.normal_update()
    if face.normal.dot(Vector(direction)) < 0:
        face.normal_flip()


# ---------------------------------------------------------------- concrete barricade
def build_barricade(root, low=False):
    """Precast F-shape safety barrier: toe, slope break, steep face, chamfered crown and ends."""
    concrete = material('Concrete', (0.50, 0.49, 0.46), 0.88)
    steel = material('Gunmetal', (0.19, 0.20, 0.20), 0.42, 0.75, vcol=False)
    hazard = material('Supply', (0.86, 0.36, 0.05), 0.45, vcol=False)
    slope, crown = (0.40, 0.27), (0.215, 1.30)

    def face_y(z):
        return slope[0] + (crown[0] - slope[0]) * (z - slope[1]) / (crown[1] - slope[1])

    half = [(0.575, 0.0), (0.575, 0.085), slope] + [(face_y(z), z) for z in (0.55, 0.85, 1.1)] + \
           [crown, (0.17, 1.39), (0.12, 1.42)]
    loop = half + [(-y, z) for y, z in reversed(half)]
    span = 6 if low else 16
    stations = [-1.55] + [-1.5 + 3.0 * i / span for i in range(span + 1)] + [1.55]
    bm = bmesh.new()
    rings = []
    for x in stations:
        end = abs(x) > 1.52
        rings.append([bm.verts.new((x, y * (0.93 if end else 1), z * (0.975 if end else 1))) for y, z in loop])
    n = len(loop)
    for a, b in zip(rings, rings[1:]):
        for k in range(n - 1):  # the underside strip is never visible
            bm.faces.new((a[k], b[k], b[k + 1], a[k + 1]))
    caps = [bm.faces.new(list(reversed(rings[0]))), bm.faces.new(rings[-1])]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=caps, ngon_method='EAR_CLIP')
    body = obj_from_bm(root, 'Barrier casting', bm, [concrete])
    harden(body, sharp_deg=25)

    # Rebar lifting loops on the crown and steel connector plates on both ends.
    sb = bmesh.new()
    for x0 in (-0.9, 0.9):
        R, r, steps, sides = (0.10, 0.021, 5, 4) if low else (0.10, 0.021, 9, 5)
        rings = []
        for i in range(steps + 1):
            th = math.pi * i / steps
            c = Vector((x0 + R * math.cos(th), 0, 1.395 + R * math.sin(th)))
            n1, n2 = Vector((math.cos(th), 0, math.sin(th))), Vector((0, 1, 0))
            rings.append([sb.verts.new(c + r * (math.cos(p) * n1 + math.sin(p) * n2))
                          for p in (k / sides * math.tau for k in range(sides))])
        for a, b in zip(rings, rings[1:]):
            for k in range(sides):
                sb.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))
    for side in (-1, 1):
        merge(sb, block((side * 1.548 - 0.018, -0.12, 0.52), (side * 1.548 + 0.018, 0.12, 0.98), bevel=0.008))
    bmesh.ops.recalc_face_normals(sb, faces=sb.faces)
    hardware = obj_from_bm(root, 'Lifting loops and pins', sb, [steel])
    harden(hardware, sharp_deg=40)

    # Bake before the decals exist so they cannot cast occlusion blotches.
    ao = bake_ao([body, hardware], distance=0.9)

    # Retro-reflective hazard chevrons laid onto both steep faces.
    hb = bmesh.new()
    for side in (-1, 1):
        for x0 in (-0.95, 0.0, 0.95):
            for dx in ((-0.1, 0.1) if low else (-0.15, 0.0, 0.15)):
                pts = [(x0 + dx - 0.05, 0.94), (x0 + dx + 0.03, 0.94), (x0 + dx + 0.13, 1.20), (x0 + dx + 0.05, 1.20)]
                f = hb.faces.new([hb.verts.new((x, side * (face_y(z) + 0.008), z)) for x, z in pts])
                facing(hb, f, (0, side, 0.18))
    obj_from_bm(root, 'Hazard chevrons', hb, [hazard], smooth=False)

    def weathering(co, no, part):
        mott = 0.93 + 0.07 * fbm((co.x * 1.1, co.y * 1.1, co.z * 1.1 + 3))
        fine = 1 + 0.04 * fbm((co.x * 7, co.y * 7, co.z * 7))
        c = (mott * fine,) * 3
        c = lerp(c, (0.58, 0.50, 0.40), 0.75 * smooth01((0.5 - co.z) / 0.45))  # road splash
        if abs(no.y) > 0.4:  # rain streaks run down the faces from the crown
            streak = smooth01((fbm((co.x * 3.2, 0.5, 0.0)) - 0.1) / 0.35) * smooth01((co.z - 0.45) / 0.5)
            c = tuple(v * (1 - 0.22 * streak) for v in c)
        if co.z > 1.38:
            c = tuple(min(1.0, v * 1.04) for v in c)
        return c

    paint(body, weathering, ao[body], 0.9)


# ---------------------------------------------------------------- stone wall
def build_stonewall(root, low=False):
    """Coursed fieldstone: staggered chiselled blocks over a dark mortar core, capstone course."""
    rng = random.Random(5)
    granite = material('Granite', (0.42, 0.405, 0.375), 0.9)
    L, D, gap = 6.0, 1.40, 0.045
    bm = bmesh.new()

    def cuts(start_short):
        xs, x = [-L / 2], -L / 2
        if start_short:
            x += rng.uniform(0.32, 0.55)
            xs.append(x)
        while L / 2 - x > 1.25:
            x += rng.uniform(0.62, 1.2)
            xs.append(x)
        if L / 2 - x < 0.4 and len(xs) > 1:
            xs.pop()
        xs.append(L / 2)
        return xs

    stone = 1
    for ci, (z0, h) in enumerate([(0.0, 0.58), (0.62, 0.52), (1.18, 0.48)]):
        xs = cuts(ci % 2 == 1)
        for a, b in zip(xs, xs[1:]):
            lo = (a + (gap / 2 if a > -L / 2 else 0.01), -D / 2 + rng.uniform(0, 0.045), z0 + (gap / 2 if z0 else -0.03))
            hi = (b - (gap / 2 if b < L / 2 else 0.01), D / 2 - rng.uniform(0, 0.045), z0 + h - gap / 2)
            tilt = (rng.uniform(-.012, .012), rng.uniform(-.015, .015), rng.uniform(-.01, .01))
            merge(bm, block(lo, hi, bevel=0 if low else 0.05, jitter=0.013, rng=rng, tilt=tilt), stone)
            stone += 1
    xs = [-L / 2 - 0.05]
    while L / 2 + 0.05 - xs[-1] > 1.45:
        xs.append(xs[-1] + rng.uniform(1.0, 1.35))
    xs.append(L / 2 + 0.05)
    for a, b in zip(xs, xs[1:]):
        lo = (a + 0.02, -D / 2 - 0.06, 1.672)
        hi = (b - 0.02, D / 2 + 0.06, 1.672 + rng.uniform(0.2, 0.24))
        merge(bm, block(lo, hi, bevel=0 if low else 0.04, jitter=0.01, rng=rng, tilt=(rng.uniform(-.01, .01), rng.uniform(-.012, .012), 0)), stone)
        stone += 1
    merge(bm, block((-L / 2 + 0.03, -D / 2 + 0.07, 0.0), (L / 2 - 0.03, D / 2 - 0.07, 1.66)), -1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    wall = obj_from_bm(root, 'Coursed stone', bm, [granite])
    harden(wall, sharp_deg=30 if low else None)  # unbevelled mobile blocks need hard corners
    ao = bake_ao([wall], distance=0.6)
    tints = [(1.0, 0.96, 0.90), (0.84, 0.85, 0.87), (0.74, 0.71, 0.66), (0.97, 0.90, 0.78), (0.66, 0.66, 0.65), (0.90, 0.83, 0.74), (0.80, 0.77, 0.70)]

    def masonry(co, no, part):
        if part < 0:
            return (0.30, 0.29, 0.27)
        t = tints[(part * 5 + part // 3) % len(tints)]
        n = 0.86 + 0.14 * fbm(co * 3.1 + Vector((part * 1.7, 0, 0)))
        c = tuple(v * n for v in t)
        c = lerp(c, (0.42, 0.50, 0.30), 0.7 * smooth01((0.55 - co.z) / 0.55))  # damp moss at the foot
        c = lerp(c, (0.50, 0.46, 0.40), 0.35 * smooth01((fbm(co * 0.9 + Vector((3, 3, 3))) - 0.1) / 0.3))  # soot and rain
        if no.z > 0.6 and fbm(co * 1.7 + Vector((9, 1, 4))) > 0.1:
            c = lerp(c, (0.72, 0.78, 0.46), 0.55)  # lichen on the weathered tops
        return c

    paint(wall, masonry, ao[wall], 0.95)


# ---------------------------------------------------------------- fuel drum
def build_barrel(root, low=False):
    """200 L steel drum: rolled chimes, two rolling hoops, recessed lid, bungs and hazard labels."""
    drum = material('Fuel', (1.0, 1.0, 1.0), 0.42, 0.35)  # paint and labels live in COLOR_0
    steel = material('Gunmetal', (0.22, 0.23, 0.23), 0.38, 0.8, vcol=False)
    R = 0.44
    prof = [(0, 0.012), (0.40, 0.012), (0.43, 0.0), (0.466, 0.02), (0.466, 0.055), (R, 0.075),
            (R, 0.40), (0.463, 0.428), (0.463, 0.468), (R, 0.496),
            (R, 0.886), (0.463, 0.914), (0.463, 0.954), (R, 0.982),
            (R, 1.305), (0.466, 1.328), (0.466, 1.372), (0.437, 1.398), (0.412, 1.372), (0.412, 1.347), (0, 1.347)]
    if low:  # same silhouette with single-step chimes and hoops; labels sit mid-facet
        prof = [(0, 0.0), (0.462, 0.0), (0.462, 0.07), (R, 0.08), (R, 0.42), (0.462, 0.448), (R, 0.476),
                (R, 0.906), (0.462, 0.934), (R, 0.962), (R, 1.31), (0.462, 1.37), (0.43, 1.398), (0.41, 1.347), (0, 1.347)]
    bm = lathe(prof, 12, phase=math.pi / 12) if low else lathe(prof, 24)
    # Hazard diamonds conform to the curved shell (border ring + fill grid, separate vertices).
    grid = 1 if low else 3
    for a0 in (-math.pi / 2, math.pi / 2):
        def on_drum(s, t, scale, lift):
            da, dz = (s - t) * 0.08 * scale, (s + t) * 0.08 * scale
            rr = R + lift
            a = a0 + da / rr
            return (math.cos(a) * rr, math.sin(a) * rr, 0.69 + dz)
        lb = bmesh.new()
        ring = [(-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0)]
        outer = [lb.verts.new(on_drum(s, t, 1.0, 0.004)) for s, t in ring]
        inner = [lb.verts.new(on_drum(s, t, 0.8, 0.004)) for s, t in ring]
        for k in range(8):
            f = lb.faces.new((outer[k], outer[(k + 1) % 8], inner[(k + 1) % 8], inner[k]))
            facing(lb, f, (math.cos(a0), math.sin(a0), 0))
        merge(bm, lb, 2)
        fb = bmesh.new()
        g = [[fb.verts.new(on_drum(-1 + 2 * i / grid, -1 + 2 * j / grid, 0.8, 0.005)) for j in range(grid + 1)] for i in range(grid + 1)]
        for i in range(grid):
            for j in range(grid):
                f = fb.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
                facing(fb, f, (math.cos(a0), math.sin(a0), 0))
        merge(bm, fb, 3)
    shell = obj_from_bm(root, 'Drum shell', bm, [drum])
    harden(shell)  # weighted normals alone keep the rolled edges crisp without splitting vertices
    sb = bmesh.new()
    for (x, y), (r, h) in (((0.22, 0.10), (0.062, 0.03)), ((-0.24, -0.12), (0.042, 0.022))):
        cap = lathe([(0, 1.347 + h), (r, 1.347 + h), (r, 1.338)], 4 if low else 6)
        bmesh.ops.translate(cap, vec=(x, y, 0), verts=cap.verts)
        merge(sb, cap)
    bungs = obj_from_bm(root, 'Bungs', sb, [steel])
    harden(bungs, sharp_deg=40)
    ao = bake_ao([shell, bungs], distance=0.5)
    red = (0.62, 0.075, 0.035)

    def paintwork(co, no, part):
        if part == 2:
            return (0.035, 0.035, 0.035)
        if part == 3:
            return (0.97, 0.66, 0.06)
        r, a = math.hypot(co.x, co.y), math.atan2(co.y, co.x)
        n = 0.92 + 0.08 * fbm((co.x * 4, co.y * 4, co.z * 4))
        c = tuple(v * n for v in red)
        if r > 0.452:  # hoops and chimes are scuffed to bare steel
            c = lerp(c, (0.30, 0.28, 0.27), 0.5)
        if co.z > 1.34 and r < 0.43:
            c = lerp(c, (0.50, 0.30, 0.25), 0.25)
        streak = smooth01((fbm((math.cos(a) * 2.6, math.sin(a) * 2.6, 7.0)) - 0.05) / 0.3) * smooth01((co.z - 0.35) / 0.9)
        c = lerp(c, (0.30, 0.10, 0.05), 0.45 * streak)
        return lerp(c, (0.20, 0.13, 0.09), 0.65 * smooth01((0.28 - co.z) / 0.28))

    paint(shell, paintwork, ao[shell], 0.8)


# ---------------------------------------------------------------- volcanic rock
def basalt_normal_map(size=64, seed=9):
    """Tileable fractured-plate normal map (periodic Voronoi cracks + integer-frequency grain)."""
    name = f'{TAG} Basalt Normal'
    if name in bpy.data.images:
        bpy.data.images.remove(bpy.data.images[name])
    rng = random.Random(seed)
    pts = [(rng.random(), rng.random()) for _ in range(18)]
    waves = [(rng.randint(-5, 5), rng.randint(-5, 5), rng.uniform(0, math.tau), rng.uniform(.3, 1)) for _ in range(8)]
    heights = []
    for y in range(size):
        for x in range(size):
            u, v = (x + .5) / size, (y + .5) / size
            d1 = d2 = 9.0
            for px, py in pts:
                dx, dy = abs(u - px), abs(v - py)
                d = math.hypot(min(dx, 1 - dx), min(dy, 1 - dy))
                if d < d1:
                    d1, d2 = d, d1
                elif d < d2:
                    d2 = d
            grain = sum(a * math.sin(math.tau * (m * u + k * v) + p) for m, k, p, a in waves) / 8
            heights.append(0.4 * smooth01((d2 - d1) / 0.035) + 0.6 * (0.5 + 0.5 * grain))
    px = []
    for y in range(size):
        for x in range(size):
            h = lambda xx, yy: heights[(yy % size) * size + (xx % size)]
            n = Vector((-(h(x + 1, y) - h(x - 1, y)) * 2.2, -(h(x, y + 1) - h(x, y - 1)) * 2.2, 1)).normalized()
            px += [n.x * .5 + .5, n.y * .5 + .5, n.z * .5 + .5, 1.0]
    img = bpy.data.images.new(name, size, size, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(px)
    img.pack()
    return img


def build_volcanic_rock(root, low=False):
    """Fractured basalt bomb with cleavage facets, ash-dusted tops and glowing fissures."""
    basalt = material('Basalt', (0.23, 0.22, 0.235), 0.9, normal=basalt_normal_map(), normal_strength=0.6)
    lava = material('MoltenRock', (1.0, 0.24, 0.03), 0.45, emission=1.6, vcol=False)
    bm = bmesh.new()
    fractured_rock(bm, 41, (1.2, 0.98, 1.15), subdiv=3 if low else 4, cuts=13, rough=0.12, flat=0.74)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(5), verts=bm.verts[:], edges=bm.edges[:])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.normal_update()
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        ax = max(range(3), key=lambda i: abs(f.normal[i]))
        for l in f.loops:
            c = l.vert.co
            l[uv].uv = Vector((c.y, c.z) if ax == 0 else (c.x, c.z) if ax == 1 else (c.x, c.y)) * 2.2
    tree = BVHTree.FromBMesh(bm)
    rock = obj_from_bm(root, 'Basalt bomb', bm, [basalt])
    harden(rock)  # facets are planar already; weighted normals keep them flat without seams

    rng = random.Random(77)
    lb = bmesh.new()
    crack_points = []
    for _ in range(3):
        d0 = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.2, 1))).normalized()
        axis = d0.cross(Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))).normalized()
        arc, steps, pts = rng.uniform(1.3, 2.0), 7 if low else 10, []
        for i in range(steps + 1):
            d = Matrix.Rotation(-arc / 2 + arc * i / steps, 3, axis) @ d0
            d = (d + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.07).normalized()
            loc, nrm, _, _ = tree.ray_cast(Vector((0, 0, 0)), d)
            if loc is not None:
                pts.append((loc, nrm))
        if len(pts) < 3:
            continue
        row = []
        for i, (p, nrm) in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)][0] - pts[max(i - 1, 0)][0]).normalized()
            side = nrm.cross(t).normalized()
            w = 0.055 * (1 - 0.75 * abs(2 * i / (len(pts) - 1) - 1)) + 0.012
            row.append((lb.verts.new(p + side * w + nrm * 0.014), lb.verts.new(p - side * w + nrm * 0.014)))
            crack_points.append(p)
        for (a, b), (c, d) in zip(row, row[1:]):
            f = lb.faces.new((a, c, d, b))
            facing(lb, f, (a.co + d.co) / 2)
    veins = obj_from_bm(root, 'Molten fissures', lb, [lava])
    ao = bake_ao([rock, veins], distance=0.6, ground=False)

    def basalt_paint(co, no, part):
        n = 0.8 + 0.2 * fbm(co * 2.2 + Vector((4, 1, 7)))
        c = lerp((0.52 * n, 0.50 * n, 0.53 * n), (0.80, 0.76, 0.72), 0.3 * smooth01((no.z - 0.35) / 0.5))
        heat = min((co - p).length for p in crack_points) if crack_points else 9
        return lerp(c, (0.85, 0.36, 0.22), 0.45 * smooth01((0.16 - heat) / 0.16))

    paint(rock, basalt_paint, ao[rock], 0.8)


# ---------------------------------------------------------------- concrete landmark
LANDMARK_HEIGHTS = [3.3, 3.55, 3.15, 3.45, 3.05, 3.35]  # runtime climb height follows the tallest


def chamfer_ring(a, b, c, per_side):
    """Rectangle of half-size (a, b) with 45-degree corner chamfers, `per_side` spans per side."""
    sides = [((a, -b + c), (a, b - c)), ((a - c, b), (-a + c, b)), ((-a, b - c), (-a, -b + c)), ((-a + c, -b), (a - c, -b))]
    return [(x0 + (x1 - x0) * i / per_side, y0 + (y1 - y0) * i / per_side)
            for (x0, y0), (x1, y1) in sides for i in range(per_side + 1)]


def build_concrete_block(root, low=False):
    """Destructible route landmark replacing hills and basalt outcrops: a 3 x 2 cluster of
    square precast blocks on the old 14 x 10 m footprint. One material, so every landmark on
    a map is a single instanced draw per detail tier."""
    concrete = material('Concrete', (0.50, 0.49, 0.46), 0.9)
    cols, rows, W, D, gap, edge = 3, 2, 14.0, 10.0, 0.12, 0.16
    per_side = 1 if low else 3
    bm = bmesh.new()
    for k, h in enumerate(LANDMARK_HEIGHTS):
        cx = -W / 2 + (k % cols + 0.5) * W / cols
        cy = -D / 2 + (k // cols + 0.5) * D / rows
        a, b = W / cols / 2 - gap / 2, D / rows / 2 - gap / 2
        # Rings: foot, splash line, start of the top chamfer, chamfered rim, inner top ring.
        levels = [(0.0, a, b), (h - edge, a, b), (h, a - edge, b - edge)] if low else \
                 [(0.0, a, b), (0.9, a, b), (h - edge, a, b), (h, a - edge, b - edge), (h, (a - edge) * 0.55, (b - edge) * 0.55)]
        tmp = bmesh.new()
        rings = [[tmp.verts.new((cx + x, cy + y, z)) for x, y in chamfer_ring(ra, rb, edge, per_side)] for z, ra, rb in levels]
        n = len(rings[0])
        for lo_ring, hi_ring in zip(rings, rings[1:]):
            for i in range(n):
                tmp.faces.new((lo_ring[i], lo_ring[(i + 1) % n], hi_ring[(i + 1) % n], hi_ring[i]))
        cap = tmp.faces.new(rings[-1])
        bmesh.ops.triangulate(tmp, faces=[cap])
        bmesh.ops.recalc_face_normals(tmp, faces=tmp.faces)
        merge(bm, tmp, k + 1)
        if not low:  # cast-in rebar lifting loop on each block
            lb = bmesh.new()
            R, r, steps, sides = 0.2, 0.035, 6, 4
            loops = []
            for i in range(steps + 1):
                th = math.pi * i / steps
                c = Vector((cx + R * math.cos(th), cy + 0.6, h - 0.02 + R * math.sin(th)))
                n1, n2 = Vector((math.cos(th), 0, math.sin(th))), Vector((0, 1, 0))
                loops.append([lb.verts.new(c + r * (math.cos(p) * n1 + math.sin(p) * n2)) for p in (j / sides * math.tau for j in range(sides))])
            for p, q in zip(loops, loops[1:]):
                for j in range(sides):
                    lb.faces.new((p[j], p[(j + 1) % sides], q[(j + 1) % sides], q[j]))
            bmesh.ops.recalc_face_normals(lb, faces=lb.faces)
            merge(bm, lb, -1)
    block = obj_from_bm(root, 'Precast blocks', bm, [concrete])
    harden(block, sharp_deg=30 if low else None)
    ao = bake_ao([block], distance=1.2)
    rng = random.Random(19)
    tints = [(1.0, 0.98, 0.94), (0.92, 0.92, 0.93), (0.97, 0.94, 0.88), (0.88, 0.88, 0.87), (1.0, 0.96, 0.90), (0.93, 0.91, 0.86)]
    rng.shuffle(tints)

    def weathering(co, no, part):
        if part < 0:
            return (0.30, 0.17, 0.10)  # rusted rebar
        t = tints[(part - 1) % len(tints)]
        mott = 0.9 + 0.1 * fbm((co.x * 0.5, co.y * 0.5, co.z * 0.5 + part))
        c = tuple(v * mott * (1 + 0.04 * fbm(co * 3.3)) for v in t)
        c = lerp(c, (0.54, 0.47, 0.38), 0.85 * smooth01((1.0 - co.z) / 0.9))  # road splash
        if no.z < 0.5:  # rain streaks run down from the rims
            streak = smooth01((fbm(((co.x + co.y) * 1.3, 0.0, 3.0)) - 0.1) / 0.35) * smooth01((co.z - 0.5) / 2.2)
            c = tuple(v * (1 - 0.3 * streak) for v in c)
        elif fbm((co.x * 0.7, co.y * 0.7, 9.0)) > 0.25:
            c = lerp(c, (0.62, 0.63, 0.52), 0.35)  # damp stains on the tops
        return c

    paint(block, weathering, ao[block], 0.9)


# ---------------------------------------------------------------- transport aircraft
def build_airlift(root, low=False):
    """'Condor' tandem-rotor transport for Large skirmish maps. Node contract used at runtime:
    Hull (fuselage), Turret/Muzzle (empty nose mount, needed by the unit rig), Rotor0 (fore) and
    Rotor1 (aft, higher) spin, Ramp (rear hinge, rotation about X opens it). Armor, Trim and
    Signal take each team's paint; the nose faces Blender -Y like every other vehicle."""
    armor = material('Armor', (0.36, 0.38, 0.33), 0.6, 0.2)
    trim = material('Trim', (0.62, 0.58, 0.46), 0.5, 0.25, vcol=False)
    signal = material('Signal', (1.0, 0.36, 0.2), 0.4, emission=1.2, vcol=False)
    glass = material('Glass', (0.04, 0.08, 0.1), 0.12, 0.45, vcol=False)
    metal = material('Gunmetal', (0.16, 0.17, 0.18), 0.4, 0.75, vcol=False)
    blade = material('RotorBlade', (0.07, 0.075, 0.08), 0.55, 0.3, vcol=False)
    seg = 8 if low else 14
    bev = 0 if low else .18
    hull = empty('Hull'); hull.parent = root
    turret = empty('Turret'); turret.parent = root; turret.location = (0, -5.2, 1.2)
    muzzle = empty('Muzzle'); muzzle.parent = turret; muzzle.location = (0, -.5, 0)

    # Cargo cabin, tapered glazed nose, raised aft rotor pylon, fore rotor mast and side sponsons.
    body = bmesh.new()
    merge(body, block((-1.2, -3.6, .45), (1.2, 4.6, 2.95), bevel=bev))
    nose = block((-1.1, -5.4, .65), (1.1, -3.55, 2.75), bevel=0 if low else .14)
    for v in nose.verts:
        if v.co.y < -4.6:
            v.co.x *= .72
            v.co.z = 1.9 + (v.co.z - 1.7) * .55
    merge(body, nose)
    merge(body, block((-.9, 2.7, 2.85), (.9, 5.0, 4.15), bevel=0 if low else .16))
    merge(body, block((-.55, -4.15, 2.85), (.55, -2.95, 3.4), bevel=0 if low else .1))
    for side in (-1, 1):
        merge(body, block((side * 1.18 - .01 if side > 0 else -1.8, -2.7, .5), (1.8 if side > 0 else -1.18 + .01, 2.7, 1.35), bevel=0 if low else .16))
    merge(body, block((-1.21, 4.55, .5), (1.21, 4.72, 2.9)), 1)  # rear frame around the ramp opening
    bmesh.ops.recalc_face_normals(body, faces=body.faces)
    shell = obj_from_bm(hull, 'Fuselage', body, [armor])
    harden(shell, sharp_deg=None if not low else 35)

    tb = bmesh.new()  # trim: side stripes and engine intake rings
    for side in (-1, 1):
        merge(tb, block((side * 1.215 - .02, -3.4, 2.05), (side * 1.215 + .02, 4.4, 2.3)))
        ring = lathe([(0, .02), (.44, .02), (.44, -.02), (0, -.02)], seg)
        bmesh.ops.rotate(ring, verts=ring.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
        bmesh.ops.translate(ring, vec=(side * 1.3, 2.45, 3.62), verts=ring.verts)
        merge(tb, ring)
    obj_from_bm(hull, 'Stripes', tb, [trim], smooth=False)

    mb = bmesh.new()  # engines, gear, rotor masts
    for side in (-1, 1):
        nac = lathe([(0, -1.1), (.36, -1.1), (.42, -.8), (.42, .9), (.3, 1.15), (0, 1.15)], seg)
        bmesh.ops.rotate(nac, verts=nac.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
        bmesh.ops.translate(nac, vec=(side * 1.3, 3.55, 3.62), verts=nac.verts)
        merge(mb, nac)
        for y in (-3.2, 2.4):
            wheel = lathe([(0, -.13), (.32, -.13), (.32, .13), (0, .13)], seg)
            bmesh.ops.rotate(wheel, verts=wheel.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'))
            bmesh.ops.translate(wheel, vec=(side * 1.45, y, .32), verts=wheel.verts)
            merge(mb, wheel)
            merge(mb, block((side * 1.45 - .06, y - .06, .32), (side * 1.45 + .06, y + .06, .62)))
    for x, y, z0, z1 in ((0, -3.55, 3.35, 3.7), (0, 3.9, 4.1, 4.55)):
        mast = lathe([(0, z0), (.2, z0), (.16, z1), (0, z1)], seg)
        bmesh.ops.translate(mast, vec=(x, y, 0), verts=mast.verts)
        merge(mb, mast)
    obj_from_bm(hull, 'Engines', mb, [metal])

    gb = bmesh.new()  # cockpit glazing and cabin windows
    windshield = block((-.78, -5.3, 1.72), (.78, -5.22, 2.18), tilt=(math.radians(-35), 0, 0))
    merge(gb, windshield)
    for side in (-1, 1):
        merge(gb, block((side * .98 - .03, -5.05, 1.7), (side * .98 + .03, -4.2, 2.2), tilt=(0, 0, side * math.radians(-12))))
        if not low:
            for y in (-2.2, -.9, .4, 1.7):
                merge(gb, block((side * 1.215 - .02, y - .3, 1.55), (side * 1.215 + .02, y + .3, 1.9)))
    obj_from_bm(hull, 'Glazing', gb, [glass], smooth=False)

    sb = bmesh.new()  # navigation lights and the aft beacon
    for side in (-1, 1):
        merge(sb, block((side * 1.8 - .08, -2.75, .95), (side * 1.8 + .08, -2.55, 1.1)))
    merge(sb, block((-.12, 4.6, 4.15), (.12, 4.85, 4.3)))
    obj_from_bm(hull, 'Lights', sb, [signal], smooth=False)

    # Rotors: three blades each; the aft rotor sits higher so the discs overlap without touching.
    for name, hub, phase in (('Rotor0', (0, -3.55, 3.75), 0.0), ('Rotor1', (0, 3.9, 4.6), math.pi / 3)):
        pivot = empty(name); pivot.parent = hull; pivot.location = hub  # yaw with the hull
        bb = bmesh.new()
        for k in range(3):
            b = block((.35, -.17, -.03), (5.1, .17, .03))
            bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(phase + k * math.tau / 3, 3, 'Z'))
            merge(bb, b)
        obj_from_bm(pivot, name + ' blades', bb, [blade], smooth=False)
        hb = lathe([(0, -.12), (.34, -.12), (.3, .12), (0, .16)], seg)
        obj_from_bm(pivot, name + ' hub', hb, [metal])

    # Rear loading ramp, hinged at the cabin floor; closed it fills the rear opening.
    ramp = empty('Ramp'); ramp.parent = hull; ramp.location = (0, 4.66, .55)
    rb = block((-1.08, -.06, 0), (1.08, .06, 2.3), bevel=0 if low else .04)
    merge(rb, block((-1.08, .06, 0), (1.08, .1, .12)), 1)
    obj_from_bm(ramp, 'Ramp panel', rb, [armor])

    parts = [o for o in (shell, *[c for c in ramp.children]) if o.type == 'MESH' and o.data.materials[0] == armor]
    ao = bake_ao(parts, distance=.8, ground=False)

    def livery(co, no, part):
        n = .9 + .1 * fbm(co * 1.7)
        c = (n, n, n * .98)
        c = lerp(c, (.62, .6, .56), .45 * smooth01((1.1 - co.z) / .6))  # exhaust and dust under the belly
        if part == 1:
            c = tuple(v * .55 for v in c)  # dark ramp frame and hinge
        return c

    for o in parts:
        paint(o, livery, ao[o], .75)


BUILDERS = {'pine': build_pine, 'barricade': build_barricade, 'volcanic-rock': build_volcanic_rock,
            'concrete-block': build_concrete_block, 'stonewall': build_stonewall, 'barrel': build_barrel,
            'airlift': build_airlift}


# ---------------------------------------------------------------- export
@contextmanager
def exact_names(pairs):
    """glTF writes datablock names, and the runtime keys detail tiers by scene and
    material name. Temporarily lend each datablock its runtime name, parking any
    colliding datablock of the live session, then restore everything."""
    swaps = []
    for block, want, collection in pairs:
        if block.name == want:
            continue
        keep = block.name
        other = collection.get(want)
        if other is not None:
            other.name = f'{want}__{TAG}_parked'
        block.name = want
        swaps.append((block, keep, other, want))
    try:
        yield
    finally:
        for block, keep, other, want in reversed(swaps):
            block.name = keep
            if other is not None:
                other.name = want


BUILT = {}
TRIANGLES = {}


def build(name, low=False):
    """low=True authors the mobile tier directly (fewer segments, same materials and
    vertex attributes) instead of decimating, which tears seams on these props."""
    prepare_scene(f'{name} low' if low else name)
    root = empty(ROOTS[name])
    BUILDERS[name](root, low)
    BUILT[name, low] = root
    return root


def export(name, directory=None, low=False):
    root = BUILT[name, low]
    objs = [root, *root.children_recursive]
    mats = {s.material for o in objs if o.type == 'MESH' for s in o.material_slots if s.material}
    for o in bpy.context.scene.objects:
        o.select_set(o in objs)
    bpy.context.view_layer.objects.active = root
    target = Path(directory or (OUT / 'low' if low else OUT)) / f'{name}.glb'
    pairs = [(m, m[TAG], bpy.data.materials) for m in mats]
    pairs += [(root, ROOTS[name], bpy.data.objects), (bpy.context.scene, 'Scene', bpy.data.scenes)]
    # Both tiers live in one session, so Blender suffixes the second tier's nodes (Hull.001);
    # rigs are looked up by node name at runtime and must export under their base names.
    pairs += [(o, re.sub(r'\.\d{3}$', '', o.name), bpy.data.objects) for o in root.children_recursive]
    with exact_names(pairs):
        bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, use_active_scene=True,
                                  export_yup=True, export_apply=True, export_vertex_color='MATERIAL',
                                  export_all_vertex_colors=False, export_cameras=False,
                                  export_lights=False, export_extras=False)
    tris = 0
    for o in objs:
        if o.type == 'MESH':
            o.data.calc_loop_triangles()
            tris += len(o.data.loop_triangles)
    TRIANGLES[name, low] = tris
    print('AAA_PROP', name, 'low' if low else 'detailed', target.stat().st_size, 'bytes', tris, 'triangles')
    return target


def record_low_manifest(names):
    """build_low_detail.py skips these props, so keep the mobile-tier manifest complete here."""
    path = OUT / 'low' / 'manifest.json'
    report = [e for e in json.loads(path.read_text(encoding='utf-8')) if e['asset'] not in names] if path.exists() else []
    for n in names:
        report.append({'asset': n, 'detailedTriangles': TRIANGLES[n, False], 'lowTriangles': TRIANGLES[n, True],
                       'bytes': (OUT / 'low' / f'{n}.glb').stat().st_size})
    path.write_text(json.dumps(sorted(report, key=lambda e: e['asset']), indent=2), encoding='utf-8')


def save_sources(names):
    labels = [f'AAA {n}{suffix}' for n in names for suffix in ('', ' low')]
    scenes = {bpy.data.scenes[l] for l in labels if l in bpy.data.scenes} if LIVE else {bpy.context.scene}
    # The .blend is rewritten whole: an empty or missing scene would silently drop that prop's source.
    empty = [l for l in labels if LIVE and (l not in bpy.data.scenes or not bpy.data.scenes[l].objects)]
    if empty:
        raise RuntimeError(f'Build these props in this session before saving sources: {empty}')
    bpy.data.libraries.write(str(SOURCE / 'aaa-props.blend'), scenes, path_remap='RELATIVE_ALL', compress=True)


def run(names):
    for n in names:
        for low in (False, True):
            build(n, low)
            export(n, low=low)
    record_low_manifest(names)
    save_sources(names)


if __name__ == '__main__':
    run(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(BUILDERS))
