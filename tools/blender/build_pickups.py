import bpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models'
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
def box(name,p,s,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
def cross(p,m):
 x,y,z=p;box('Medical stripe',(x,y,z),(1.1,.12,.28),m);box('Medical stripe',(x,y,z),(.28,.12,1.1),m)
for kind in ['health','shield','supply','laser','arc','repair']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 dark=mat('Graphite',(.08,.14,.17));white=mat('Ivory',(.86,.93,.92));green=mat('Medical green',(.08,.75,.37));gold=mat('Safety yellow',(1,.65,.08));blue=mat('Energy blue',(.06,.5,1));purple=mat('Rocket violet',(.6,.2,1))
 if kind=='repair':
  box('Service platform',(0,0,.1),(5.4,5.4,.2),dark)
  for x in [-2.5,2.5]:
   box('Service gantry',(x,0,1.7),(.3,.4,3.4),gold);box('Tool cabinet',(x,1.6,.8),(.6,.9,1.6),green)
   for z in [.4,.8,1.2]:box('Drawer',(x,1.12,z),(.45,.06,.04),white)
  box('Gantry header',(0,0,3.5),(5.3,.45,.45),green)
  box('Repair sign',(0,-.25,3.5),(1.4,.12,.85),dark)
  box('Wrench handle',(0,-.33,3.45),(.15,.08,.6),gold)
  for x in [-.18,.18]:box('Wrench jaw',(x,-.33,3.73),(.17,.08,.25),gold)
  for x in [-1.5,1.5]:box('Guide stripe',(x,0,.22),(.14,4.7,.04),gold)
 else:
  color=white if kind=='health' else blue if kind in ['shield','laser'] else purple if kind=='arc' else dark
  box('Case',(0,0,.6),(1.7,.85,1.1),color)
  for x in [-.8,.8]:box('Corner protection',(x,0,.6),(.16,.95,1.15),dark)
  box('Handle',(0,0,1.3),(.8,.18,.12),dark)
  for x in [-.34,.34]:box('Handle foot',(x,0,1.2),(.12,.18,.25),dark)
  if kind=='health':cross((0,-.46,.65),green);box('Lid cross A',(0,0,1.17),(1.1,.25,.04),green);box('Lid cross B',(0,0,1.17),(.25,.7,.04),green)
  elif kind=='shield':
   box('Shield face',(0,-.49,.72),(.85,.14,.75),white);o=box('Shield point',(0,-.49,.3),(.5,.14,.5),white);o.rotation_euler[1]=math.pi/4
  else:
   for x in [-.48,0,.48]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.14,depth=.9,location=(x,-.55,.75));bpy.context.object.data.materials.append(blue if kind=='laser' else gold)
    if kind=='arc':
     bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=.14,radius2=0,depth=.3,location=(x,-.55,1.35));bpy.context.object.data.materials.append(white)
 for low in [False,True]:
  dest=OUT/('low' if low else '');dest.mkdir(exist_ok=True,parents=True)
  bpy.ops.export_scene.gltf(filepath=str(dest/f'pickup-{kind}.glb'),export_format='GLB',export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tools/blender/pickup-source.blend'))
