import bpy
import sys
import os

argv = sys.argv
if "--" not in argv:
    print("Usage: Blender --background --python blender_kinematic.py -- <input_dir> <output_dir>")
    sys.exit(1)

args = argv[argv.index("--") + 1:]
input_dir = args[0]
output_dir = args[1]

os.makedirs(output_dir, exist_ok=True)

for file in os.listdir(input_dir):
    if file.endswith(".obj"):
        name = file.replace(".obj", "")
        obj_path = os.path.join(input_dir, file)
        glb_path = os.path.join(output_dir, f"{name}.glb")
        
        # Clear existing scene
        bpy.ops.wm.read_factory_settings(use_empty=True)
        
        # Import OBJ
        bpy.ops.wm.obj_import(filepath=obj_path)
        
        # Export GLB
        bpy.ops.export_scene.gltf(
            filepath=glb_path,
            export_format='GLB',
            export_yup=True,
            export_apply=True
        )
        print(f"Exported {glb_path}")
