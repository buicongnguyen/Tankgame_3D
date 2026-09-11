"""Rebuild original Steel Front assets with Blender 4.5+. Run from repository root."""
import bpy, math, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'models'
SOURCE = ROOT / 'assets' / 'blender'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0.0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal
    bs.inputs['Roughness'].default_value=.65
    return m
armor=mat('Armor',(.26,.40,.36),.25)
trim=mat('Trim',(.64,.79,.69),.2)
track=mat('Tracks',(.065,.09,.10),.3)
metal=mat('Gunmetal',(.18,.23,.23),.6)
light=mat('Signal',(.26,.95,.80),.1)
concrete=mat('Concrete',(.43,.46,.43))
sand=mat('Supply',(.56,.37,.18))
red=mat('Fuel',(.64,.20,.105),.25)
white=mat('Rescue',(.78,.79,.66))

def empty(name, parent=None, loc=(0,0,0)):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.location=loc; o.parent=parent; return o

def box(name,loc,scale,m,parent,bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,0)); o=bpy.context.object; o.name=name
    o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.parent=parent; o.location=loc; o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Machined edges','BEVEL'); mod.width=bevel; mod.segments=1
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def cylinder(name,loc,r,depth,m,parent,rot=(0,0,0),verts=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth)
    o=bpy.context.object; o.name=name; o.parent=parent; o.location=loc; o.rotation_euler=rot; o.data.materials.append(m); return o

roots=[]
tank=empty('Tank'); roots.append(tank)
hull=empty('Hull',tank)
box('LowerHull',(0,0,.63),(2.0,3.25,.68),armor,hull,.15)
box('UpperHull',(0,-.18,1.02),(1.86,2.65,.36),armor,hull,.14)
for side in [-1,1]:
    box('TrackBelt',(side*1.13,0,.48),(.53,3.65,.77),track,hull,.2)
    box('Fender',(side*1.1,0,.94),(.65,3.65,.17),trim,hull)
    for y in [-1.25,-.62,0,.62,1.25]:
        cylinder('RoadWheel',(side*1.41,y,.47),.29,.08,metal,hull,(0,math.pi/2,0))
    for y in [-1.45,-1.05,-.65,-.25,.15,.55,.95,1.35]:
        box('Tread',(side*1.14,y,.1),(.58,.13,.11),metal,hull,.01)
    box('Headlamp',(side*.73,-1.58,1.01),(.25,.1,.15),light,hull,.02)
for x in [-.55,-.27,0,.27,.55]: box('EngineVent',(x,1.05,1.23),(.12,.55,.06),track,hull,.01)
turret=empty('Turret',tank,(0,-.1,1.17))
cylinder('TurretRing',(0,0,0),.78,.20,metal,turret)
box('TurretArmor',(0,.08,.35),(1.53,1.75,.58),armor,turret,.2)
box('CommandStripe',(0,.14,.655),(.22,1.1,.02),light,turret,.01)
cylinder('Hatch',(.34,.39,.68),.27,.10,trim,turret)
cylinder('GunBarrel',(0,-1.56,.35),.105,1.65,metal,turret,(math.pi/2,0,0))
box('MuzzleBrake',(0,-2.42,.35),(.29,.34,.25),track,turret,.035)
empty('Muzzle',turret,(0,-2.65,.35))
cylinder('Antenna',(-.57,.54,1.13),.025,1.15,metal,turret)

truck=empty('Transport'); roots.append(truck)
box('Chassis',(0,0,.55),(2.1,4.4,.35),metal,truck)
box('Cab',(0,-1.36,1.24),(1.9,1.55,1.35),white,truck,.13)
box('Windshield',(0,-2.15,1.51),(1.58,.035,.49),track,truck,.02)
box('Cargo',(0,.83,1.35),(2.12,2.7,1.55),white,truck,.1)
box('RescueStripe',(0,.83,2.15),(.42,2.5,.04),light,truck)
for side in [-1,1]:
    for y in [-1.4,.55,1.48]: cylinder('Wheel',(side*1.05,y,.45),.44,.3,track,truck,(0,math.pi/2,0))
    box('CrossV',(side*1.074,.7,1.5),(.025,.22,.83),light,truck,.01)
    box('CrossH',(side*1.08,.7,1.5),(.025,.8,.22),light,truck,.01)

wall=empty('Barricade'); roots.append(wall)
box('Foot',(0,0,.18),(3.2,1.15,.36),concrete,wall)
box('Barrier',(0,0,.85),(3,.7,1.15),concrete,wall,.12)
for x in [-.9,.0,.9]: box('Warning',(x,-.37,.91),(.38,.03,.29),sand,wall,.01)
crate=empty('Crate'); roots.append(crate)
box('CrateBody',(0,0,.65),(1.25,1.25,1.3),sand,crate)
for x in [-.43,.43]: box('Band',(x,0,.66),(.09,1.29,1.35),metal,crate,.01)
barrel=empty('Barrel'); roots.append(barrel)
cylinder('FuelDrum',(0,0,.68),.47,1.35,red,barrel)
for z in [.16,.65,1.16]: cylinder('DrumBand',(0,0,z),.49,.08,metal,barrel)
relay=empty('Relay'); roots.append(relay)
box('RelayBase',(0,0,.35),(2.3,2.3,.7),concrete,relay)
cylinder('Mast',(0,0,2.5),.14,4.5,metal,relay)
box('Cabinet',(.0,0,1.1),(1.1,.75,1.15),armor,relay)
for z in [1.0,1.25,1.5]: box('RelayLight',(0,-.39,z),(.75,.035,.07),light,relay,.01)
cylinder('Dish',(0,-.14,4.2),.8,.15,white,relay,(math.pi/3,0,0),16)

import sys
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import core
core(tank,hull,turret,truck,wall,crate,barrel,relay,armor,trim,track,metal,light,concrete,sand,red,white)
report=[]
for root in roots:
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for obj in root.children_recursive: obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/(root.name.lower()+'.glb')),export_format='GLB',use_selection=True,export_yup=True)
    triangles=sum(len(o.data.polygons) for o in root.children_recursive if o.type=='MESH')
    report.append({'asset':root.name,'polygons':triangles,'bytes':(OUT/(root.name.lower()+'.glb')).stat().st_size})
# Space the source collection for comfortable manual editing; exports remain centered.
for i,root in enumerate(roots): root.location.x=i*5
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'steel-front.blend'))
(OUT/'manifest.json').write_text(json.dumps({'generator':'Blender 4.5 / tools/blender/build_assets.py','assets':report},indent=2))
print('STEEL_FRONT_ASSETS',json.dumps(report))

