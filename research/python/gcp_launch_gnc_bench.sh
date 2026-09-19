#!/usr/bin/env bash
# ==============================================================================
# GNC-Bench: Google Cloud Platform (GCP) GPU / Vertex AI Benchmark Runner
# ==============================================================================
# Usage:
#   ./gcp_launch_gnc_bench.sh compute   # Launches on GCP Compute Engine GPU instance
#   ./gcp_launch_gnc_bench.sh vertex    # Submits to GCP Vertex AI Custom Training
# ==============================================================================

set -euo pipefail

PROJECT_ID="research-477509"
REGION="us-central1"
ZONE="us-central1-a"
BUCKET_NAME="gs://gnc-bench-results-${PROJECT_ID}"
IMAGE_URI="gcr.io/deeplearning-platform-release/pytorch-gpu.2-0:latest"

echo "=== GNC-Bench GCP Launcher ==="
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Zone: ${ZONE}"

MODE="${1:-compute}"

if [ "$MODE" = "compute" ]; then
    INSTANCE_NAME="gnc-bench-gpu-runner"
    echo "Creating GCP Compute Engine instance with NVIDIA L4 GPU (${INSTANCE_NAME})..."
    
    gcloud compute instances create "${INSTANCE_NAME}" \
        --project="${PROJECT_ID}" \
        --zone="${ZONE}" \
        --machine-type="e2-standard-4" \
        --image-family="ubuntu-2204-lts" \
        --image-project="ubuntu-os-cloud" \
        --boot-disk-size="100GB"

    echo "Waiting for instance to initialize..."
    sleep 30

    echo "Copying benchmark scripts to GCP instance..."
    gcloud compute scp --recurse . "${INSTANCE_NAME}:~/python" --zone="${ZONE}"

    echo "Executing GNC-Bench v3 on GCP Compute Instance..."
    gcloud compute ssh "${INSTANCE_NAME}" --zone="${ZONE}" --command="
        cd ~/python &&
        python3 -m pip install --upgrade pip scipy matplotlib torch &&
        python3 benchmark_suite.py
    "

    echo "Retrieving results from GCP instance..."
    gcloud compute scp "${INSTANCE_NAME}:~/python/../results/gnc_bench_results.json" ../results/gnc_bench_results.json --zone="${ZONE}"
    
    echo "GCP Compute Engine benchmark execution complete!"

elif [ "$MODE" = "vertex" ]; then
    JOB_NAME="gnc_bench_publication_$(date +%Y%m%d_%H%M%S)"
    echo "Submitting Custom Training Job to GCP Vertex AI (${JOB_NAME})..."

    gcloud ai custom-jobs create \
        --project="${PROJECT_ID}" \
        --region="${REGION}" \
        --display-name="${JOB_NAME}" \
        --worker-pool-spec="replica-count=1,machine-type=g2-standard-4,accelerator-type=NVIDIA_L4,accelerator-count=1,container-image-uri=${IMAGE_URI}" \
        --args="python3,-c,import torch; print('PyTorch CUDA on GCP Vertex AI:', torch.cuda.is_available())"

    echo "Vertex AI job submitted!"

else
    echo "Unknown mode: ${MODE}. Use 'compute' or 'vertex'."
    exit 1
fi
