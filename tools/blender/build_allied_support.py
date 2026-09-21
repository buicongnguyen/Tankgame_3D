"""Readable relay beacon and roof-mounted convoy weapons, made in Blender.
Shared materials, bounded geometry, preserved turret/muzzle pivots. No textures.
"""
import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import material,box,cyl
def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
def export(name):
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender'/f'{name}.blend'))
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{name}.glb'),export_format='GLB')
for name in ['relay','convoy-missile','convoy-gun']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 steel=material('SupportSteel',(.12,.23,.28),.6,.38)
 trim=material('SupportAmber',(.95,.51,.08),.3,.45)
 white=material('SupportWhite',(.8,.9,.89),.3,.5)
 black=material('SupportRubber',(.025,.055,.065),.2,.8)
 glow=material('SupportSignal',(.12,.95,.88),.1,.3)
 bsdf=glow.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Emission Color'].default_value=(.1,.9,.8,1);bsdf.inputs['Emission Strength'].default_value=1.3
 root=empty(name)
 if name=='relay':
  box(root,'Foundation',(0,0,.18),(3.8,3.8,.36),steel,.08)
  box(root,'Signal cabinet',(0,0,1.5),(1.8,1.6,2.5),white,.12)
  box(root,'Display',(0,-.825,1.9),(1.28,.05,.7),glow,.025)
  for side in [-1,1]:
   box(root,'Corner signal',(side*1.45,0,1.45),(.22,.24,2.55),glow,.015)
   box(root,'Protected corner',(side*1.45,.18,1.45),(.35,.16,2.7),steel,.025)
  cyl(root,'Mast',(0,0,3.25),.16,3,steel,verts=12)
  for z in [3.5,4.1,4.7]:
   cyl(root,'Signal halo',(0,0,z),.65,.12,glow,verts=20)
  for x in [-.65,.65]:box(root,'Warning stripe',(x,-.84,.85),(.17,.05,.75),trim,.01)
  for x in [-.45,0,.45]:box(root,'Cabinet vent',(x,.825,1.1),(.16,.04,.45),black,.008)
 else:
  hull=empty('Hull',root);turret=empty('Turret',root,(0,0,.28))
  cyl(hull,'Roof mount',(0,0,.10),.65,.2,steel,verts=20)
  box(turret,'Mechanism',(0,0,.18),(1.1,.7,.4),steel,.05)
  if name=='convoy-missile':
   for x in [-.52,.52]:
    cyl(turret,'Launch tube',(x,0,.58),.31,1.75,steel,(math.pi/2,0,0),16)
    cyl(turret,'Tube band',(x,.48,.58),.34,.16,trim,(math.pi/2,0,0),16)
    cyl(turret,'Missile nose',(x,-.9,.58),.2,.16,white,(math.pi/2,0,0),12)
   empty('Muzzle',turret,(0,-1.03,.58));empty('Exhaust',turret,(0,1,.58))
  else:
   box(turret,'Gun receiver',(0,-.3,.52),(.48,1,.42),steel,.045)
   cyl(turret,'Barrel sleeve',(0,-1,.52),.13,1.1,black,(math.pi/2,0,0),16)
   cyl(turret,'Muzzle brake',(0,-1.62,.52),.17,.18,steel,(math.pi/2,0,0),12)
   box(turret,'Ammo case',(.45,0,.45),(.45,.65,.5),trim,.035)
   box(turret,'Sight',(0,-.25,.83),(.14,.3,.15),glow,.01)
   empty('Muzzle',turret,(0,-1.74,.52))
 export(name)
print('ALLIED_SUPPORT_COMPLETE')
