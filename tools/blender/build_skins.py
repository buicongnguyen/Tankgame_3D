"""Author tank material variants and lightweight shop previews in Blender."""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public'/'skins'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'assets'/'blender'; SOURCE.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public'/'models'/'tank.glb'))
palettes={
'classic':{'Armor':'698d82','Trim':'c7e5d3','Gunmetal':'768a85','Signal':'8dffe7','Tracks':'48565a'},
'sunburst':{'Armor':'ffac24','Trim':'663dbf','Gunmetal':'624569','Signal':'fff1a6','Tracks':'354052'},
'guardian':{'Armor':'167bda','Trim':'e4f5ff','Gunmetal':'325286','Signal':'54ffff','Tracks':'27394c'},
'inferno':{'Armor':'e72b53','Trim':'ffc83d','Gunmetal':'532c45','Signal':'ffed95','Tracks':'302737'},
'volt':{'Armor':'b5ed21','Trim':'123b55','Gunmetal':'315967','Signal':'65ffff','Tracks':'253b42'},
'comet':{'Armor':'ff6729','Trim':'142354','Gunmetal':'435277','Signal':'fff776','Tracks':'253048'},
'sentinel':{'Armor':'09dbe3','Trim':'7e27fa','Gunmetal':'42507e','Signal':'fafffb','Tracks':'233342'},
'talon':{'Armor':'ffcf18','Trim':'f32a86','Gunmetal':'663c69','Signal':'fffdf2','Tracks':'352b40'},
'nova':{'Armor':'9239fa','Trim':'29f8d6','Gunmetal':'543582','Signal':'fff068','Tracks':'302844'},
'prism':{'Armor':'ff3493','Trim':'13e7f2','Gunmetal':'49365e','Signal':'fff4a8','Tracks':'302a46'}}
palettes.update({
'bastion':{'Armor':'273a8a','Trim':'80ff98','Gunmetal':'344864','Signal':'44ff81','Tracks':'23303e'},
'sprint':{'Armor':'ff982b','Trim':'d6edff','Gunmetal':'314473','Signal':'459bff','Tracks':'293441'},
'lance':{'Armor':'20c7cd','Trim':'ffe14b','Gunmetal':'3b425e','Signal':'ff4569','Tracks':'26343e'},
'quartermaster':{'Armor':'e8ac24','Trim':'8928e6','Gunmetal':'57406c','Signal':'d06cff','Tracks':'302941'}})
ratings={'comet':1,'sentinel':2,'talon':3,'nova':4,'prism':5,'bastion':3,'sprint':3,'lance':3,'quartermaster':3}
marking_data={}

def markings(name,palette):
 # Paint geometry is authored in Blender and reused by the game, including Low detail.
 # Fender tops are flat at Z=1.025. Raised paint avoids coplanar flicker.
 vertices=[];faces=[];colors=[]
 def polygon(points,color):
  start=len(vertices);vertices.extend(points)
  for i in range(1,len(points)-1):faces.append((start,start+i,start+i+1));colors.append(color)
 def star(cx,cy,r):
  # A center fan preserves the concave five-point outline without crossing triangles.
  rim=[(cx+math.sin(i*math.pi/5)*r*(1 if i%2==0 else .43),cy+math.cos(i*math.pi/5)*r*(1 if i%2==0 else .43),1.045) for i in range(10)]
  for i in range(10):polygon([(cx,cy,1.045),rim[(i+1)%10],rim[i]],palette['Signal'])
 for side in (-1,1):
  count=ratings[name]
  for i in range(count):star(side*1.1,(i-(count-1)/2)*.43,.18)
  for y in (-1.46,1.29):
   polygon([(side*1.1-.23,y-.08,1.043),(side*1.1+.23,y+.06,1.043),(side*1.1+.23,y+.23,1.043),(side*1.1-.23,y+.09,1.043)],palette['Trim'])
  # Twin front-deck stripes flank a larger command star.
  x=side*.57
  polygon([(x-.08,-1.37,1.217),(x+.08,-1.37,1.217),(x+.08,-.98,1.217),(x-.08,-.98,1.217)],palette['Trim'])
 mesh=bpy.data.meshes.new(name+'Paint');mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new('SkinMarkings',mesh);bpy.context.collection.objects.link(obj);obj.parent=bpy.data.objects['Hull']
 mats={}
 for color in set(colors):
  mat=bpy.data.materials.new('Paint_'+color);mat.diffuse_color=tuple(linear(int(color[i:i+2],16)/255) for i in (0,2,4))+(1,);mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=mat.diffuse_color;bs.inputs['Roughness'].default_value=.55;mesh.materials.append(mat);mats[color]=len(mesh.materials)-1
 positions=[];rgb=[]
 for face,color in zip(mesh.polygons,colors):
  face.material_index=mats[color]
  for index in face.vertices:
   x,y,z=vertices[index];positions.extend((round(x,5),round(z,5),round(-y,5)))
   rgb.extend(round(linear(int(color[i:i+2],16)/255),6) for i in (0,2,4))
 marking_data[name]={'stars':ratings[name],'stripes':6,'positions':positions,'colors':rgb}
 return obj

def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
bpy.ops.object.camera_add(location=(6,-8,6));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=6.2
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=512;scene.render.resolution_y=384;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='Standard';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.28,.34,.42,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4
for loc,power,size in [((3,-4,7),650,5),((-5,-2,3),300,4),((0,5,6),900,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;lamp.rotation_euler=(Vector((0,0,1))-lamp.location).to_track_quat('-Z','Y').to_euler()
for name,palette in palettes.items():
 if '--new-only' in sys.argv and name not in ratings:continue
 paint=markings(name,palette) if name in ratings else None
 for material in bpy.data.materials:
  if material.name in palette:
   code=palette[material.name];rgb=tuple(linear(int(code[i:i+2],16)/255) for i in (0,2,4));material.diffuse_color=(*rgb,1)
   if material.use_nodes:
    bs=material.node_tree.nodes.get('Principled BSDF')
    if bs:bs.inputs['Base Color'].default_value=(*rgb,1)
 if '--specialists-only' not in sys.argv or name in ['bastion','sprint','lance','quartermaster']:
  scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('skin-'+name+'.blend')));bpy.ops.render.render(write_still=True)
 if paint:
  mesh=paint.data;bpy.data.objects.remove(paint,do_unlink=True);bpy.data.meshes.remove(mesh)
(ROOT/'src'/'three'/'skin-palettes.ts').write_text('// Generated by Blender: tools/blender/build_skins.py\nexport const SKIN_PALETTES = '+json.dumps(palettes,indent=2)+' as const;\n',encoding='utf-8')

(ROOT/'src'/'three'/'skin-markings.json').write_text(json.dumps(marking_data,separators=(',',':')),encoding='utf-8')
