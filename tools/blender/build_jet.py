import bpy,math,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import material,box,cyl
bpy.ops.wm.read_factory_settings(use_empty=True)
def empty(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
root=empty('boss-jet');hull=empty('Hull',root);turret=empty('Turret',root)
armor=material('Jet blue',(.12,.23,.32),.65,.35);dark=material('Graphite',(.025,.035,.05),.4,.55);gold=material('Orange markings',(1,.35,.035),.4,.4);glass=material('Canopy',(.08,.7,.85),.7,.18);green=material('Core green',(.2,1,.4),.3,.3)
box(hull,'Fuselage',(0,0,.65),(1.3,5,.85),armor,.25)
bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.65,radius2=.08,depth=2,location=(0,-3.3,.65),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='Tapered nose';o.parent=hull;o.data.materials.append(armor)
box(hull,'Canopy',(0,-1.15,1.2),(.8,1.8,.5),glass,.2)
for side in [-1,1]:
 verts=[(side*.5,-1,.55),(side*4,1.4,.55),(side*3.8,2,.55),(side*.5,1.5,.55)]
 mesh=bpy.data.meshes.new('Swept wing');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update();o=bpy.data.objects.new('Swept wing',mesh);bpy.context.collection.objects.link(o);o.parent=hull;o.data.materials.append(armor);sol=o.modifiers.new('Wing thickness','SOLIDIFY');sol.thickness=.12
 box(hull,'Wing marking',(side*2.2,1.2,.65),(.4,1,.06),gold,.01)
 box(hull,'Tailplane',(side*1.1,2.25,.7),(1.8,.65,.14),armor,.04)
 cyl(hull,'Engine',(side*.52,1.8,.55),.4,1.7,dark,(math.pi/2,0,0),12)
 cyl(hull,'Exhaust',(side*.52,2.7,.55),.26,.08,gold,(math.pi/2,0,0),12)
 cyl(hull,'Underwing missile',(side*1.7,.3,.25),.13,1.7,gold,(math.pi/2,0,0),8)
box(hull,'Vertical tail',(0,1.9,1.4),(.16,1.3,1.5),armor,.05)
box(turret,'Core',(0,.9,1.15),(.7,.55,.12),green,.02)
gun=empty('LightGun',turret,(0,-1,.3));cyl(gun,'Cannon',(0,-1.5,0),.09,1.6,dark,(math.pi/2,0,0),8)
empty('LightMuzzle',gun,(0,-2.35,0));empty('Muzzle',turret,(0,-3.4,.3))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/boss-jet.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/boss-jet.glb'),export_format='GLB')
