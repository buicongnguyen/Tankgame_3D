"""Author compact flame tongues for instanced Three.js fire. Blender 4.5+."""
import bpy, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public'/'models'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def build(low=False):
    vertices=[]; faces=[]; colors=[]
    sides=5 if low else 7
    rings=3 if low else 5
    lobes=[(0,0,1.5,.34)] if low else [(0,0,1.7,.38),(-.27,.05,1.2,.24),(.26,-.03,1.35,.23)]
    for lobe,(ox,oz,length,width) in enumerate(lobes):
        start=len(vertices)
        for j in range(rings):
            t=j/(rings-1)
            radius=width*(.22+math.sin(math.pi*t)**.85)*(1-t*.75)
            for i in range(sides):
                a=i*math.tau/sides+j*.28
                swirl=math.sin(t*5+lobe)*t*.22
                vertices.append((ox*(1-t)+math.cos(a)*radius+swirl,-t*length,oz+math.sin(a)*radius*.72+t*t*.28))
                colors.append((1, .92*(1-t)+.18*t, .3*(1-t)+.025*t, 1))
        tip=len(vertices);vertices.append((math.sin(5+lobe)*.22,-length-.2,.36));colors.append((.8,.06,.008,1))
        for j in range(rings-1):
            for i in range(sides):
                a=start+j*sides+i;b=start+j*sides+(i+1)%sides;c=a+sides;d=b+sides
                faces.extend([(a,b,c),(b,d,c)])
        for i in range(sides):
            faces.append((start+(rings-1)*sides+i,start+(rings-1)*sides+(i+1)%sides,tip))
    mesh=bpy.data.meshes.new('FlameTongues');mesh.from_pydata(vertices,[],faces);mesh.update()
    attr=mesh.color_attributes.new(name='FlameColor',type='FLOAT_COLOR',domain='POINT')
    for i,color in enumerate(colors):attr.data[i].color=color
    obj=bpy.data.objects.new('FlameTongues',mesh);bpy.context.collection.objects.link(obj)
    mat=bpy.data.materials.get('FlameGlow')
    if mat is None:
        mat=bpy.data.materials.new('FlameGlow');mat.use_nodes=True
        nodes=mat.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeBsdfPrincipled');color=nodes.new('ShaderNodeVertexColor');color.layer_name='FlameColor'
        mat.node_tree.links.new(color.outputs['Color'],emission.inputs['Base Color']);mat.node_tree.links.new(emission.outputs[0],out.inputs['Surface'])
    mesh.materials.append(mat)
    for poly in mesh.polygons:poly.use_smooth=True
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    path=OUT/('low' if low else '')/'flame.glb';path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True)
    return obj,{'tier':'low' if low else 'detailed','triangles':len(faces),'bytes':path.stat().st_size}

high,hi=build();low,lo=build(True)
high.location.x=-2;low.location.x=2
source=ROOT/'assets'/'blender'/'flamethrower.blend';source.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True)
print('FLAME_ASSETS',json.dumps([hi,lo]))
