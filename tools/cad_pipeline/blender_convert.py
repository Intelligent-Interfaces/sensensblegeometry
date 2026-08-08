import bpy
import sys
import os
import glob

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

try:
    # Blender passes arguments after '--'
    args = sys.argv[sys.argv.index("--") + 1:]
    if len(args) < 2:
        print("Usage: blender --background --python blender_convert.py -- <input_dir> <output.glb>")
        sys.exit(1)
        
    input_dir = args[0]
    output_path = args[1]
    
    obj_files = glob.glob(os.path.join(input_dir, "*.obj"))
    
    if not obj_files:
        print(f"ERROR: No OBJ files found in {input_dir}")
        sys.exit(1)
        
    print(f"Importing {len(obj_files)} OBJ files from {input_dir}...")
    for obj_file in obj_files:
        bpy.ops.wm.obj_import(filepath=obj_file)
        # The imported object gets the name of the file by default in recent Blender versions
    
    # Export GLB (we'll compress it later with gltf-transform)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=False
    )
    print("SUCCESS: Exported to", output_path)
except Exception as e:
    print("ERROR:", e)
    sys.exit(1)
