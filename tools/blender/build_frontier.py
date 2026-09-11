"""Blender-authored polar, volcanic, desert, jungle and city environment kit."""
import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from asset_detail import material,box,cyl
bpy.ops.wm.read_factory_settings(use_empty=True)
roots=[]
def root(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);roots.append(o);return o
def cone(parent,name,loc,r1,r2,h,m,n=12):
 bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r1,radius2=r2,depth=h);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.data.materials.append(m);return o
def ico(parent,name,loc,size,m):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=size;o.data.materials.append(m);return o
ice=material('GlacierIce',(.33,.66,.79),.12,.22);frost=material('SnowCaps',(.83,.93,.95),0,.87)
rock=material('Basalt',(.14,.13,.15),.1,.88);ash=material('CooledAsh',(.26,.23,.23));lava=material('MoltenRock',(1,.16,.015),0,.5)
node=lava.node_tree.nodes.get('Principled BSDF');node.inputs['Emission Color'].default_value=(1,.065,.008,1);node.inputs['Emission Strength'].default_value=.7
wood=material('TropicalBark',(.31,.20,.11));green=material('CanopyGreen',(.10,.29,.14));tips=material('CanopySun',(.26,.48,.16));palmleaf=material('PalmFronds',(.38,.47,.17))
wall=material('CityPlaster',(.52,.58,.57));trim=material('CityConcrete',(.30,.36,.37));window=material('CityWindow',(.035,.16,.22),.35,.2);roof=material('CityRoof',(.19,.23,.26));accent=material('CityOchre',(.84,.51,.20))
g=root('glacier')
for i,(x,y,h,r) in enumerate([(-1.8,0,3.1,1.5),(0,.3,4.7,1.8),(1.9,-.3,3.7,1.5),(0,-1.1,2.5,1.4)]):
 o=cone(g,'Ice spire',(x,y,h/2),r,r*.45,h,ice,8);o.rotation_euler.z=i*.3
 cone(g,'Frost cap',(x,y,h-.06),r*.47,r*.25,.28,frost,8)
 for z in [h*.35,h*.65]:box(g,'Ice fracture',(x,-r*.70,z),(r*.9,.035,.05),frost,0)
v=root('volcano');rings=[(13,0),(10,2),(7.3,6),(4.4,11),(3.7,12),(2.7,10.8),(2.3,9.8)];verts=[];faces=[];N=28
for k,(r,h) in enumerate(rings):
 for i in range(N):
  a=i*2*math.pi/N;rough=(math.sin(i*7.1+k)*.3 if k<4 else .08*math.sin(i*5))
  verts.append(((r+rough)*math.cos(a),(r+rough)*math.sin(a),h+(.3*math.sin(i*2.3) if k in [3,4] else 0)))
for k in range(len(rings)-1):
 for i in range(N):faces.append((k*N+i,k*N+(i+1)%N,(k+1)*N+(i+1)%N,(k+1)*N+i))
faces.append(tuple(range((len(rings)-1)*N,len(rings)*N)))
mesh=bpy.data.meshes.new('Crater slopes');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('Caldera',mesh);bpy.context.collection.objects.link(o);o.parent=v
for m in [rock,ash,lava]:o.data.materials.append(m)
for p in o.data.polygons:p.material_index=2 if p.index>=N*4 else 1 if p.index%7==0 else 0
for i in [2,9,15,22]:
 a=i*2*math.pi/N;o=box(v,'Lava seam',(math.cos(a)*6,math.sin(a)*6,5.7),(.23,5.5,.08),lava,0);o.rotation_euler=(.60,0,a-math.pi/2)
r=root('volcanic-rock');ico(r,'Cooling bomb',(0,0,0),(1.2,.95,1.1),rock)
for i in range(3):
 o=box(r,'Ember fracture',(0,-.79+i*.14,.45-i*.25),(1.3,.09,.07),lava,.02);o.rotation_euler.y=.2*i
