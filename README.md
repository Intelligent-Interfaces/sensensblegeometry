# sensensblegeometry

An interface for composing and simulating multimodal hardware devices.

## Architecture

This repository contains four core subsystems:

- **`frontend/`**: The visual canvas and notebook interface (Svelte 5 + Vite).
- **`engine/`**: The physics and Geometric Algebra engine (Rust + WebAssembly).
- **`backend/`**: The API gateway and orchestration layer (Go).
- **`ml/`**: The machine learning and analytical copilot environment (Python).

## Development Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
go run main.go
```

### Engine (WASM)
```bash
cd engine
cargo build --target wasm32-unknown-unknown
```

### Geometric NC
```bash
cd ml
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
