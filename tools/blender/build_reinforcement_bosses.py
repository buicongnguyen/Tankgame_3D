"""Three articulated reinforcement bosses and light guns for all older rigs."""
import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import material,box,cyl
from boss_machine_gun import add_vanguard_gun

def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o

def light_gun(parent,loc=(1.05,.3,1.15),large=False):
 gun=empty('LightGun',parent,loc)
 steel=material('AuxiliarySteel',(.13,.17,.21),.7,.35);trim=material('AuxiliaryTrim',(.9,.54,.15),.55,.4);dark=material('AuxiliaryBore',(.025,.032,.04),.2,.85)
 cyl(gun,'Auxiliary swivel',(0,0,-.12),.22,.17,trim,verts=10)
 box(gun,'Auxiliary receiver',(0,-.16,.1),(.34,.60,.30),steel,.025)
 box(gun,'Auxiliary belt box',(.26,.02,.12),(.20,.35,.28),trim,.02)
 cyl(gun,'Auxiliary barrel',(0,-.73,.1),.08,1,steel,(math.pi/2,0,0),10)
 cyl(gun,'Auxiliary muzzle brake',(0,-1.14,.1),.115,.19,trim,(math.pi/2,0,0),10)
 cyl(gun,'Auxiliary muzzle bore',(0,-1.242,.1),.065,.012,dark,(math.pi/2,0,0),10)
 empty('LightMuzzle',gun,(0,-1.27,.1))
 if large:gun.scale=(1.35,1.35,1.35)
 return gun

def export(name):
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender'/(name+'.blend')))
 # Keep the editable scene intact; merge static surfaces only for the runtime export.
 buckets={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o.name!='Core' and len(o.data.materials)==1:
   buckets.setdefault((o.parent,o.data.materials[0].name),[]).append(o)
 for objects in buckets.values():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/(name+'.glb')),export_format='GLB')

for kind in ['rail','missile','walker','helicopter','spider','laser']:
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender'/('boss-'+kind+'.blend')))
 old=bpy.data.objects.get('LightGun')
 if old:
  for child in list(old.children_recursive):bpy.data.objects.remove(child,do_unlink=True)
  bpy.data.objects.remove(old,do_unlink=True)
 light_gun(bpy.data.objects['Turret'],(0,-2.1,-.15) if kind=='helicopter' else (0,-.65,1.35) if kind=='missile' else (1.05,.3,1.15))
 export('boss-'+kind)

