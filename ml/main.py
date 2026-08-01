from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(
    title="ML Copilot Backend",
    description="Python microservice for Generative Geometric Algebra simulations",
    version="0.1.0"
)

# Allow CORS for Vite dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models representing Geometric Algebra objects
class Multivector(BaseModel):
    id: str
    data: List[float] # 8 components for Cl(3,0)

class GeometryPayload(BaseModel):
    canvas_objects: List[Multivector]

class CodeSynthesisPayload(BaseModel):
    context: str
    objects: List[Multivector]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-copilot"}

@app.post("/predict/geometry")
def predict_geometry(payload: GeometryPayload):
    """
    Simulates GATr / Versor equivariant predictions based on canvas geometry.
    (Mocked for now)
    """
    return {
        "status": "success",
        "message": "Predictions computed",
        "predicted_objects": payload.canvas_objects,
        "energy_state": 42.0
    }

@app.post("/generate/code")
def generate_code(payload: CodeSynthesisPayload):
    """
    Synthesizes Python or R code for the notebook based on geometric constraints.
    (Mocked for now)
    """
    mock_code = f"# Synthesized Analysis for {len(payload.objects)} objects\n"
    mock_code += "import engine\n\n"
    mock_code += f"def analyze_{payload.context}():\n"
    mock_code += "    print('Running physical analysis...')\n"
    mock_code += "    pass\n"

    return {
        "status": "success",
        "code": mock_code
    }
