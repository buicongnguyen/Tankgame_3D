import bpy, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);return m
uniform=mat('InfantryUniform',(.55,.31,.20));boots=mat('InfantryBoots',(.12,.16,.16));skin=mat('InfantryFace',(.67,.49,.32));helmet=mat('InfantryHelmet',(.73,.64,.33));gun=mat('InfantryGun',(.15,.20,.22))
def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
def box(parent,loc,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.parent=parent;o.location=loc;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
roots=[]
for name in ['rifleman','rocketeer']:
 # Export each rig before creating the next so pivot names remain exact in every file.
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 root=empty(name);hull=empty('Hull',root);torso=empty('Turret',root,(0,0,1.2))
 for side,legname in [(-1,'LeftLeg'),(1,'RightLeg')]:
  leg=empty(legname,hull,(side*.23,0,.92));box(leg,(0,0,-.38),(.3,.36,.78),uniform);box(leg,(0,-.08,-.84),(.34,.55,.19),boots)
 box(torso,(0,0,.1),(.82,.5,.8),uniform);box(torso,(0,.34,.18),(.58,.25,.55),boots)
 box(torso,(0,0,.7),(.44,.42,.44),skin);box(torso,(0,0,.95),(.59,.57,.2),helmet)
 for x in [-.5,.5]:box(torso,(x,-.19,.12),(.24,.66,.26),uniform)
 if name=='rifleman':box(torso,(.28,-.6,.16),(.14,1.05,.2),gun);empty('Muzzle',torso,(.28,-1.18,.16))
 else:
  bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.18,depth=1.35);o=bpy.context.object;o.parent=torso;o.location=(.42,-.35,.47);o.rotation_euler.x=math.pi/2;o.data.materials.append(gun);empty('Muzzle',torso,(.42,-1.08,.47))
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{name}.glb'),export_format='GLB')
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender'/f'{name}.blend'))
print('Infantry models exported')
