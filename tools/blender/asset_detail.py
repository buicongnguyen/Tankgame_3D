"""Reusable Blender detail pass: authored geometry, shared PBR materials, no textures."""
import bpy, math

def material(name,color,metal=0,rough=.65):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;return m

def box(parent,name,loc,size,m,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Edge highlights','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def cyl(parent,name,loc,r,d,m,rot=(0,0,0),verts=16):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.rotation_euler=rot;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 return o

def finish():
 # Small bevels make formerly perfect boxes catch light. Apply only to untouched cubes.
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  if len(o.data.vertices)==8 and not o.name.startswith('Detail'):
   bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Manufactured edge','BEVEL');mod.width=min(.035,min(o.dimensions)*.12);mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 for m in bpy.data.materials:
  m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=m.diffuse_color
  name=m.name.lower();metal=any(s in name for s in ['metal','steel','rail','gun','trim']);rubber=any(s in name for s in ['track','boots'])
  n.inputs['Metallic'].default_value=.65 if metal else .15 if 'armor' in name else 0
  n.inputs['Roughness'].default_value=.85 if rubber else .35 if metal else .72
  if 'window' in name or 'optic' in name:n.inputs['Roughness'].default_value=.14;n.inputs['Metallic'].default_value=.35

def core(tank,hull,turret,truck,wall,crate,barrel,relay,armor,trim,track,metal,light,concrete,sand,red,white):
 glass=material('Optics',(.025,.11,.14),.35,.15)
 # Sloped upper armor and turret cheeks replace the toy-like vertical faces.
 for name,factor in [('UpperHull',.82),('TurretArmor',.78)]:
  o=bpy.data.objects.get(name)
  for v in o.data.vertices:
   if v.co.z>0:v.co.x*=factor
 for side in [-1,1]:
  for y in [-1.5,-1.17,-.84,-.51,-.18,.15,.48,.81,1.14,1.47]:
   box(hull,'Detail track shoe',(side*1.14,y,.86),(.52,.22,.08),track,.008)
   box(hull,'Detail side skirt',(side*1.43,y,.75),(.08,.27,.27),armor,.01)
  for y in [-1.25,-.62,0,.62,1.25]:
   cyl(hull,'Detail hub',(side*1.46,y,.47),.115,.075,trim,(0,math.pi/2,0),12)
  box(hull,'Detail tow bracket',(side*.66,-1.68,.55),(.24,.18,.17),metal)
  box(hull,'Detail lamp housing',(side*.73,-1.54,1.04),(.34,.20,.24),metal)
  box(hull,'Detail lamp lens',(side*.73,-1.65,1.04),(.22,.025,.12),light,.006)
  box(turret,'Detail cheek armor',(side*.70,-.28,.35),(.18,.78,.30),trim)
  for y in [-.1,.13,.36]:cyl(turret,'Detail smoke launcher',(side*.87,y,.38),.073,.27,metal,(0,side*.7,0),10)
  box(turret,'Detail stowage',(side*.57,.78,.37),(.42,.27,.36),track)
  box(turret,'Detail hatch hinge',(side*.18,.52,.74),(.13,.12,.08),metal)
 for x in [-.58,-.38,-.18,.02,.22,.42,.62]:box(hull,'Detail radiator louvre',(x,1.08,1.28),(.08,.65,.025),metal,.004)
 box(hull,'Detail engine access',(0,.40,1.23),(1.35,.35,.055),trim)
 cyl(turret,'Detail gun mantlet',(0,-.83,.35),.24,.38,armor,(math.pi/2,0,0),20)
 cyl(turret,'Detail thermal sleeve',(0,-1.36,.35),.135,.70,trim,(math.pi/2,0,0),20)
 box(turret,'Detail muzzle bore',(0,-2.594,.35),(.15,.009,.13),metal,.0)
 cyl(turret,'Detail cupola',(.34,.39,.75),.20,.09,metal)
 box(turret,'Detail periscope',(-.29,-.10,.69),(.25,.20,.16),metal)
 box(turret,'Detail optic glass',(-.29,-.205,.71),(.18,.025,.085),glass,.004)
 for x in [-.56,.56]:
  for y in [-.58,.56]:cyl(turret,'Detail armor bolt',(x,y,.63),.04,.025,metal,verts=6)
 # Cab glazing, mirrors, radiator, tire hubs, and cargo ribs.
 for side in [-1,1]:
  box(truck,'Detail side window',(side*.963,-1.48,1.6),(.025,.84,.45),glass)
  box(truck,'Detail mirror',(side*1.14,-1.95,1.55),(.20,.12,.27),metal)
  box(truck,'Detail step',(side*1.05,-1.3,.62),(.28,.8,.12),metal)
  for y in [-1.4,.55,1.48]:cyl(truck,'Detail wheel hub',(side*1.22,y,.45),.20,.035,metal,(0,math.pi/2,0))
  for y in [-.3,.45,1.2,1.95]:box(truck,'Detail cargo rib',(side*1.07,y,1.36),(.04,.07,1.3),metal,.005)
 box(truck,'Detail bumper',(0,-2.25,.56),(2.1,.16,.20),metal)
 for x in [-.52,-.26,0,.26,.52]:box(truck,'Detail grille',(x,-2.15,.99),(.11,.04,.32),track,.005)
 for x in [-.78,.78]:box(truck,'Detail headlight',(x,-2.18,1.02),(.27,.05,.20),light)
 # Supply cases use planks, corner guards, handles and real drum lids.
 for z in [.20,.43,.66,.89,1.12]:
  for side in [-1,1]:box(crate,'Detail plank seam',(0,side*.631,z),(1.10,.018,.018),track,0)
 for side in [-1,1]:box(crate,'Detail handle',(0,side*.65,.9),(.35,.07,.09),metal)
 for x in [-.54,.54]:
  for y in [-.54,.54]:box(crate,'Detail corner guard',(x,y,.66),(.12,.12,1.31),metal,.006)
 cyl(barrel,'Detail recessed lid',(0,0,1.363),.41,.025,metal,verts=24)
 cyl(barrel,'Detail filler cap',(.20,.08,1.39),.075,.03,red,verts=12)
 for x in [-1.16,1.16]:box(wall,'Detail anchor plate',(x,0,.385),(.30,.75,.05),metal)
 for z in [.85,1.12,1.40]:box(relay,'Detail cabinet vent',(.565,0,z),(.02,.48,.08),track)
 box(relay,'Detail service door',(0,.39,1.12),(.82,.045,.83),trim)
 finish()

def environment(roots):
 lookup={o.name:o for o in roots};stone=bpy.data.materials['Granite'];wood=bpy.data.materials['Cedar'];steel=bpy.data.materials['Steel'];roof=bpy.data.materials['Slate'];glass=bpy.data.materials['Window'];brick=bpy.data.materials['Terracotta']
 h=lookup['house']
 for side in [-1,1]:
  for x in [-1.8,1.8]:
   for dx in [-.59,.59]:box(h,'Detail window jamb',(x+dx,side*2.55,1.6),(.10,.10,1.18),wood)
   for z in [1.02,2.18]:box(h,'Detail window sill',(x,side*2.57,z),(1.28,.18,.10),stone)
   box(h,'Detail window mullion',(x,side*2.57,1.6),(.055,.065,1.05),wood,.005)
  box(h,'Detail foundation',(0,side*2.52,.20),(6.06,.12,.40),stone)
  box(h,'Detail gutter',(side*3.28,0,2.94),(.13,5.75,.13),steel)
  for y in [-2.5,-1.7,-.9,-.1,.7,1.5,2.3]:
   o=box(h,'Detail roof standing seam',(side*1.65,y,3.79),(3.64,.035,.06),steel,.004);o.rotation_euler.y=side*math.radians(23)
 box(h,'Detail ridge cap',(0,0,4.40),(.23,5.75,.10),roof)
 box(h,'Detail doorstep',(0,-2.75,.10),(1.5,.55,.2),stone)
 box(h,'Detail chimney cap',(1.8,1.3,4.8),(.78,.83,.15),stone)
 box(h,'Detail chimney opening',(1.8,1.3,4.886),(.45,.49,.02),roof,0)
 for x in [-2.7,-1.35,0,1.35,2.7]:
  for z in [.25,1.0,1.75]:cyl(lookup['steelwall'],'Detail panel rivet',(x,-.715,z),.055,.04,steel,(math.pi/2,0,0),8)
 for x in [-2.4,-1.2,0,1.2,2.4]:box(lookup['stonewall'],'Detail capstone',(x,0,1.92),(1.17,1.50,.16),stone)
 # Break up the two solid tree cones into layered, offset branch clusters.
 pine=lookup['pine']
 for o in list(pine.children):
  if o.type=='MESH' and o.location.z>2:bpy.data.objects.remove(o,do_unlink=True)
 for tier in range(5):
  for j in range(5):
   angle=j*math.tau/5+tier*.7;r=1.3-tier*.20
   bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=r*.70,radius2=0,depth=1.3)
   o=bpy.context.object;o.name='Detail pine branch';o.parent=pine;o.location=(math.cos(angle)*r*.5,math.sin(angle)*r*.5,1.65+tier*.52);o.data.materials.append(bpy.data.materials['Pine' if (j+tier)%2 else 'PineTips'])
 finish()

