import FreeCAD
import Import
import MeshPart
import Mesh
import sys
import os
import re

try:
    if len(sys.argv) < 4:
        print("Usage: freecadcmd freecad_convert.py <input.stp> <output_dir>", flush=True)
        sys.exit(1)
        
    input_path = sys.argv[2]
    output_dir = sys.argv[3]
    
    os.makedirs(output_dir, exist_ok=True)
    
    doc = FreeCAD.newDocument("Conversion")
    print(f"Importing {input_path}...", flush=True)
    Import.insert(input_path, doc.Name)

    meshes_exported = 0
    print("Tessellating shapes...", flush=True)
    for obj in doc.Objects:
        if hasattr(obj, "Shape") and obj.Shape is not None:
            # Skip assemblies/compounds which duplicate the child geometry
            if hasattr(obj, "OutList") and len(obj.OutList) > 0:
                continue
                
            # Create mesh from shape
            mesh = MeshPart.meshFromShape(Shape=obj.Shape, LinearDeflection=1.0, AngularDeflection=0.5)
            # Shapes are already in global space for STEP imports
            mesh_obj = doc.addObject("Mesh::Feature", obj.Name + "_Mesh")
            mesh_obj.Mesh = mesh
            
            # Clean up object name for filename safety
            safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', obj.Name)
            part_path = os.path.join(output_dir, f"{safe_name}.obj")
            
            Mesh.export([mesh_obj], part_path)
            meshes_exported += 1

    if meshes_exported == 0:
        print("ERROR: No shapes could be meshed.", flush=True)
        sys.exit(1)

    print(f"SUCCESS: Exported {meshes_exported} parts to {output_dir}", flush=True)
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    sys.exit(1)
