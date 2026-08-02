import sys

import grpc

from proto import geometry_pb2, geometry_pb2_grpc


def run():
    print("Connecting to local gRPC server at localhost:50051...")
    try:
        with grpc.insecure_channel('localhost:50051') as channel:
            stub = geometry_pb2_grpc.AnalysisServiceStub(channel)
            request = geometry_pb2.AnalysisRequest(
                context="smoke_test",
                language="python",
                objects=[]
            )
            print("Sending AnalyzeState request...")
            response = stub.AnalyzeState(request, timeout=5.0)
            print(f"Received response status: {response.status}")
            if response.status == "success":
                print("Smoke test passed.")
                sys.exit(0)
            else:
                print("Smoke test failed: unexpected status.")
                sys.exit(1)
    except grpc.RpcError as e:
        print(f"Smoke test failed with exception: {e}")
        sys.exit(1)

if __name__ == '__main__':
    run()
