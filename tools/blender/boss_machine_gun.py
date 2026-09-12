"""Add Vanguard's compact, independently aimed machine gun in Blender."""
import bpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def add_vanguard_gun(turret):
 old=bpy.data.objects.get('LightGun')
 if old:
  for o in list(old.children_recursive):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.objects.remove(old,do_unlink=True)
 gun=bpy.data.objects.new('LightGun',None);bpy.context.collection.objects.link(gun);gun.parent=turret;gun.location=(.88,-.64,4.46)
 steel=bpy.data.materials.get('quad-mechSteel');trim=bpy.data.materials.get('quad-mechTrim')
 def block(name,loc,size,mat):
  bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=gun;o.location=loc;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 block('Machine gun swivel',(0,0,-.12),(.28,.3,.18),trim)
 block('Machine gun receiver',(0,-.20,.07),(.32,.58,.26),steel)
 block('Machine gun belt box',(.25,-.04,.06),(.18,.31,.24),trim)
 bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.068,depth=.98);o=bpy.context.object;o.name='Machine gun barrel';o.parent=gun;o.location=(0,-.86,.08);o.rotation_euler.x=math.pi/2;o.data.materials.append(steel)
 muzzle=bpy.data.objects.new('LightMuzzle',None);bpy.context.collection.objects.link(muzzle);muzzle.parent=gun;muzzle.location=(0,-1.36,.08)
 return gun
if __name__=='__main__':
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/boss-quad-mech.blend'))
 add_vanguard_gun(bpy.data.objects['Turret'])
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/boss-quad-mech.blend'))
 buckets={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o.name!='Core' and len(o.data.materials)==1:buckets.setdefault((o.parent,o.data.materials[0].name),[]).append(o)
 for objects in buckets.values():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/boss-quad-mech.glb'),export_format='GLB')
