"""Generate the mobile geometry tier from the detailed GLBs. Blender 4.5+."""
import bpy, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models/low'
OUT.mkdir(parents=True, exist_ok=True)
report = []
for source in sorted((ROOT / 'public/models').glob('*.glb')):
    if source.stem == 'barrel.001':
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    frontier = source.stem in ['glacier','volcano','volcanic-rock','palm','jungle-tree','cityblock']
    before = after = 0
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH':
            continue
        obj.data.calc_loop_triangles()
        before += len(obj.data.loop_triangles)
        if frontier and obj.name.startswith('Fine '):
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        bpy.context.view_layer.objects.active = obj
        # Retain every surface, rig and attachment; simplify bevels and curved parts.
        # Planar dissolve removes exported triangle diagonals before decimation.
        planar = obj.modifiers.new('Mobile planar surfaces', 'DECIMATE')
        planar.decimate_type = 'DISSOLVE'
        planar.angle_limit = .025
        planar.delimit = {'NORMAL', 'MATERIAL', 'UV'}
        bpy.ops.object.modifier_apply(modifier=planar.name)
        obj.data.calc_loop_triangles()
        if len(obj.data.loop_triangles) > 12:
            decimate = obj.modifiers.new('Mobile silhouette', 'DECIMATE')
            decimate.ratio = .18 if frontier else .30
            decimate.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=decimate.name)
        obj.data.calc_loop_triangles()
        after += len(obj.data.loop_triangles)
        if frontier and obj.data.has_custom_normals:
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
    target = OUT / source.name
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB')
    report.append({'asset': source.stem, 'detailedTriangles': before, 'lowTriangles': after, 'bytes': target.stat().st_size})
(OUT / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('MOBILE_DETAIL', json.dumps(report))
