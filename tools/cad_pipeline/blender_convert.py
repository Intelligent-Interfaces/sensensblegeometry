import bpy
import sys

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

input_path = "/tmp/wt-02/turbine.obj"
output_path = "/Users/erickoduniyi/Desktop/iig/platforms/sensensblegeometry/frontend/public/models/turbine/hawt_modern_2.glb"

try:
    # Import OBJ
    bpy.ops.wm.obj_import(filepath=input_path)

    # Export GLB
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        use_selection=False,
        use_draco_mesh_compression=True,
        draco_mesh_compression_level=6,
    )
    print("SUCCESS: Exported to", output_path)
except Exception as e:
    print("ERROR:", e)
    sys.exit(1)
