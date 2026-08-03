import time
from concurrent import futures

import grpc

# Import generated protobuf files
from proto import geometry_pb2, geometry_pb2_grpc
from warp_sim import WarpRoboticsEngine


class AnalysisServiceServicer(geometry_pb2_grpc.AnalysisServiceServicer):
    def __init__(self):
        # Cache engines by robot_id so we don't re-initialize warp kernels
        self.engines = {}

    def get_engine(self, robot_id: str) -> WarpRoboticsEngine:
        # Map incoming ID to our known config names
        robot_type = "KUKA_LBR_iiwa"
        if "Panda" in robot_id:
            robot_type = "Franka_Panda"
        elif "UR5" in robot_id:
            robot_type = "UR5"
            
        if robot_type not in self.engines:
            self.engines[robot_type] = WarpRoboticsEngine(robot_type=robot_type)
        return self.engines[robot_type]

    def AnalyzeState(self, request, context):
        print(f"Received AnalyzeState request in context: {request.context}")
        num_objects = len(request.objects)
        
        robot_id = "KUKA_LBR_iiwa_01"
        if request.robot and request.robot.robot_id:
            robot_id = request.robot.robot_id
            
        engine = self.get_engine(robot_id)
        
        # Default joint angles or extract from request
        joint_angles = [0.0] * engine.num_joints
        if request.robot and request.robot.joints:
            joint_angles = [j.angle for j in request.robot.joints]
            
        joint_states_data, ee_pos = engine.compute_forward_kinematics(joint_angles)
        
        robot_resp = geometry_pb2.RobotState(
            robot_id=robot_id,
            joints=[
                geometry_pb2.JointState(
                    name=j["name"],
                    angle=j["angle"],
                    motor_data=j["motor_data"]
                ) for j in joint_states_data
            ],
            end_effector_pose=geometry_pb2.GeometricState(
                id="ee_pos",
                data=[0.0, ee_pos[0], ee_pos[1], ee_pos[2], 0.0, 0.0, 0.0, 0.0]
            )
        )
        
        return geometry_pb2.AnalysisResponse(
            status="success",
            code=f"# Processed {num_objects} multivectors & Warp Robotics GA Kinematics.",
            robot=robot_resp
        )

    def StreamState(self, request_iterator, context):
        for request in request_iterator:
            robot_id = "KUKA_LBR_iiwa_01"
            if request.robot and request.robot.robot_id:
                robot_id = request.robot.robot_id
                
            engine = self.get_engine(robot_id)
            joint_angles = [0.0] * engine.num_joints
            if request.robot and request.robot.joints:
                joint_angles = [j.angle for j in request.robot.joints]
                
            joint_states_data, ee_pos = engine.compute_forward_kinematics(joint_angles)
            robot_resp = geometry_pb2.RobotState(
                robot_id=robot_id,
                joints=[
                    geometry_pb2.JointState(
                        name=j["name"],
                        angle=j["angle"],
                        motor_data=j["motor_data"]
                    ) for j in joint_states_data
                ],
                end_effector_pose=geometry_pb2.GeometricState(
                    id="ee_pos",
                    data=[0.0, ee_pos[0], ee_pos[1], ee_pos[2], 0.0, 0.0, 0.0, 0.0]
                )
            )
            yield geometry_pb2.AnalysisResponse(
                status="success",
                code="# Warp GPU Stream step.",
                robot=robot_resp
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
