import time
from concurrent import futures

import grpc

# Import generated protobuf files
from proto import geometry_pb2, geometry_pb2_grpc


class AnalysisServiceServicer(geometry_pb2_grpc.AnalysisServiceServicer):
    def AnalyzeState(self, request, context):
        print(f"Received AnalyzeState request in context: {request.context}")
        
        # We can implement a batched tensor flow here similar to QuAIRKit
        # For now, just print the objects received
        num_objects = len(request.objects)
        
        return geometry_pb2.AnalysisResponse(
            status="success",
            code=f"# Processed {num_objects} multivectors using PyTorch/JAX worker backend."
        )

    def StreamState(self, request_iterator, context):
        for request in request_iterator:
            yield geometry_pb2.AnalysisResponse(
                status="success",
                code="# Stream processed."
            )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    geometry_pb2_grpc.add_AnalysisServiceServicer_to_server(AnalysisServiceServicer(), server)
    server.add_insecure_port('[::]:50051')
    print("Python gRPC Worker Node running on port 50051...")
    server.start()
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    serve()
