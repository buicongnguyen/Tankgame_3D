import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import finish
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=.45;return m
body=mat('RocketOlive',(.30,.38,.22),.3);nose=mat('RocketNose',(.80,.81,.72),.5);metal=mat('RocketMetal',(.16,.20,.22),.8);stripe=mat('Warning',(.95,.60,.12));fuelmat=mat('GasolineRed',(.67,.16,.08),.25)
def root(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o
def cylinder(parent,loc,r,depth,m,r2=None):
 if r2 is None:bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=depth)
 else:bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r2,depth=depth)
 o=bpy.context.object;o.parent=parent;o.location=loc;o.rotation_euler.x=math.pi/2;o.data.materials.append(m);return o
def box(parent,loc,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.parent=parent;o.location=loc;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
r=root('rocket');cylinder(r,(0,0,0),.19,1.6,body);cylinder(r,(0,-1.03,0),.19,.46,nose,0);cylinder(r,(0,.91,0),.14,.22,metal,.10)
for y in [-.65,.25]:cylinder(r,(0,y,0),.195,.1,stripe)
for x,z in [(1,0),(-1,0),(0,1),(0,-1)]:
 mesh=bpy.data.meshes.new('Fin');mesh.from_pydata([(x*.16,.25,z*.16),(x*.57,.85,z*.57),(x*.16,.85,z*.16)],[],[(0,1,2)]);o=bpy.data.objects.new('Stabilizer',mesh);bpy.context.collection.objects.link(o);o.parent=r;o.data.materials.append(metal)
ex=root('Exhaust');ex.parent=r;ex.location=(0,1.06,0)
finish()
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/rocket.glb'),export_format='GLB');bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/rocket.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
f=root('fuelcrate');box(f,(0,0,.12),(2.2,1.5,.24),metal)
for x in [-.65,0,.65]:
 box(f,(x,0,.8),(.55,1.1,1.15),fuelmat);box(f,(x,0,1.43),(.3,.25,.12),metal)
for x in [-1.02,1.02]:box(f,(x,0,.8),(.12,1.55,1.6),metal)
for y in [-.76,.76]:
 box(f,(0,y,.65),(2.1,.07,.35),stripe);box(f,(0,y,1.5),(2.1,.08,.12),metal)
finish()
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/fuelcrate.glb'),export_format='GLB');bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/fuelcrate.blend'))
