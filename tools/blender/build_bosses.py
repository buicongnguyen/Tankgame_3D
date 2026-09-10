"""Three original boss rigs. Blender Z-up exports to glTF Y-up."""
import bpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
armor=material('BossArmor',(.25,.29,.34));trim=material('BossTrim',(.76,.40,.16));dark=material('BossTracks',(.09,.12,.14));glow=material('BossCore',(.25,1,.70));rail=material('BossRail',(.29,.74,.85))
def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
def box(name,parent,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
for kind in ['rail','missile','walker']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 root=empty('boss-'+kind);hull=empty('Hull',root);turret=empty('Turret',root,(0,0,1.17))
 box('Chassis',hull,(0,0,.9),(3.0,4.2,.85),armor)
 box('Core',turret,(0,.7,.95),(.8,.8,.55),glow)
 if kind!='walker':
  for side in [-1,1]:
   box('Track',hull,(side*1.7,0,.5),(.75,4.8,.95),dark)
   for y in [-1.9,-1.15,-.4,.35,1.1,1.85]:box('Tread',hull,(side*1.7,y,1.02),(.8,.25,.12),trim)
 if kind=='rail':
  box('TurretArmor',turret,(0,0,.25),(2.4,2.3,.7),armor)
  for side in [-1,1]:
   box('Rail',turret,(side*.55,-2.1,.44),(.25,3.9,.26),rail)
   for y in [-.8,-1.4,-2,-2.6,-3.2]:box('Coil',turret,(side*.55,y,.44),(.48,.22,.5),dark)
  empty('Muzzle',turret,(0,-4.1,.44))
 elif kind=='missile':
  box('CommandCab',hull,(0,-1.5,1.55),(2.5,1.2,.7),trim)
  for side in [-1,1]:
   box('MissilePod',turret,(side*1.05,.1,.65),(1.35,2.8,1),armor)
   for x in [-.35,.35]:
    for z in [.42,.9]:box('LaunchTube',turret,(side*1.05+x,-1.32,z),(.38,.1,.32),trim)
  empty('Muzzle',turret,(0,-1.7,.6))
 else:
  box('Carapace',turret,(0,0,.4),(2.9,2.8,.8),armor)
  for i,y in enumerate([-1.55,0,1.55]):
   for side in [-1,1]:
    leg=empty('Leg'+str(i)+('L' if side<0 else 'R'),hull,(side*1.2,y,.8))
    o=box('Strut',leg,(side*.85,0,-.1),(1.9,.38,.45),trim);o.rotation_euler.y=side*.35
    box('Foot',leg,(side*1.55,0,-.52),(.65,.85,.55),dark)
  for x in [-.55,0,.55]:box('Cannon',turret,(x,-1.85,.38),(.22,1.7,.28),dark)
  empty('Muzzle',turret,(0,-2.8,.38))
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/('boss-'+kind+'.glb')),export_format='GLB')
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender'/('boss-'+kind+'.blend')))
print('Boss rigs exported')