for kind in ['quad-mech','siege-mech','missile-truck']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 armor=material(kind+'Armor',(.16,.24,.30) if kind=='quad-mech' else (.29,.33,.22) if kind=='siege-mech' else (.26,.22,.20),.55,.45)
 trim=material(kind+'Trim',(.94,.40,.10),.5,.38);dark=material(kind+'Rubber',(.04,.055,.07),.1,.8);steel=material(kind+'Steel',(.28,.34,.39),.75,.32);glass=material(kind+'Optics',(.03,.53,.64),.45,.17)
 glow=material(kind+'Core',(.15,.9,.6),.3,.26);n=glow.node_tree.nodes.get('Principled BSDF');n.inputs['Emission Color'].default_value=(.08,.7,.4,1);n.inputs['Emission Strength'].default_value=.6
 root=empty('boss-'+kind);hull=empty('Hull',root);turret=empty('Turret',root,(0,0,1.17))
 if kind!='missile-truck':
  box(hull,'Pelvic armor',(0,0,2.85),(1.9,1.2,.7),armor,.1)
  cyl(hull,'Waist turntable',(0,0,3.3),.72,.35,steel,verts=12)
  for side,name in [(-1,'LeftLeg'),(1,'RightLeg')]:
   leg=empty(name,hull,(side*.66,0,2.65))
   cyl(leg,'Hip bearing',(0,0,0),.35,.32,trim,(0,math.pi/2,0),10)
   box(leg,'Thigh armor',(0,0,-.53),(.75,.85,1.02),armor,.06)
   cyl(leg,'Knee servo',(0,-.02,-1.12),.33,.76,steel,(0,math.pi/2,0),10)
   box(leg,'Knee cap',(0,-.46,-1.12),(.63,.18,.50),trim,.03)
   box(leg,'Shin plate',(0,-.1,-1.72),(.68,.72,1.05),armor,.06)
   cyl(leg,'Rear hydraulic piston',(side*.31,.31,-1.69),.10,.93,steel,verts=8)
   box(leg,'Armored foot',(0,-.31,-2.40),(.94,1.45,.38),dark,.07)
   box(leg,'Toe cap',(0,-.89,-2.27),(.9,.35,.27),trim,.025)
  box(turret,'Torso skeleton',(0,0,2.95),(2.1,1.25,2.1),dark,.08)
  chest=box(turret,'Sloped breastplate',(0,-.42,3.15),(2.45,.68,1.25),armor,.12);chest.rotation_euler.x=-.12
  box(turret,'Core',(0,-.81,3.10),(.65,.09,.55),glow,.04)
  for x in [-.83,.83]:
   box(turret,'Chest armor rib',(x,-.81,3.35),(.18,.15,.9),trim,.02)
   box(turret,'Back power unit',(x,.8,3.15),(.5,.7,1.5),steel,.06)
   for z in [2.7,3.0,3.3,3.6]:box(turret,'Power-unit vent',(x,1.17,z),(.37,.04,.11),dark,0)
  cyl(turret,'Neck servo',(0,0,4.27),.3,.30,steel,verts=12)
  box(turret,'Helmet',(0,-.07,4.77),(1.08,1.05,.85),armor,.12)
  box(turret,'Visor brow',(0,-.61,4.98),(1.16,.17,.18),trim,.025)
  box(turret,'Cyan visor',(0,-.61,4.76),(.79,.09,.23),glass,.03)
  for side,suffix in [(-1,'L'),(1,'R')]:
   arm=empty('Arm'+suffix,turret,(side*1.64,0,3.73))
   cyl(arm,'Shoulder bearing',(0,0,0),.46,.6,steel,(0,math.pi/2,0),12)
   box(arm,'Shoulder plate',(side*.08,0,.2),(.98,1.18,.60),trim,.07)
   box(arm,'Upper arm',(0,0,-.6),(.60,.62,.91),armor,.045)
   cyl(arm,'Elbow bearing',(0,-.08,-1.04),.28,.66,steel,(0,math.pi/2,0),10)
   box(arm,'Forearm housing',(0,-.53,-1.14),(.78,1.25,.63),armor,.07)
   if kind=='quad-mech':
    for j,x in enumerate([-.22,.22]):
     index=(0 if side<0 else 2)+j
     cyl(arm,'Forearm cannon',(x,-1.42,-1.13),.12,1.43,steel,(math.pi/2,0,0),10)
     cyl(arm,'Cannon brake',(x,-2.04,-1.13),.18,.24,trim,(math.pi/2,0,0),10)
     cyl(arm,'Cannon bore',(x,-2.166,-1.13),.091,.014,dark,(math.pi/2,0,0),10)
     empty('GunMuzzle'+str(index),arm,(x,-2.20,-1.13))
   elif side<0:
    cyl(arm,'Hand cannon',(0,-1.35,-1.13),.19,1.5,steel,(math.pi/2,0,0),12)
    cyl(arm,'Hand muzzle',(0,-2.02,-1.13),.26,.20,trim,(math.pi/2,0,0),12)
    cyl(arm,'Hand bore',(0,-2.126,-1.13),.15,.012,dark,(math.pi/2,0,0),12)
    empty('GunMuzzle0',arm,(0,-2.15,-1.13))
  if kind=='quad-mech':add_vanguard_gun(turret)
  if kind=='siege-mech':light_gun(turret,(1.65,-.72,2.55),True)
  empty('Muzzle',turret,(0,-2.2,2.60))
 else:
  box(hull,'Truck chassis',(0,0,.88),(3.2,7.6,.56),steel,.05)
  box(hull,'Armored cab',(0,-2.5,1.98),(3.0,2.55,1.62),armor,.12)
  box(hull,'Cab roof',(0,-2.45,2.88),(3.12,2.62,.20),trim,.045)
  box(hull,'Split windshield',(0,-3.795,2.23),(2.51,.06,.73),glass,.045)
  box(hull,'Windscreen pillar',(0,-3.84,2.23),(.12,.06,.8),steel,.015)
  box(hull,'Front bumper',(0,-4.02,.85),(3.6,.27,.34),trim,.04)
  for x in [-.65,-.32,0,.32,.65]:box(hull,'Radiator grille',(x,-3.83,1.40),(.16,.05,.47),dark,0)
  for side in [-1,1]:
   box(hull,'Cab side window',(side*1.52,-2.63,2.26),(.05,1.5,.66),glass,.025)
   box(hull,'Side mirror',(side*1.86,-3.39,2.25),(.29,.21,.47),steel,.03)
   box(hull,'Cab step',(side*1.68,-2.3,1.02),(.4,1.5,.15),steel,.025)
   box(hull,'Headlight',(side*1.17,-3.82,1.49),(.42,.08,.29),glow,.025)
   for y in [-2.8,-1.1,1.15,2.85]:
    cyl(hull,'All-terrain tire',(side*1.70,y,.64),.64,.49,dark,(0,math.pi/2,0),12)
    cyl(hull,'Wheel hub',(side*1.967,y,.64),.31,.04,trim,(0,math.pi/2,0),10)
    box(hull,'Wheel arch',(side*1.61,y,1.31),(.68,1.42,.15),armor,.02)
   box(hull,'Rear stabilizer',(side*1.55,3.37,.64),(.28,.3,1.07),steel,.025)
   box(hull,'Stabilizer foot',(side*1.55,3.37,.16),(.73,.73,.13),dark,.015)
  box(turret,'Launch deck',(0,1.35,.49),(3.1,4.43,.35),armor,.06)
  box(turret,'Core',(0,3.60,.60),(.8,.09,.53),glow,.025)
  light_gun(turret,(0,-1.3,2.07))
  empty('Muzzle',turret,(0,-3,1.2))
 if kind in ['siege-mech','missile-truck']:
  for side,suffix in [(-1,'L'),(1,'R')]:
   launcher=empty('Launcher'+suffix,turret,(side*(1.38 if kind=='siege-mech' else .88),.75,4.2 if kind=='siege-mech' else 1.28));launcher.rotation_euler.x=-.28
   length=2.25 if kind=='siege-mech' else 4.3;r=.38 if kind=='siege-mech' else .54
   box(launcher,'Launcher cradle',(0,.15,-.31),(r*2.15,length,.38),armor,.055)
   cyl(launcher,'Missile casing',(0,0,.05),r,length,steel,(math.pi/2,0,0),12)
   for y in [-length*.32,length*.32]:cyl(launcher,'Canister band',(0,y,.05),r*1.08,.16,trim,(math.pi/2,0,0),12)
   bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=.015,depth=.65);o=bpy.context.object;o.name='Missile nose';o.parent=launcher;o.location=(0,-length/2-.32,.05);o.rotation_euler.x=math.pi/2;o.data.materials.append(trim)
   for x in [-r,r]:box(launcher,'Missile fin',(x,length*.38,.05),(.08,.62,.59),dark,.01)
   empty('LaunchMuzzle'+str(0 if side<0 else 1),launcher,(0,-length/2-.67,.05))
 export('boss-'+kind)
print('REINFORCEMENT_BOSSES_COMPLETE')
