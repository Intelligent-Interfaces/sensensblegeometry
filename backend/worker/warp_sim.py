import math
from typing import ClassVar

try:
    import warp as wp
    wp.init()
    HAS_WARP = True
except Exception as e:  # noqa: BLE001
    print(f"NVIDIA Warp initialization warning: {e}. Falling back to PyTorch/NumPy acceleration.")
    HAS_WARP = False

if HAS_WARP:
    @wp.func
    def rotor_3d_wp(angle: float, axis: int) -> wp.vec4:
        """Create a 3D Rotor R = cos(theta/2) - B sin(theta/2) in Cl(3,0).
        Components: [s, e12, e23, e31]. Axis: 0=x(e23), 1=y(e31), 2=z(e12)
        """
        half = angle * 0.5
        c = wp.cos(half)
        s = wp.sin(half)
        if axis == 2:
            return wp.vec4(c, -s, 0.0, 0.0) # z / e12
        elif axis == 0:
            return wp.vec4(c, 0.0, -s, 0.0) # x / e23
        elif axis == 1:
            return wp.vec4(c, 0.0, 0.0, -s) # y / e31
        return wp.vec4(1.0, 0.0, 0.0, 0.0)

    @wp.struct
    class PGAMotor:
        r_s: float
        r_e12: float
        r_e23: float
        r_e31: float
        t_x: float
        t_y: float
        t_z: float
        d_e0123: float

    @wp.func
    def pga_motor_wp(rotor: wp.vec4, tx: float, ty: float, tz: float) -> PGAMotor:
        """Create a 3D PGA Motor M = R + (1/2) * t * R * e_infinity."""
        motor = PGAMotor()
        motor.r_s = rotor[0]
        motor.r_e12 = rotor[1]
        motor.r_e23 = rotor[2]
        motor.r_e31 = rotor[3]
        motor.t_x = 0.5 * tx
        motor.t_y = 0.5 * ty
        motor.t_z = 0.5 * tz
        motor.d_e0123 = 0.0
        return motor

    @wp.kernel
    def compute_fk_kernel(
        angles: wp.array(dtype=float),
        axes: wp.array(dtype=int),
        link_lengths: wp.array(dtype=float),
        motors: wp.array(dtype=PGAMotor),
        ee_pos: wp.array(dtype=wp.vec3)
    ):
        tid = wp.tid()
        
        # Parallel kernel execution across multiple robot instances if batched,
        # but here we just compute for one robot
        if tid == 0:
            current_x = float(0.0)  # noqa: UP018
            current_y = float(0.0)  # noqa: UP018
            current_z = float(link_lengths[0])
            
            for i in range(angles.shape[0]):
                angle = angles[i]
                axis = axes[i]
                
                rotor = rotor_3d_wp(angle, axis)
                motor = pga_motor_wp(rotor, current_x, current_y, current_z)
                motors[i] = motor
                
                # Update position for next link
                link_len = link_lengths[i]
                if axis == 2: # z
                    current_z += link_len
                elif axis == 1: # y
                    current_x += link_len * wp.sin(angle)
                    current_z += link_len * wp.cos(angle)
                else: # x
                    current_y += link_len * wp.sin(angle)
                    current_z += link_len * wp.cos(angle)
            
            ee_pos[0] = wp.vec3(current_x, current_y, current_z)


class WarpRoboticsEngine:
    """GPU/CPU Accelerated Kinematics Engine using Geometric Algebra Motor Algebra."""
    
    ROBOTS: ClassVar[dict] = {
        "KUKA_LBR_iiwa": {
            "num_joints": 7,
            "link_lengths": [0.340, 0.400, 0.400, 0.400, 0.400, 0.126, 0.0],
            "axes": [2, 1, 2, 1, 2, 1, 2]  # z, y, z, y, z, y, z
        },
        "Franka_Panda": {
            "num_joints": 7,
            "link_lengths": [0.333, 0.316, 0.384, 0.088, 0.107, 0.107, 0.0],
            "axes": [2, 1, 2, 1, 2, 1, 2]
        },
        "UR5": {
            "num_joints": 6,
            "link_lengths": [0.089, 0.425, 0.392, 0.109, 0.094, 0.082],
            "axes": [2, 1, 1, 1, 2, 1]
        }
    }

    def __init__(self, robot_type: str = "KUKA_LBR_iiwa"):
        if robot_type not in self.ROBOTS:
            robot_type = "KUKA_LBR_iiwa"
            
        robot_config = self.ROBOTS[robot_type]
        self.num_joints = robot_config["num_joints"]
        self.link_lengths = robot_config["link_lengths"]
        self.axes = robot_config["axes"]
        
        if HAS_WARP:
            self.wp_axes = wp.array(self.axes, dtype=int)
            self.wp_link_lengths = wp.array(self.link_lengths, dtype=float)

    def compute_forward_kinematics(self, joint_angles: list[float]) -> tuple[list[dict], list[float]]:
        """Compute forward kinematics for all robot joints using PGA Motors.
        Returns list of joint states (angles + motors) and end-effector 3D position [x, y, z].
        """
        # Ensure we have the correct number of angles
        joint_angles = list(joint_angles[:self.num_joints]) + [0.0] * max(0, self.num_joints - len(joint_angles))
        
        if HAS_WARP:
            wp_angles = wp.array(joint_angles, dtype=float)
            wp_motors = wp.empty(shape=self.num_joints, dtype=PGAMotor)
            wp_ee_pos = wp.empty(shape=1, dtype=wp.vec3)
            
            wp.launch(
                kernel=compute_fk_kernel,
                dim=1,
                inputs=[wp_angles, self.wp_axes, self.wp_link_lengths, wp_motors, wp_ee_pos]
            )
            
            # Convert structs to list of lists for JSON serialization
            raw_motors = wp_motors.list()
            motors_np = []
            for m in raw_motors:
                motors_np.append([m.r_s, m.r_e12, m.r_e23, m.r_e31, m.t_x, m.t_y, m.t_z, m.d_e0123])
            
            ee_pos_np = wp_ee_pos.numpy()[0]
        else:
            # CPU Fallback
            motors_np = []
            current_x, current_y, current_z = 0.0, 0.0, self.link_lengths[0]
            
            for i in range(self.num_joints):
                angle = joint_angles[i]
                axis = self.axes[i]
                
                half = angle * 0.5
                c, s = math.cos(half), math.sin(half)
                rotor = [1.0, 0.0, 0.0, 0.0]
                if axis == 2:
                    rotor = [c, -s, 0.0, 0.0]
                elif axis == 0:
                    rotor = [c, 0.0, -s, 0.0]
                elif axis == 1:
                    rotor = [c, 0.0, 0.0, -s]
                
                motors_np.append([
                    rotor[0], rotor[1], rotor[2], rotor[3],
                    0.5 * current_x, 0.5 * current_y, 0.5 * current_z, 0.0
                ])
                
                link_len = self.link_lengths[i]
                if axis == 2:
                    current_z += link_len
                elif axis == 1:
                    current_x += link_len * math.sin(angle)
                    current_z += link_len * math.cos(angle)
                else:
                    current_y += link_len * math.sin(angle)
                    current_z += link_len * math.cos(angle)
                    
            ee_pos_np = [current_x, current_y, current_z]

        joint_states = []
        for i in range(self.num_joints):
            joint_states.append({
                "name": f"joint_{i + 1}",
                "angle": float(joint_angles[i]),
                "motor_data": list(motors_np[i])
            })
            
        return joint_states, [float(ee_pos_np[0]), float(ee_pos_np[1]), float(ee_pos_np[2])]
