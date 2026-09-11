"""Authored frontier silhouettes, construction detail and compact packed PBR surfaces."""
import bpy, math, random
from mathutils import Vector, noise
from asset_detail import box, cyl

def remove(obj):
 bpy.data.objects.remove(obj,do_unlink=True)

def mesh(parent,name,vertices,faces,material,smooth=False):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.parent=parent;data.materials.append(material)
 for p in data.polygons:p.use_smooth=smooth
 return obj

def branch(parent,name,a,b,r1,r2,material,sides=10):
 delta=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=sides,radius1=r1,radius2=r2,depth=delta.length)
 obj=bpy.context.object;obj.name=name;obj.parent=parent;obj.location=(Vector(a)+Vector(b))/2;obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();obj.data.materials.append(material)
 for p in obj.data.polygons:p.use_smooth=len(p.vertices)==4
 return obj

def crown(parent,name,loc,scale,material,seed,sub=2):
 rng=random.Random(seed);bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1)
 obj=bpy.context.object;obj.name=name;obj.parent=parent;obj.location=loc;obj.scale=scale;obj.data.materials.append(material)
 for v in obj.data.vertices:v.co*=.86+rng.random()*.25
 for p in obj.data.polygons:p.use_smooth=True
 return obj

def surface(material,kind,size=128):
 """Packed albedo/normal textures authored in Blender; no external image dependency."""
 color=material.diffuse_color[:3];heights=[]
 for y in range(size):
  for x in range(size):
   u=x/size;v=y/size;n=noise.noise_vector(Vector((u*9,v*9,2.7)))[0]
   fine=noise.noise_vector(Vector((u*37,v*37,5.1)))[1]
   h=.5+n*.23+fine*.08
   if kind=='bark':h=.5+math.sin(u*94+math.sin(v*12)*1.6)*.19+n*.13
   if kind=='ice':h=.5+math.sin(v*53+math.sin(u*8))* .12+n*.09
   if kind=='leaf':h=.55+math.sin(u*60+v*8)*.10+n*.20
   heights.append(h)
 pixels=[];normals=[]
 for y in range(size):
  for x in range(size):
   h=heights[y*size+x];factor=.84+h*.30
   pixels.extend([min(1,c*factor) for c in color]+[1])
   dx=heights[y*size+(x+1)%size]-heights[y*size+(x-1)%size];dy=heights[((y+1)%size)*size+x]-heights[((y-1)%size)*size+x]
   n=Vector((-dx*.7,-dy*.7,1)).normalized();normals.extend([n.x*.5+.5,n.y*.5+.5,n.z*.5+.5,1])
 nodes=material.node_tree.nodes;links=material.node_tree.links;shader=nodes.get('Principled BSDF')
 for suffix,data,is_normal in [('Surface',pixels,False),('Normal',normals,True)]:
  image=bpy.data.images.new(material.name+' '+suffix,width=size,height=size,alpha=False);image.colorspace_settings.name='Non-Color' if is_normal else 'Linear Rec.709';image.pixels=data;image.pack()
  texture=nodes.new('ShaderNodeTexImage');texture.image=image
  if is_normal:
   normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65;links.new(texture.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
  else:links.new(texture.outputs['Color'],shader.inputs['Base Color'])

def refine(roots):
 models={r.name:r for r in roots};m=bpy.data.materials
 # Natural ice ridges: chipped shelves, narrow strata and deep blue seams.
 g=models['glacier']
 for obj in list(g.children):remove(obj)
 for i,(x,y,h,r) in enumerate([(-1.8,0,3.1,1.45),(0,.3,4.7,1.75),(1.9,-.3,3.7,1.45),(0,-1.1,2.5,1.35)]):
  vertices=[];faces=[];N=12
  for level,(z,factor) in enumerate([(0,1),(.4,.95),(.72,.80),(1,.54)]):
   for j in range(N):
    a=j*math.tau/N;rad=r*factor*(1+.10*math.sin(j*5+i));vertices.append((x+math.cos(a)*rad,y+math.sin(a)*rad,h*z+.10*math.sin(j*3+i)*z))
  for k in range(3):
   for j in range(N):faces.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
  faces.append(tuple(range(3*N,4*N)));mesh(g,'Fractured ice ridge',vertices,faces,m['GlacierIce'])
  cap=crown(g,'Snow shelf',(x,y,h),(r*.56,r*.52,.20),m['SnowCaps'],i)
  for j in range(3):
   z=h*(.25+j*.20);a=(x-r*.4,y-r*.90,z);b=(x+r*.38,y-r*.82,z+.17)
   branch(g,'Fine ice seam',a,b,.025,.012,m['SnowCaps'],6)
 # Replace the cone and floating strips with an irregular continuous caldera.
 v=models['volcano']
 for obj in list(v.children):remove(obj)
 N=64;rings=[(13,0),(11.8,1.1),(9.7,3.0),(8.1,4.7),(6.4,7.0),(5.0,9.0),(4.0,11.7),(3.1,11.25),(2.5,9.55),(0,9.4)]
 def point(k,j,lift=0):
  radius,z=rings[k];a=j*math.tau/N;wave=math.sin(j*2.1)*.34+math.sin(j*.47)*.4
  radius+=wave*(.1 if k>=7 else 1);return (radius*math.cos(a),radius*math.sin(a),z+(.30*math.sin(j*.61) if k>3 else .15*math.sin(j*.44))+lift)
 vertices=[point(k,j) for k in range(len(rings)) for j in range(N)];faces=[]
 for k in range(len(rings)-1):
  for j in range(N):faces.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
 o=mesh(v,'Eroded caldera',vertices,faces,m['Basalt'],True);o.data.materials.append(m['CooledAsh']);o.data.materials.append(m['MoltenRock'])
 for p in o.data.polygons:p.material_index=2 if p.index>=N*8 else 1 if p.index%23 in [1,2,3] else 0
 for j in [3,16,29,46,58]:
  verts=[]
  for k in range(7):
   for side in [-1,1]:
    a=j+math.sin(k*2+j)*.55+side*.18;p=point(k,a,.045);verts.append(p)
  mesh(v,'Surface lava channel',verts,[(k*2,k*2+1,k*2+3,k*2+2) for k in range(6)],m['MoltenRock'])
 for j in range(9):
  a=j*2.39;rad=10.8;z=1.6;crown(v,'Basalt shoulder',(math.cos(a)*rad,math.sin(a)*rad,z),(.9,1.1,.7),m['Basalt'],80+j)
 r=models['volcanic-rock']
 for obj in list(r.children):remove(obj)
 crown(r,'Fractured basalt bomb',(0,0,0),(1.2,.95,1.1),m['Basalt'],41,3)
 for j in range(4):
  a=j*1.9;branch(r,'Ember vein',(-.7*math.cos(a),-.7*math.sin(a),.6),(.6*math.cos(a),.6*math.sin(a),.75),.045,.02,m['MoltenRock'],6)
 # Palm fronds have separate leaflets instead of broad solid ribbons.
 p=models['palm']
 for obj in list(p.children):
  if obj.name.startswith('Palm frond'):remove(obj)
 for i in range(9):
  a=i*math.tau/9;axis=Vector((math.cos(a),math.sin(a),0));side=Vector((-math.sin(a),math.cos(a),0));last=Vector((0,0,5.1))
  for j in range(1,10):
   t=j/10;center=axis*(t*3.6)+Vector((0,0,5.1+math.sin(t*math.pi)*.6-t*.8));branch(p,'Frond spine',last,center,.026,.014,m['TropicalBark'],6);last=center
   for sign in [-1,1]:
    tip=center+side*(sign*(.55*math.sin(t*math.pi)+.06))+axis*.43+Vector((0,0,-.24))
    verts=[center-axis*.075,center+axis*.15,tip+axis*.06,tip-axis*.07];mesh(p,'Palm leaflet',verts,[(0,1,2),(0,2,3)],m['PalmFronds'],True)
 for i in range(5):crown(p,'Coconut',(math.sin(i*2)*.22,math.cos(i*2)*.22,4.9),(.15,.15,.20),m['TropicalBark'],i,1)
 # Branched canopy with smaller, overlapping, irregular crowns.
 t=models['jungle-tree']
 for obj in list(t.children):
  if obj.name.startswith('Broadleaf canopy'):remove(obj)
 for i in range(14):
  a=i*2.399;rad=.6+(i%4)*.58;loc=(math.cos(a)*rad,math.sin(a)*rad,4.5+(i%5)*.39)
  branch(t,'Canopy bough',(0,0,2.8+(i%3)*.5),loc,.16,.055,m['TropicalBark'])
  crown(t,'Leaf crown',loc,(1.35,1.18,.84),m['CanopyGreen'] if i%3 else m['CanopySun'],120+i)
  for j in range(5):
   angle=j*math.tau/5+i;axis=Vector((math.cos(angle),math.sin(angle),.12));side=Vector((-axis.y,axis.x,0));base=Vector(loc)+axis*.95
   verts=[base-axis*.24,base+side*.25,base+axis*.75+Vector((0,0,-.12)),base-side*.25,base+Vector((0,0,.10))]
   mesh(t,'Fine outer leaves',verts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],m['CanopySun'] if j%3==0 else m['CanopyGreen'],True)

 # Apartment construction: framed glazing, balconies, roof machinery and drains.
 c=models['cityblock']
 for side in [-1,1]:
  for z in [1.3,3.4,5.5]:
   for x in [-2.6,-.9,.9,2.6]:
    box(c,'Fine window mullion',(x,side*3.505,z),(.045,.06,1.1),m['CityConcrete'],0)
    box(c,'Window sill',(x,side*3.52,z-.66),(1.26,.26,.10),m['CityConcrete'],0)
    box(c,'Fine lintel',(x,side*3.49,z+.65),(1.25,.12,.08),m['CityConcrete'],0)
  for x in [-2.55,2.55]:
   box(c,'Balcony slab',(x,side*3.6,4.65),(1.5,.65,.13),m['CityConcrete'],0)
   box(c,'Balcony rail',(x,side*3.87,5.05),(1.5,.045,.045),m['CityRoof'],0)
   for dx in [-.68,-.34,0,.34,.68]:box(c,'Fine balcony upright',(x+dx,side*3.87,4.86),(.035,.035,.38),m['CityRoof'],0)
  branch(c,'Drain pipe',(side*3.86,-3.3,.3),(side*3.86,-3.3,6.8),.045,.045,m['CityRoof'],8)
 for x in [-2,1.8]:
  for j in range(7):box(c,'Fine roof grille',(x-.5+j*.16,.8,7.715),(.045,1.1,.025),m['CityConcrete'],0)
  cyl(c,'Vent cowling',(x,-.3,7.35),.20,.5,m['CityRoof'],verts=12)
 box(c,'Entrance transom',(0,-3.57,1.52),(1.18,.035,.1),m['CityConcrete'],0)
 box(c,'Entrance step',(0,-3.7,.12),(2.0,.55,.24),m['CityConcrete'],0)
 # UVs and small packed textures are shared by instances, including the low tier.
 for root in roots:
  for obj in root.children_recursive:
   if obj.type!='MESH' or obj.data.uv_layers:continue
   bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.cube_project(cube_size=2);bpy.ops.object.mode_set(mode='OBJECT')
 for name,kind,size in [('Basalt','stone',128),('CooledAsh','stone',64),('GlacierIce','ice',128),('TropicalBark','bark',128),('CanopyGreen','leaf',64),('CanopySun','leaf',64),('PalmFronds','leaf',64),('CityPlaster','stone',128),('CityConcrete','stone',64),('CityRoof','stone',64)]:surface(m[name],kind,size)

 # Bake static detail into material batches before export to avoid hundreds of GLB nodes.
 for root in roots:
  groups={}
  for obj in list(root.children_recursive):
   if obj.type=='MESH' and len(obj.data.materials)==1:groups.setdefault((obj.data.materials[0].name,obj.name.startswith('Fine ')),[]).append(obj)
  for (name,fine),objects in groups.items():
   bpy.ops.object.select_all(action='DESELECT')
   for obj in objects:obj.select_set(True)
   bpy.context.view_layer.objects.active=objects[0]
   if len(objects)>1:bpy.ops.object.join()
   bpy.context.object.name=('Fine ' if fine else 'Surface ')+name
