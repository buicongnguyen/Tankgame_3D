"""Rendered 3D interface icons for the menus and the shop: one family, readable at 20-48 CSS pixels.

Every icon is posed on a "stage" aligned with an orthographic camera (stage X = screen right, Y = screen
up, Z = toward the viewer), lit by the same warm key / cool rim / soft fill and a studio gradient for
metal reflections, then framed to fill the square with a small margin. The Tank and Supplies tab icons
reuse the game models (tank.glb in the Cobalt Kestrel paint, crate.glb) so the shop shows what the player
drives and collects.

Output: src/three/ui-icons/<name>.webp (160 px, transparent), referenced from src/three/ui-polish.css and
bundled by Vite. tools/check-assets.mjs checks their size, format and use.

Headless:  blender --background --factory-startup --python tools/blender/build_ui_icons.py [-- name ...]
"""
import bpy, bmesh, math, sys
from pathlib import Path
from mathutils import Vector, Euler

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / 'public' / 'models'
OUT = ROOT / 'src' / 'three' / 'ui-icons'
SIZE = 160
PAD = .05          # margin around the silhouette, as a share of the frame
R = math.radians


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 128
    sc.cycles.use_denoising = True
    sc.cycles.device = 'CPU'
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = SIZE
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 88
    # Standard keeps the saturated paint the game uses; AgX washes reds and blues toward pastel.
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    world = bpy.data.worlds.new('Studio')
    world.use_nodes = True
    nt = world.node_tree
    bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
    coords = nt.nodes.new('ShaderNodeTexCoord')
    split = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    remap = nt.nodes.new('ShaderNodeMapRange')
    remap.inputs['From Min'].default_value, remap.inputs['From Max'].default_value = -1, 1
    nt.links.new(coords.outputs['Generated'], split.inputs[0])
    nt.links.new(split.outputs['Z'], remap.inputs['Value'])
    nt.links.new(remap.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    # A dark floor, a bright warm horizon band and a cool sky: metals get a crisp studio reflection line.
    stops = ((0, (.03, .035, .045)), (.47, (.16, .12, .09)), (.53, (1.0, .9, .74)), (1, (.62, .74, 1.0)))
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = stops[0][0], (*stops[0][1], 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        ramp.color_ramp.elements.new(pos).color = (*col, 1)
    bg.inputs['Strength'].default_value = .75
    sc.world = world
    # The stage faces the camera from the upper front-right, like a hero product shot.
    stage = bpy.data.objects.new('Stage', None)
    stage.rotation_euler = Euler((R(62), 0, R(38)), 'XYZ')
    sc.collection.objects.link(stage)
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    cam.data.type = 'ORTHO'
    cam.data.clip_end = 60
    cam.parent = stage
    cam.location = (0, 0, 20)
    sc.collection.objects.link(cam)
    sc.camera = cam
    for name, loc, energy, color, size in (('Key', (-3.2, 3.6, 4.4), 900, (1, .9, .76), 2.6),
                                            ('Rim', (3.6, 3.0, -3.2), 1100, (.6, .78, 1), 1.8),
                                            ('Fill', (3.8, -2.6, 3.4), 260, (1, .96, .92), 3.4)):
        light = bpy.data.lights.new(name, 'AREA')
        light.energy, light.color, light.size = energy, color, size
        o = bpy.data.objects.new(name, light)
        o.parent = stage
        o.location = loc
        o.rotation_euler = (-Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.collection.objects.link(o)
    return sc, stage


def mat(name, color, metal=0.0, rough=.35, coat=.3, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = coat
    b.inputs['Coat Roughness'].default_value = .1
    if emit:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = emit
    return m


def palette():
    return {
        'gold': mat('Gold', (1.0, .64, .18), metal=1, rough=.2, coat=.15),
        'gold_face': mat('GoldFace', (.96, .56, .12), metal=1, rough=.34, coat=.15),
        'steel': mat('Steel', (.62, .67, .74), metal=1, rough=.24),
        'gunmetal': mat('Gunmetal', (.09, .11, .13), metal=.6, rough=.3),
        'brass': mat('Brass', (1.0, .6, .2), metal=1, rough=.22),
        'red': mat('Red', (.95, .09, .04), rough=.34, coat=.2),
        'white': mat('White', (.9, .92, .94), rough=.3, coat=.5),
        'amber': mat('Amber', (1.0, .62, .06), rough=.3, coat=.5),
        'magenta': mat('Magenta', (.9, .04, .42), rough=.26, coat=.7),
        'cyan': mat('Cyan', (.0, .62, .95), rough=.28, coat=.6),
        'ebony': mat('Ebony', (.05, .06, .075), rough=.35, coat=.6),
    }


def mesh(name, bm, material, parent, smooth=True, bevel=0.0, segs=2):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = smooth
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(material)
    o.parent = parent
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width, mod.segments, mod.limit_method = bevel, segs, 'ANGLE'
        mod.angle_limit = R(35)
        o.modifiers.new('normals', 'WEIGHTED_NORMAL').keep_sharp = True
    return o


def group(name, parent, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    """An empty posed in degrees; children inherit its transform."""
    g = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(g)
    g.parent = parent
    g.location, g.rotation_euler, g.scale = loc, Euler(tuple(R(a) for a in rot), 'XYZ'), (scale,) * 3
    return g


def lathe(profile, seg=64):
    """Revolve (radius, z) points around Z; a zero radius closes the end."""
    bm = bmesh.new()
    rings = [[bm.verts.new((math.cos(s / seg * math.tau) * r, math.sin(s / seg * math.tau) * r, z)) for s in range(seg)]
             if r > 1e-6 else [bm.verts.new((0, 0, z))] for r, z in profile]
    for a, b in zip(rings, rings[1:]):
        for s in range(seg):
            t = (s + 1) % seg
            if len(a) == 1:
                bm.faces.new((a[0], b[s], b[t]))
            elif len(b) == 1:
                bm.faces.new((a[s], a[t], b[0]))
            else:
                bm.faces.new((a[s], a[t], b[t], b[s]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def prism(points, depth, z=0.0):
    """Extrude a closed XY outline to a slab centred on z."""
    bm = bmesh.new()
    top = [bm.verts.new((x, y, z + depth / 2)) for x, y in points]
    bottom = [bm.verts.new((x, y, z - depth / 2)) for x, y in points]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bottom)))
    for i in range(len(points)):
        j = (i + 1) % len(points)
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def star(outer, inner, points=5):
    return [(math.cos(math.pi / 2 + i * math.pi / points) * (outer if i % 2 == 0 else inner),
             math.sin(math.pi / 2 + i * math.pi / points) * (outer if i % 2 == 0 else inner)) for i in range(points * 2)]


def box(size, loc=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return bm


def ring(major, minor, seg=48, tube=16, arc=math.tau):
    """A torus, or an arc of one centred on +X, lying in the XZ plane."""
    bm = bmesh.new()
    closed = arc >= math.tau - 1e-6
    count = seg if closed else seg + 1
    loops = []
    for i in range(count):
        a = -arc / 2 + arc * i / seg
        centre = Vector((math.cos(a) * major, 0, math.sin(a) * major))
        radial = Vector((math.cos(a), 0, math.sin(a)))
        loops.append([bm.verts.new(centre + radial * math.cos(t / tube * math.tau) * minor
                                   + Vector((0, 1, 0)) * math.sin(t / tube * math.tau) * minor) for t in range(tube)])
    for i in range(count if closed else count - 1):
        a, b = loops[i], loops[(i + 1) % count]
        for t in range(tube):
            u = (t + 1) % tube
            bm.faces.new((a[t], a[u], b[u], b[t]))
    if not closed:
        bm.faces.new(list(reversed(loops[0])))
        bm.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


# Icons that reuse a game model: file, tilt toward the camera, turn about its own up axis (degrees).
GAME_MODELS = {'tank': ('tank.glb', -64, 212), 'supply': ('crate.glb', -66, 28)}


def skin_palette(skin):
    """Linear RGBA base colours for one skin, read from the generated src/three/skin-palettes.ts."""
    import re
    text = (ROOT / 'src' / 'three' / 'skin-palettes.ts').read_text(encoding='utf8')
    block = re.search(r'"%s"\s*:\s*\{([^}]*)\}' % skin, text).group(1)
    linear = lambda h: tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)) + (1,)
    return {k: linear(v) for k, v in re.findall(r'"(\w+)"\s*:\s*"([0-9a-fA-F]{6})"', block)}


# ------------------------------------------------------------------ models (Z up, built at the origin)
def coin_model(parent, p, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    g = group('Coin', parent, loc, rot, scale)
    mesh('CoinBody', lathe([(0, -.14), (.9, -.14), (.99, -.1), (1.0, 0), (.99, .1), (.9, .14), (.8, .14), (.77, .08), (0, .08)]), p['gold'], g)
    mesh('CoinStar', prism(star(.56, .24), .1, z=.12), p['gold_face'], g, smooth=False, bevel=.025)
    # A reeded edge: shallow grooves that catch the rim light at icon size.
    for i in range(40):
        a = i / 40 * math.tau
        tick = mesh(f'Reed{i}', box((.03, .05, .18)), p['gold_face'], g, smooth=False)
        tick.location = (math.cos(a) * .995, math.sin(a) * .995, 0)
        tick.rotation_euler = (0, 0, a)
    return g


def build(name):
    sc, stage = reset()
    p = palette()
    if name == 'credit':
        coin_model(stage, p, rot=(-8, 30, -10))
    elif name == 'coins':
        pile = group('Pile', stage, (-.25, -.15, 0), (-68, 0, 0))
        for i in range(4):
            c = group(f'Stacked{i}', pile, (math.sin(i * 2.1) * .05, math.cos(i * 1.7) * .05, i * .29), (0, 0, i * 23))
            mesh(f'Disc{i}', lathe([(0, -.14), (.9, -.14), (.99, -.1), (1.0, 0), (.99, .1), (.9, .14), (0, .14)]), p['gold'], c)
        coin_model(stage, p, loc=(.78, -.35, .9), rot=(-10, 34, -14), scale=.88)
    elif name == 'trophy':
        cup = group('Trophy', stage, (0, 0, 0), (-76, 0, 0))
        mesh('Cup', lathe([(0, .74), (.18, .74), (.3, .86), (.58, 1.12), (.74, 1.5), (.78, 1.9), (.86, 1.96), (.86, 2.02), (.7, 2.02),
                           (.66, 1.62), (.5, 1.24), (.26, 1.0), (0, .98)]), p['gold'], cup)
        mesh('Stem', lathe([(0, .3), (.1, .3), (.12, .5), (.1, .66), (.22, .76), (0, .8)]), p['gold'], cup)
        mesh('Foot', lathe([(0, .22), (.48, .22), (.5, .3), (.3, .36), (0, .36)]), p['gold_face'], cup)
        mesh('Plinth', box((1.24, 1.24, .42)), p['ebony'], cup, smooth=False, bevel=.05, segs=3)
        mesh('Plate', box((.66, .04, .2), (0, -.63, 0)), p['gold_face'], cup, smooth=False, bevel=.01)
        for side in (-1, 1):
            h = mesh('Handle', ring(.3, .06, arc=R(250)), p['gold'], cup)
            h.location = (side * .78, 0, 1.52)
            h.rotation_euler = (0, R(0 if side > 0 else 180), 0)
        badge = mesh('Badge', prism(star(.24, .1), .06), p['red'], cup, smooth=False, bevel=.015)
        badge.location = (0, -.79, 1.42)
        badge.rotation_euler = (R(90), 0, 0)
    elif name == 'gear':
        g = group('Gear', stage, rot=(-10, 30, 8))
        teeth = 10
        outline = [(math.cos(i / (teeth * 4) * math.tau) * (1.0 if i % 4 in (1, 2) else .8),
                    math.sin(i / (teeth * 4) * math.tau) * (1.0 if i % 4 in (1, 2) else .8)) for i in range(teeth * 4)]
        mesh('Cog', prism(outline, .3), p['steel'], g, smooth=False, bevel=.035, segs=3)
        mesh('Hub', lathe([(0, -.2), (.44, -.2), (.5, -.14), (.5, .2), (.44, .26), (.26, .26), (.22, .2), (0, .2)]), p['gunmetal'], g)
        mesh('Axle', lathe([(0, .14), (.17, .14), (.17, .34), (0, .34)], 6), p['brass'], g, smooth=False, bevel=.02)
    elif name == 'shell':
        for i, (loc, tip) in enumerate((((-.42, .12, -.4), 'steel'), ((.38, -.12, .4), 'red'))):
            r = group(f'Round{i}', stage, loc, (-78, 0, -10 + i * 4))
            mesh('Case', lathe([(0, 0), (.33, 0), (.33, .07), (.28, .11), (.3, .2), (.3, 1.18), (.26, 1.28), (0, 1.28)]), p['brass'], r)
            mesh('Band', lathe([(0, 1.22), (.265, 1.22), (.265, 1.34), (0, 1.34)]), p['gold_face'], r)
            mesh('Tip', lathe([(0, 1.3), (.25, 1.3), (.25, 1.5), (.2, 1.86), (.1, 2.1), (0, 2.18)]), p[tip], r)
    elif name == 'spray':
        can = group('Can', stage, (0, 0, 0), (-76, 0, -16))
        mesh('Body', lathe([(0, 0), (.5, 0), (.54, .06), (.54, 1.52), (.46, 1.74), (.24, 1.86), (0, 1.88)]), p['magenta'], can)
        for i, (z, colour) in enumerate(((.42, 'amber'), (.7, 'cyan'))):
            mesh(f'Stripe{i}', lathe([(0, z), (.545, z), (.545, z + .2), (0, z + .2)]), p[colour], can)
        mesh('Collar', lathe([(0, 1.82), (.26, 1.82), (.28, 1.9), (0, 1.9)]), p['steel'], can)
        mesh('Cap', lathe([(0, 1.88), (.2, 1.88), (.2, 2.14), (.16, 2.2), (0, 2.2)]), p['white'], can)
        mesh('Nozzle', box((.1, .2, .1), (0, -.16, 2.1)), p['gunmetal'], can, smooth=False, bevel=.02)
        for i, (x, y, r) in enumerate(((-.62, 1.2, .16), (-.95, 1.42, .12), (-1.18, 1.1, .1), (-.86, 1.74, .08))):
            drop = bmesh.new()
            bmesh.ops.create_uvsphere(drop, u_segments=24, v_segments=14, radius=r)
            mesh(f'Drop{i}', drop, p['magenta'] if i % 2 == 0 else p['cyan'], stage).location = (x, y, .4)
    elif name in GAME_MODELS:
        source, tilt, turn = GAME_MODELS[name]
        before = set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(MODELS / source))
        imported = [o for o in bpy.context.scene.objects if o not in before]
        spin = group('Spin', group('Model', stage, rot=(tilt, 0, 0)), rot=(0, 0, turn))
        for o in imported:
            if o.parent is None:
                o.parent = spin
        # The game paints the tank at runtime; the icon wears the default Cobalt Kestrel scheme.
        paint = skin_palette('classic') if name == 'tank' else {}
        for m in {m for o in imported if o.type == 'MESH' for m in o.data.materials if m}:
            b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not b:
                continue
            key = m.name.split('.')[0]
            if key in paint:
                b.inputs['Base Color'].default_value = paint[key]
            b.inputs['Coat Weight'].default_value = .35
            b.inputs['Coat Roughness'].default_value = .15
    frame(sc)
    OUT.mkdir(parents=True, exist_ok=True)
    sc.render.filepath = str(OUT / f'{name}.webp')
    bpy.ops.render.render(write_still=True)
    print('UI_ICON', name, (OUT / f'{name}.webp').stat().st_size)


def frame(sc):
    """Fit the orthographic camera to the evaluated silhouette of every mesh."""
    bpy.context.view_layer.update()
    cam = sc.camera
    deps = bpy.context.evaluated_depsgraph_get()
    to_cam = cam.matrix_world.inverted()
    xs, ys = [], []
    for o in sc.objects:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(deps)
        data = ev.to_mesh()
        for v in data.vertices:
            q = to_cam @ (ev.matrix_world @ v.co)
            xs.append(q.x)
            ys.append(q.y)
        ev.to_mesh_clear()
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    cam.data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys)) / (1 - 2 * PAD)
    cam.location = cam.location + Vector((cx, cy, 0))


NAMES = ['credit', 'coins', 'trophy', 'gear', 'shell', 'tank', 'supply', 'spray']
if __name__ == '__main__':
    picked = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for n in picked or NAMES:
        build(n)
