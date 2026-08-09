import FreeCAD
import Import
import MeshPart
import Mesh
import sys
import os
import json

if len(sys.argv) < 3:
    print("Usage: freecadcmd extract_kinematic_parts.py <input.stp> <output_dir> [--vawt]")
    sys.exit(1)

input_path = sys.argv[2]
output_dir = sys.argv[3]
os.makedirs(output_dir, exist_ok=True)

is_vawt = "--vawt" in sys.argv

doc = FreeCAD.newDocument("Conversion")
print(f"Importing {input_path} (VAWT={is_vawt})...", flush=True)
Import.insert(input_path, doc.Name)

# Define groups based on turbine type
if is_vawt:
    groups = {
        "blade": [],
        "hub": [],
        "motor": [],
        "fasteners": []
    }
else:
    groups = {
        "tower": [],
        "nacelle": [],
        "rotor": []
    }

def classify_node(obj, path):
    label = obj.Label.lower() if hasattr(obj, "Label") else ""
    path_lower = path.lower()

    if is_vawt:
        # Blade parts: Balde*, blade labels
        if "balde" in label or "blade" in label:
            return "blade"
        # F1, F001... are blade frames (but not "full" or "feature")
        if label.startswith("f") and not label.startswith("fu") and not label.startswith("fe"):
            if label == "f1" or label.startswith("f0"):
                return "blade"
        # P1, P001... are blade pins (but not "part", "plane", "point")
        if label.startswith("p") and not label.startswith("pa") and not label.startswith("pl") and not label.startswith("po"):
            if label == "p1" or label.startswith("p0"):
                return "blade"
        # H1, H001... are hub parts
        if label.startswith("h1") or label.startswith("h0"):
            return "hub"
        if "motor" in label:
            return "motor"
        if "iso" in label:
            return "fasteners"
        # Path-based fallback
        if "blade" in path_lower or "balde" in path_lower:
            return "blade"
        if "/h1" in path_lower:
            return "hub"
        if "motor" in path_lower:
            return "motor"
        return "hub"  # default
    else:
        # HAWT classification
        if "rotor" in path_lower or "blade" in path_lower or "balde" in path_lower or "hub" in path_lower or "/h" in path_lower:
            return "rotor"
        if "nacelle" in path_lower or "motor" in path_lower or "generator" in path_lower:
            return "nacelle"
        if "tower" in path_lower or "foundation" in path_lower:
            return "tower"
        try:
            y = obj.getGlobalPlacement().Base.y
            if y > 80000:
                return "nacelle"
            return "tower"
        except:
            return "tower"

visited = set()

def process_tree(obj, path=""):
    if obj.Name in visited:
        return
    visited.add(obj.Name)

    current_path = path + "/" + obj.Name
    if hasattr(obj, "Label"):
        current_path += f"({obj.Label})"

    is_leaf = not hasattr(obj, "OutList") or len(obj.OutList) == 0

    if is_leaf and hasattr(obj, "Shape") and obj.Shape is not None:
        group_name = classify_node(obj, current_path)

        mesh = MeshPart.meshFromShape(Shape=obj.Shape, LinearDeflection=1.0, AngularDeflection=0.5)

        # STEP shapes are already in absolute/global coordinates.
        # Do NOT apply getGlobalPlacement() — it would double-transform.

        groups[group_name].append(mesh)
        print(f"  {obj.Label} -> {group_name}", flush=True)

    if hasattr(obj, "OutList"):
        for child in obj.OutList:
            process_tree(child, current_path)

print("Parsing assembly tree...", flush=True)
for obj in doc.Objects:
    if not hasattr(obj, "InList") or len(obj.InList) == 0:
        process_tree(obj)

# Export each group
manifest = {"parts": []}
for group_name, meshes in groups.items():
    if not meshes:
        continue
    merged = Mesh.Mesh()
    for m in meshes:
        merged.addMesh(m)

    out_obj = doc.addObject("Mesh::Feature", group_name)
    out_obj.Mesh = merged

    out_file = os.path.join(output_dir, f"{group_name}.obj")
    print(f"Exporting {group_name} with {len(meshes)} parts to {out_file}...", flush=True)
    Mesh.export([out_obj], out_file)

    # Determine kinematic type
    if is_vawt:
        kinematic = "rotor" if group_name in ("blade", "hub") else "static"
    else:
        kinematic = "rotor" if group_name == "rotor" else "static"

    manifest["parts"].append({
        "name": group_name,
        "file": f"{group_name}.glb",
        "kinematic": kinematic,
        "meshCount": len(meshes)
    })

manifest_path = os.path.join(output_dir, "manifest.json")
with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2)
print(f"Wrote manifest to {manifest_path}", flush=True)

print("SUCCESS", flush=True)
