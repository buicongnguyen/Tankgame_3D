"""Compact open scout jeep with crew, machine gun and independent wheel pivots."""
import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import material,box,cyl
bpy.ops.wm.read_factory_settings(use_empty=True)
def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
a=material('JeepOlive',(.30,.34,.17),.35,.62);rubber=material('JeepRubber',(.035,.045,.045),0,.85);steel=material('JeepSteel',(.16,.20,.20),.65,.4);trim=material('JeepSand',(.68,.53,.28),.25,.65);skin=material('JeepCrewSkin',(.65,.43,.26),0,.8);cloth=material('JeepCrewUniform',(.5,.27,.16),0,.85);glass=material('JeepGlass',(.1,.3,.34),.25,.22)
root=empty('scout-jeep');hull=empty('Hull',root);turret=empty('Turret',root,(0,0,1.64))
box(hull,'Chassis',(0,0,.55),(1.50,2.65,.28),steel,.025)
box(hull,'Floor',(0,.12,.78),(1.54,2.55,.17),a,0)
box(hull,'Hood',(0,-.91,1.1),(1.55,.98,.46),a,.04)
box(hull,'Rear body',(0,1.23,1.03),(1.57,.2,.6),a,0)
for side in [-1,1]:
 box(hull,'Rear side',(side*.73,.64,1.0),(.15,1.32,.44),a,.02)
 box(hull,'Front fender',(side*.83,-.88,.99),(.39,1.04,.13),a,0)
 box(hull,'Rear fender',(side*.82,.89,1.0),(.38,.95,.13),a,0)
 box(hull,'Step',(side*.91,.06,.57),(.31,.7,.12),steel,0)
 box(hull,'Seat cushion',(side*.39,-.04,.92),(.53,.50,.17),rubber,.025)
 box(hull,'Seat back',(side*.39,.23,1.17),(.54,.16,.54),rubber,.025)
 cyl(hull,'Roll bar',(side*.71,.27,1.57),.045,1.47,steel,verts=8)
 box(hull,'Window upright',(side*.72,-.47,1.63),(.06,.07,.97),steel,.008)
 box(hull,'Mirror stalk',(side*.90,-.44,1.60),(.3,.055,.055),steel,0)
 box(hull,'Mirror',(side*1.02,-.44,1.67),(.07,.18,.22),glass,.01)
 cyl(hull,'Headlight',(side*.56,-1.43,1.14),.135,.08,trim,(math.pi/2,0,0),12)
 for y,name in [(-.91,'F'),(.9,'R')]:
  pivot=empty('Wheel'+name+('L' if side<0 else 'R'),hull,(side*.90,y,.48))
  cyl(pivot,'Tire',(0,0,0),.45,.28,rubber,(0,math.pi/2,0),16)
  cyl(pivot,'Rim',(side*.15,0,0),.25,.035,trim,(0,math.pi/2,0),12)
  cyl(pivot,'Hub',(side*.18,0,0),.10,.07,steel,(0,math.pi/2,0),8)
box(hull,'Front bumper',(0,-1.55,.65),(1.95,.17,.17),steel,.015)
box(hull,'Rear bumper',(0,1.48,.64),(1.83,.15,.17),steel,.015)
for x in [-.30,-.15,0,.15,.30]:box(hull,'Grille slit',(x,-1.407,1.08),(.065,.025,.28),rubber,0)
box(hull,'Windshield',(0,-.47,1.66),(1.38,.035,.75),glass,0)
for z in [1.27,2.08]:box(hull,'Window rail',(0,-.47,z),(1.50,.07,.06),steel,.006)
box(hull,'Roll crossbar',(0,.27,2.28),(1.46,.09,.09),steel,0)
cyl(hull,'Spare tire',(0,1.48,1.13),.39,.23,rubber,(math.pi/2,0,0),16)
cyl(hull,'Spare rim',(0,1.61,1.13),.21,.035,trim,(math.pi/2,0,0),12)
# Seated driver, visible above the open cockpit.
box(hull,'Driver torso',(-.39,-.02,1.42),(.42,.31,.51),cloth,.018)
box(hull,'Driver head',(-.39,-.07,1.80),(.29,.29,.29),skin,.025)
box(hull,'Driver helmet',(-.39,-.07,1.97),(.38,.36,.14),trim,.025)
for x in [-.65,-.14]:box(hull,'Driver arm',(x,-.20,1.46),(.14,.4,.14),cloth,0)
cyl(hull,'Steering wheel',(-.39,-.38,1.39),.2,.035,steel,(.6,0,0),12)
# Gunner and machine gun rotate together around the central mount.
for x in [-.2,.2]:box(turret,'Gunner leg',(x,.65,-.285),(.21,.28,1.15),cloth,0)
box(turret,'Gunner torso',(0,.65,.53),(.64,.40,.64),cloth,.02)
box(turret,'Gunner vest',(0,.41,.55),(.58,.1,.5),a,.01)
box(turret,'Gunner head',(0,.58,1.05),(.35,.34,.35),skin,.025)
box(turret,'Gunner helmet',(0,.58,1.25),(.45,.43,.17),trim,.025)
for x in [-.39,.39]:box(turret,'Gunner arm',(x,.25,.68),(.19,.67,.19),cloth,0)
cyl(turret,'Gun pedestal',(0,-.03,-.115),.07,1.30,steel,verts=10)
box(turret,'Receiver',(0,-.13,.76),(.24,.54,.26),steel,.018)
box(turret,'Ammo box',(.30,-.02,.64),(.28,.31,.30),a,.018)
box(turret,'Feed belt',(.17,-.07,.78),(.18,.12,.07),trim,.006)
cyl(turret,'Gun barrel',(0,-.86,.78),.055,1.12,steel,(math.pi/2,0,0),10)
cyl(turret,'Muzzle brake',(0,-1.43,.78),.085,.16,steel,(math.pi/2,0,0),10)
cyl(turret,'Dark bore',(0,-1.517,.78),.043,.012,rubber,(math.pi/2,0,0),10)
empty('Muzzle',turret,(0,-1.55,.78))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/scout-jeep.blend'))
buckets={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':buckets.setdefault((o.parent,o.data.materials[0].name),[]).append(o)
for objects in buckets.values():
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/scout-jeep.glb'),export_format='GLB',export_texcoords=False)
