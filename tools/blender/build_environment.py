"""Blender-authored low-poly environment kit. Run from the repository root."""
import bpy, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'public/models'; SOURCE=ROOT/'assets/blender'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);return m
wood=material('Cedar',(.25,.16,.09));leaf=material('Pine',(.16,.32,.22));leaf2=material('PineTips',(.31,.46,.25));brick=material('Terracotta',(.57,.30,.19));roof=material('Slate',(.18,.24,.26));stone=material('Granite',(.42,.46,.40));steel=material('Steel',(.25,.34,.36));glass=material('Window',(.10,.24,.27));sand=material('HillGrass',(.44,.49,.31))
roots=[]
def root(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);roots.append(o);return o
def cube(parent,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.parent=parent;o.location=loc;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
def cone(parent,loc,r1,r2,depth,mat,n=8):
 bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=depth);o=bpy.context.object;o.parent=parent;o.location=loc;o.data.materials.append(mat);return o
p=root('pine');cone(p,(0,0,1),.3,.2,2,wood);cone(p,(0,0,2.4),1.65,.15,2.8,leaf);cone(p,(0,0,3.6),1.25,0,2.4,leaf2)
p=root('house');cube(p,(0,0,1.5),(6,5,3),brick)
for side in [-1,1]:
 for x in [-1.8,1.8]:cube(p,(x,side*2.51,1.6),(1.05,.05,1),glass)
 o=cube(p,(side*1.65,0,3.65),(3.65,5.7,.22),roof);o.rotation_euler.y=side*math.radians(23)
cube(p,(0,-2.53,.9),(1.15,.1,1.8),wood);cube(p,(1.8,1.3,3.9),(.6,.65,1.7),brick)
p=root('stonewall')
for row in range(3):
 for i in range(5):cube(p,(-2.4+i*1.2+(row%2)*.08,0,.32+row*.62),(1.1,1.4,.59),stone)
p=root('steelwall');cube(p,(0,0,1),(6,1.1,2),steel)
for x in [-2.7,-1.35,0,1.35,2.7]:cube(p,(x,-.6,1),(.16,.2,2.2),roof)
p=root('bridge')
for i in range(15):cube(p,(0,-5.6+i*.8,.04),(9,.73,.22),wood)
for side in [-1,1]:
 cube(p,(side*4.4,0,.45),(.18,12,.18),steel)
 for y in [-5.5,-2.7,0,2.7,5.5]:cube(p,(side*4.4,y,.25),(.2,.2,.7),steel)
p=root('hill');cone(p,(0,0,1.45),1,.50,2.9,sand,9);p.children[0].scale=(7,5,1)
for x,y,z,r in [(-3,0,1.8,2),(2,1,2.3,2),(0,-1,2.8,2.2)]:
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r);o=bpy.context.object;o.parent=p;o.location=(x,y,z);o.scale=(1,1,.8);o.data.materials.append(stone)
import sys
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import environment
environment(roots)
report=[]
for p in roots:
 bpy.ops.object.select_all(action='DESELECT');p.select_set(True)
 for o in p.children_recursive:o.select_set(True)
 bpy.context.view_layer.objects.active=p;bpy.ops.export_scene.gltf(filepath=str(OUT/(p.name+'.glb')),export_format='GLB',use_selection=True)
 report.append({'asset':p.name,'bytes':(OUT/(p.name+'.glb')).stat().st_size})
for i,p in enumerate(roots):p.location.x=i*16
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'meridian-environment.blend'))
(OUT/'environment-manifest.json').write_text(json.dumps(report,indent=2));print(report)
