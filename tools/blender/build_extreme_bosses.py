"""Original animated frontier boss rigs and snow pine; reproducible Blender GLBs."""
import bpy, math, sys, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import material,box,cyl

def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o

def ico(name,parent,loc,scale,mat):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;o.data.materials.append(mat);return o

def cone(name,parent,loc,r,h,mat,n=12):
 bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=.06,depth=h);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.data.materials.append(mat);return o

for kind in ['helicopter','spider','laser','white-pine']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 armor=material('ExtremeArmor',(.18,.26,.30),.45,.48);trim=material('ExtremeTrim',(.78,.39,.13),.55,.4);dark=material('ExtremeRubber',(.045,.065,.08),.1,.8);glass=material('ExtremeOptics',(.025,.31,.41),.5,.16);glow=material('ExtremeCore',(.15,.94,.72),.3,.3)
 n=glow.node_tree.nodes.get('Principled BSDF');n.inputs['Emission Color'].default_value=(.06,.5,.3,1);n.inputs['Emission Strength'].default_value=.5
 root=empty(kind if kind=='white-pine' else 'boss-'+kind)
 if kind=='white-pine':
  bark=material('SnowPineBark',(.29,.24,.20));snow=material('SnowPineFrost',(.85,.93,.94));shade=material('SnowPineNeedles',(.37,.57,.58))
  cyl(root,'Trunk',(0,0,2.4),.24,4.8,bark,verts=10)
  for i in range(5):
   z=1.8+i*.65;r=1.75-i*.27
   cone('Frosted crown',root,(0,0,z),r,1.8,snow)
   for j in range(6):
    a=j*math.tau/6+i*.4;cone('Snow branch',root,(math.cos(a)*r*.58,math.sin(a)*r*.58,z-.24),r*.36,.8,shade if j%3==0 else snow,8)
 else:
  hull=empty('Hull',root);turret=empty('Turret',root,(0,0,1.17))
  box(turret,'Core',(0,.7,1),(.62,.72,.45),glow,.06)
  if kind=='helicopter':
   ico('Armored fuselage',hull,(0,0,1.55),(1.35,2.8,1.1),armor)
   ico('Cockpit glazing',hull,(0,-1.72,1.7),(1.03,1.16,.74),glass)
   box(hull,'Nose keel',(0,-2.52,1.1),(.48,.55,.34),trim,.08)
   box(hull,'Tail boom',(0,3.6,1.64),(.38,4.8,.46),armor,.08)
   box(hull,'Tailplane',(0,5.4,1.8),(2.4,.7,.1),trim,.03)
   fin=box(hull,'Vertical tail',(0,5.8,2.15),(.15,.9,1.5),armor,.03);fin.rotation_euler.x=.18
   rotor=empty('Rotor',hull,(0,.2,2.92));cyl(rotor,'Rotor hub',(0,0,0),.32,.28,trim,verts=12)
   for i in range(4):
    a=i*math.pi/2;o=box(rotor,'Rotor blade',(math.cos(a)*2.65,math.sin(a)*2.65,.08),(5,.24,.07),dark,.01);o.rotation_euler.z=a
   tail=empty('TailRotor',hull,(.24,5.7,2.4))
   for a in [0,math.pi/2]:
    o=box(tail,'Tail blade',(0,0,0),(.08,1.9,.14),dark,.01);o.rotation_euler.x=a
   for side in [-1,1]:
    box(hull,'Landing skid',(side*1.25,0,.28),(.14,4.5,.18),dark,.04)
    for y in [-1.1,1.1]:box(hull,'Skid support',(side*1.05,y,.68),(.16,.15,.9),trim,.02)
    box(hull,'Missile wing',(side*1.8,.2,1.6),(1.5,.75,.15),armor,.04)
    cyl(hull,'Rocket pod',(side*2.15,-.2,1.23),.38,1.75,dark,(math.pi/2,0,0),12)
    for x in [-.15,.15]:cyl(hull,'Pod muzzle',(side*2.15+x,-1.12,1.23),.1,.12,trim,(math.pi/2,0,0),8)
    box(hull,'Engine housing',(side*.65,.6,2.5),(.6,1.65,.36),armor,.06)
    for y in [.1,.35,.6,.85,1.1]:box(hull,'Engine grille',(side*.65,y,2.7),(.43,.09,.04),dark,0)
   empty('Muzzle',turret,(0,-2.7,.1))
  elif kind=='spider':
   ico('Segmented carapace',turret,(0,.1,.28),(1.85,2.15,.85),armor)
   box(hull,'Underbody',(0,0,.67),(2.6,2.8,.5),dark,.1)
   for i,y in enumerate([-1.65,-.55,.55,1.65]):
    for side in [-1,1]:
     leg=empty('Leg'+str(i)+('L' if side<0 else 'R'),hull,(side*1.2,y,1.25))
     cyl(leg,'Hip servo',(0,0,0),.23,.24,trim,(math.pi/2,0,0),10)
     o=box(leg,'Upper leg',(side*.75,0,.15),(1.65,.28,.28),armor,.045);o.rotation_euler.y=-side*.28
     cyl(leg,'Knee joint',(side*1.5,0,.32),.23,.3,trim,(math.pi/2,0,0),10)
     o=box(leg,'Lower strut',(side*1.91,0,-.47),(.3,.25,1.8),dark,.035);o.rotation_euler.y=-side*.4
     box(leg,'Claw foot',(side*2.22,-.12,-1.05),(.48,.65,.2),trim,.04)
   for x in [-.65,.65]:
    cyl(turret,'Forward plasma gun',(x,-2.07,.23),.18,1.5,dark,(math.pi/2,0,0),12)
    cyl(turret,'Barrel ring',(x,-2.68,.23),.23,.16,trim,(math.pi/2,0,0),12)
    for y in [-.3,.1,.5,.9]:box(turret,'Carapace rib',(x,y,1),(.17,.22,.12),trim,.025)
   for x in [-.55,0,.55]:ico('Sensor eye',turret,(x,-1.78,.68),(.16,.12,.12),glow)
   empty('Muzzle',turret,(0,-2.8,.23))
  else:
   box(hull,'Lower chassis',(0,0,.73),(3,4.3,.8),armor,.12)
   for side in [-1,1]:
    box(hull,'Track housing',(side*1.65,0,.57),(.7,4.8,.85),dark,.15)
    for y in [-1.8,-1,-.2,.6,1.4]:
     cyl(hull,'Road wheel',(side*2,y,.56),.28,.1,trim,(0,math.pi/2,0),10)
     box(hull,'Track shoe',(side*1.65,y,1.03),(.7,.18,.1),armor,.012)
    box(hull,'Battery enclosure',(side*1.2,.2,1.3),(.5,2.8,.45),trim,.06)
   ico('Laser turret',turret,(0,0,.4),(1.45,1.6,.7),armor)
   cyl(turret,'Laser emitter',(0,-2.12,.45),.30,2.9,dark,(math.pi/2,0,0),16)
   for y in [-.8,-1.3,-1.8,-2.3,-2.8]:cyl(turret,'Cooling coil',(0,y,.45),.42,.15,glow,(math.pi/2,0,0),12)
   cyl(turret,'Focusing lens',(0,-3.6,.45),.27,.05,glass,(math.pi/2,0,0),16)
   for x in [-.7,.7]:
    box(turret,'Capacitor',(x,.6,.8),(.4,.9,.4),trim,.08)
    for y in [.25,.5,.75,.95]:box(turret,'Cooling grille',(x,y,1.02),(.32,.07,.04),dark,0)
   empty('Muzzle',turret,(0,-3.7,.45))
 name=root.name
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/(name+'.glb')),export_format='GLB')
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender'/(name+'.blend')))
print('EXTREME_RIGS_COMPLETE')