p=root('palm');cone(p,'Palm trunk',(0,0,2.5),.38,.22,5,wood)
for z in [.7,1.3,1.9,2.5,3.1,3.7,4.3]:cone(p,'Bark ring',(0,0,z),.34,.30,.11,wood,10)
for i in range(9):
 a=i*math.pi*2/9;vertices=[]
 for j in range(6):
  t=j/5;reach=t*3.5;z=5.1+math.sin(t*math.pi)*.55-t*.65;width=math.sin(t*math.pi)*.48+.025
  for side in [-1,1]:vertices.append((math.cos(a)*reach+math.sin(a)*width*side,math.sin(a)*reach-math.cos(a)*width*side,z))
 faces=[(j*2,j*2+1,j*2+3,j*2+2) for j in range(5)]
 m=bpy.data.meshes.new('Frond');m.from_pydata(vertices,[],faces);o=bpy.data.objects.new('Palm frond',m);bpy.context.collection.objects.link(o);o.parent=p;o.data.materials.append(palmleaf);solid=o.modifiers.new('Leaf thickness','SOLIDIFY');solid.thickness=.035;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=solid.name)
t=root('jungle-tree');cone(t,'Buttress trunk',(0,0,2.4),.68,.32,4.8,wood)
for i in range(5):
 a=i*math.pi*2/5;o=cone(t,'Buttress root',(math.cos(a)*.42,math.sin(a)*.42,.7),.3,.10,1.5,wood,8);o.rotation_euler=(math.sin(a)*.45,-math.cos(a)*.45,0)
for i,(x,y,z,s) in enumerate([(0,0,5.8,2.8),(-1.8,0,4.9,2.0),(1.7,.3,5.2,2.1),(0,-1.5,5,2),(0,1.6,5.3,2)]):ico(t,'Broadleaf canopy',(x,y,z),(s,s,.70*s),green if i%2 else tips)
c=root('cityblock');box(c,'Foundation',(0,0,.2),(8.2,7.2,.4),trim,.06);box(c,'Apartment body',(0,0,3.5),(7.8,6.8,6.6),wall,.08)
for z in [2.25,4.4,6.65]:box(c,'Floor belt',(0,0,z),(7.98,6.98,.12),trim,.02)
for side in [-1,1]:
 for z in [1.3,3.4,5.5]:
  for x in [-2.6,-.9,.9,2.6]:
   box(c,'Window frame',(x,side*3.425,z),(1.15,.08,1.25),trim,0);box(c,'Window glass',(x,side*3.48,z),(.96,.035,1.08),window,0)
 for z in [1.3,3.4,5.5]:
  for y in [-2.1,0,2.1]:box(c,'Side window',(side*3.925,y,z),(.05,1.1,1.2),window,0)
box(c,'Entrance',(0,-3.48,.8),(1.3,.12,1.6),window,0);box(c,'Awning',(0,-3.95,1.85),(2.5,1,.18),accent,.02)
box(c,'Roof',(0,0,6.9),(8.1,7.1,.3),roof,.04)
for x,y,w,d in [(-3.95,0,.18,7),(3.95,0,.18,7),(0,-3.45,8,.18),(0,3.45,8,.18)]:box(c,'Parapet',(x,y,7.2),(w,d,.5),trim,.01)
for x in [-2,1.8]:box(c,'Roof service unit',(x,.8,7.4),(1.4,1.3,.6),roof,.05)
from frontier_detail import refine
refine(roots)
for model in roots:
 bpy.ops.object.select_all(action='DESELECT');model.select_set(True)
 for child in model.children_recursive:child.select_set(True)
 bpy.context.view_layer.objects.active=model;bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{model.name}.glb'),export_format='GLB',use_selection=True)
for i,model in enumerate(roots):model.location.x=i*35
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/frontier-environments.blend'))
print('Frontier environment kit exported')