def combatant(hull,turret,kind):
 armor=bpy.data.materials.get('BossArmor');dark=bpy.data.materials.get('BossTracks');trim=bpy.data.materials.get('BossTrim')
 if armor:
  for side in [-1,1]:
   if kind!='walker':
    for y in [-1.7,-.85,0,.85,1.7]:cyl(hull,'Detail armored wheel',(side*2.085,y,.5),.34,.04,trim,(0,math.pi/2,0),12)
   for y in [-.7,0,.7]:box(turret,'Detail reactive plate',(side*1.12,y,.47),(.16,.52,.26),trim)
   for y in [.8,1.05,1.3,1.55]:box(hull,'Detail exhaust grille',(side*.8,y,1.35),(.5,.09,.045),dark,.004)
  if kind=='missile':
   for side in [-1,1]:
    for dx in [-.35,.35]:
     for z in [.42,.9]:cyl(turret,'Detail launch bore',(side*1.05+dx,-1.38,z),.135,.04,dark,(math.pi/2,0,0),12)
  if kind=='walker':
   for leg in [o for o in hull.children if o.name.startswith('Leg')]:cyl(leg,'Detail joint',(0,0,.05),.25,.50,dark,(math.pi/2,0,0),12)
 finish()

def infantry(torso):
 boots=bpy.data.materials['InfantryBoots'];uniform=bpy.data.materials['InfantryUniform'];helmet=bpy.data.materials['InfantryHelmet']
 box(torso,'Detail ballistic vest',(0,-.27,.13),(.64,.12,.55),boots)
 for x in [-.2,0,.2]:box(torso,'Detail ammo pouch',(x,-.355,.04),(.15,.09,.20),uniform,.008)
 cyl(torso,'Detail helmet crown',(0,0,1.025),.27,.16,helmet,verts=12)
 box(torso,'Detail visor',(0,-.225,.80),(.35,.035,.08),boots,.006)
 finish()
