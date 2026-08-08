import FreeCAD
import Import
import MeshPart
import Mesh
import sys

try:
    doc = FreeCAD.newDocument("Conversion")
    input_path = '/Users/erickoduniyi/Desktop/iig/platforms/sensensblegeometry/design/Wind Turbine - 90m HH - 120m Rotor Dia.stp'
    print(f"Importing {input_path}...", flush=True)
    Import.insert(input_path, doc.Name)

    meshes = []
    print("Tessellating shapes...", flush=True)
    for obj in doc.Objects:
        if hasattr(obj, "Shape") and obj.Shape is not None:
            # Create mesh from shape
            mesh_obj = doc.addObject("Mesh::Feature", obj.Name + "_Mesh")
            mesh_obj.Mesh = MeshPart.meshFromShape(Shape=obj.Shape, LinearDeflection=1.0, AngularDeflection=0.5)
            meshes.append(mesh_obj)

    if not meshes:
        print("ERROR: No shapes could be meshed.", flush=True)
        sys.exit(1)

    output_path = '/tmp/wt-02/turbine.obj'
    print(f"Exporting to {output_path}...", flush=True)
    Mesh.export(meshes, output_path)
    print("SUCCESS", flush=True)
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    sys.exit(1)
