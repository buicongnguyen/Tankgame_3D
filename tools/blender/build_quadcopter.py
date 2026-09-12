"""Storm Kite: original four-rotor aircraft, bounded geometry and preserved rig nodes."""
import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import material,box,cyl
bpy.ops.wm.read_factory_settings(use_empty=True)
def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
armor=material('KiteArmor',(.095,.19,.24),.6,.4)
trim=material('KiteTrim',(.95,.42,.07),.65,.36)
steel=material('KiteSteel',(.26,.32,.36),.75,.3)
dark=material('KiteRubber',(.025,.035,.045),.1,.8)
lens=material('KiteLens',(.05,.7,.8),.5,.2)
glow=material('KiteCore',(.2,.95,.55),.25,.35)
root=empty('boss-quadcopter');hull=empty('Hull',root);turret=empty('Turret',root,(0,0,1.17))
box(hull,'Armored fuselage',(0,0,1.6),(2.4,3.5,1.05),armor,.18)
box(hull,'Raised battery',(0,.45,2.21),(1.6,1.65,.34),steel,.07)
box(hull,'Nose armor',(0,-1.82,1.45),(1.7,.5,.62),trim,.08)
box(turret,'Core',(0,-1.98,.6),(.8,.08,.46),glow,.035)
for side in [-1,1]:
 box(hull,'Landing skid',(side*1.4,0,.2),(.16,3.4,.19),dark,.03)
 for y in [-1,1]:
  box(hull,'Landing strut',(side*1.2,y,.65),(.15,.18,.95),steel,.025)
  # X-shaped structural arms terminate in independently animated rotor hubs.
  arm=box(hull,'Braced outrigger',(side*2.1,y*1.85,1.9),(3,.38,.3),armor,.04);arm.rotation_euler.z=side*y*.62
  brace=box(hull,'Lower arm spar',(side*2.1,y*1.85,1.62),(3,.13,.12),trim,.01);brace.rotation_euler.z=side*y*.62
  x,ry=side*3.3,y*2.7
  cyl(hull,'Motor pedestal',(x,ry,2.06),.36,.62,steel,verts=12)
  cyl(hull,'Motor heat sink',(x,ry,2.3),.43,.18,dark,verts=12)
  idx=(0 if side<0 else 2)+(0 if y<0 else 1)
  rotor=empty('Rotor'+str(idx),hull,(x,ry,2.48))
  cyl(rotor,'Rotor spindle',(0,0,.02),.21,.24,trim,verts=12)
  for a in [0,math.pi]:
   blade=box(rotor,'Swept carbon blade',(math.cos(a)*1.02,math.sin(a)*1.02,.11),(1.9,.24,.065),dark,.01);blade.rotation_euler.z=a+.1
   cap=box(rotor,'Orange blade tip',(math.cos(a)*1.77,math.sin(a)*1.77+.07*(1 if a==0 else -1),.12),(.32,.25,.07),trim,0);cap.rotation_euler.z=a+.1
 for y in [-.5,-.1,.3,.7,1.1]:box(hull,'Cooling grille',(side*.57,y,2.405),(.36,.1,.025),dark,0)
 cyl(hull,'Missile pod',(side*1.48,-.1,1.08),.37,2.35,armor,(math.pi/2,0,0),12)
 for dz in [-.12,.12]:
  for dx in [-.12,.12]:cyl(hull,'Launch tube',(side*1.48+dx,-1.3,1.08+dz),.095,.12,dark,(math.pi/2,0,0),8)
for i,x in enumerate([-1.6,-1.36,1.48]):empty('LaunchMuzzle'+str(i),turret,(x,-1.45,-.1))
cyl(turret,'Gimbal housing',(0,-1.64,-.25),.4,.45,steel,(math.pi/2,0,0),12)
cyl(turret,'Camera lens',(0,-1.89,-.25),.23,.07,lens,(math.pi/2,0,0),12)
gun=empty('LightGun',turret,(0,-1.1,-.5));box(gun,'Gun receiver',(0,-.25,0),(.34,.6,.26),steel,.025)
cyl(gun,'Gun barrel',(0,-.85,0),.07,.9,dark,(math.pi/2,0,0),10)
empty('LightMuzzle',gun,(0,-1.32,0));empty('Muzzle',turret,(0,-2.42,-.5))
for x in [-.55,.55]:
 cyl(hull,'Antenna',(x,1.2,2.57),.035,.9,steel,verts=6)
 box(hull,'Side panel',(x*2,0,1.6),(.08,1.6,.43),trim,.02)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/boss-quadcopter.blend'))
buckets={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.name!='Core' and len(o.data.materials)==1:buckets.setdefault((o.parent,o.data.materials[0].name),[]).append(o)
for objects in buckets.values():
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/boss-quadcopter.glb'),export_format='GLB')
print('QUADCOPTER_COMPLETE')
