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
    @wp.struct
    class PGAMotor:
        r_w: float
        r_x: float
        r_y: float
        r_z: float
        d_w: float
        d_x: float
        d_y: float
        d_z: float

    @wp.func
    def quat_mul_wp(w1: float, x1: float, y1: float, z1: float,
                    w2: float, x2: float, y2: float, z2: float) -> wp.vec4:
        w = w1*w2 - x1*x2 - y1*y2 - z1*z2
        x = w1*x2 + x1*w2 + y1*z2 - z1*y2
        y = w1*y2 - x1*z2 + y1*w2 + z1*x2
        z = w1*z2 + x1*y2 - y1*x2 + z1*w2
        return wp.vec4(w, x, y, z)

    @wp.func
    def mul_motor_wp(A: PGAMotor, B: PGAMotor) -> PGAMotor:
        C = PGAMotor()
        
        # Primary part
        r = quat_mul_wp(A.r_w, A.r_x, A.r_y, A.r_z, B.r_w, B.r_x, B.r_y, B.r_z)
        C.r_w = r[0]
        C.r_x = r[1]
        C.r_y = r[2]
        C.r_z = r[3]
        
        # Dual part
        da = quat_mul_wp(A.r_w, A.r_x, A.r_y, A.r_z, B.d_w, B.d_x, B.d_y, B.d_z)
        db = quat_mul_wp(A.d_w, A.d_x, A.d_y, A.d_z, B.r_w, B.r_x, B.r_y, B.r_z)
        C.d_w = da[0] + db[0]
        C.d_x = da[1] + db[1]
        C.d_y = da[2] + db[2]
        C.d_z = da[3] + db[3]
        
        return C

    @wp.func
    def create_rotor_motor_wp(angle: float, axis: int) -> PGAMotor:
        half = angle * 0.5
        c = wp.cos(half)
        s = wp.sin(half)
        
        M = PGAMotor()
        M.d_w = 0.0
        M.d_x = 0.0
        M.d_y = 0.0
        M.d_z = 0.0
        
        if axis == 0:
            M.r_w = c
            M.r_x = s
            M.r_y = 0.0
            M.r_z = 0.0
        elif axis == 1:
            M.r_w = c
            M.r_x = 0.0
            M.r_y = s
            M.r_z = 0.0
        elif axis == 2:
            M.r_w = c
            M.r_x = 0.0
            M.r_y = 0.0
            M.r_z = s
        else:
            M.r_w = 1.0
            M.r_x = 0.0
            M.r_y = 0.0
            M.r_z = 0.0
            
        return M

    @wp.func
    def extract_pos_wp(M: PGAMotor) -> wp.vec3:
        # T_dual = D * R_rev
        d_res = quat_mul_wp(
            M.d_w, M.d_x, M.d_y, M.d_z,
            M.r_w, -M.r_x, -M.r_y, -M.r_z
        )
        return wp.vec3(2.0 * d_res[1], 2.0 * d_res[2], 2.0 * d_res[3])

    @wp.kernel
    def compute_fk_kernel(
        angles: wp.array(dtype=float),
        axes: wp.array(dtype=int),
        axis_signs: wp.array(dtype=float),
        static_motors: wp.array(dtype=PGAMotor),
        num_joints: int,
        motors: wp.array(dtype=PGAMotor),
        ee_pos: wp.array(dtype=wp.vec3)
    ):
        tid = wp.tid()
        if tid == 0:
            M_curr = PGAMotor()
            M_curr.r_w = 1.0
            M_curr.r_x = 0.0
            M_curr.r_y = 0.0
            M_curr.r_z = 0.0
            M_curr.d_w = 0.0
            M_curr.d_x = 0.0
            M_curr.d_y = 0.0
            M_curr.d_z = 0.0
            
            for i in range(num_joints):
                # Apply static offset
                M_curr = mul_motor_wp(M_curr, static_motors[i])
                
                # Apply joint rotation
                M_joint = create_rotor_motor_wp(angles[i] * axis_signs[i], axes[i])
                M_curr = mul_motor_wp(M_curr, M_joint)
                
                motors[i] = M_curr
                
            # Apply tool offset
            M_curr = mul_motor_wp(M_curr, static_motors[num_joints])
            
            ee_pos[0] = extract_pos_wp(M_curr)


class WarpRoboticsEngine:
    """GPU/CPU Accelerated Kinematics Engine using Geometric Algebra Motor Algebra."""
    
    ROBOTS: ClassVar[dict] = {
        "KUKA_LBR_iiwa": {
            "num_joints": 7,
            "axes": [2, 1, 2, 1, 2, 1, 2],
            "axis_signs": [1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0],
            "static_motors": [[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], [1.0, 0.0, 0.0, 0.0, 0.0, -0.000218, 0.0, 0.18], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], [1.0, 0.0, 0.0, 0.0, 0.0, 0.000218, 0.0, 0.21], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.063]]
        },
        "Franka_Panda": {
            "num_joints": 7,
            "axes": [2, 2, 2, 2, 2, 2, 2],
            "axis_signs": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            "static_motors": [[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1665], [0.707107, -0.707107, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], [0.707107, 0.707107, 0.0, 0.0, 0.0, -0.0, -0.111723, 0.111723], [0.707107, 0.707107, 0.0, 0.0, -0.029168, 0.029168, -0.0, 0.0], [0.707107, -0.707107, 0.0, 0.0, -0.029168, -0.029168, 0.135765, 0.135765], [0.707107, 0.707107, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], [0.707107, 0.707107, 0.0, 0.0, -0.031113, 0.031113, -0.0, 0.0], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0535]]
        },
        "UR5": {
            "num_joints": 6,
            "axes": [2, 1, 1, 1, 2, 1],
            "axis_signs": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            "static_motors": [[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.04458], [0.707107, 0.0, 0.707107, 0.0, -0.04803, 0.0, 0.04803, 0.0], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.05985, 0.2125], [0.707107, 0.0, 0.707107, 0.0, -0.0, -0.138681, 0.0, 0.138681], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0465, 0.0], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.047325], [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]]
        }
    }

    def __init__(self, robot_type: str = "KUKA_LBR_iiwa"):
        if robot_type not in self.ROBOTS:
            robot_type = "KUKA_LBR_iiwa"
            
        robot_config = self.ROBOTS[robot_type]
        self.num_joints = robot_config["num_joints"]
        self.axes = robot_config["axes"]
        self.axis_signs = robot_config.get("axis_signs", [1.0] * self.num_joints)
        self.static_motors_data = robot_config["static_motors"]
        
        if HAS_WARP:
            self.wp_axes = wp.array(self.axes, dtype=int)
            self.wp_axis_signs = wp.array(self.axis_signs, dtype=float)
            
            # Initialize static motors struct array
            motors_list = []
            for m in self.static_motors_data:
                mot = PGAMotor()
                mot.r_w, mot.r_x, mot.r_y, mot.r_z, mot.d_w, mot.d_x, mot.d_y, mot.d_z = m
                motors_list.append(mot)
            self.wp_static_motors = wp.array(motors_list, dtype=PGAMotor)

    def _cpu_quat_mul(self, q1, q2):
        w1, x1, y1, z1 = q1
        w2, x2, y2, z2 = q2
        return [
            w1*w2 - x1*x2 - y1*y2 - z1*z2,
            w1*x2 + x1*w2 + y1*z2 - z1*y2,
            w1*y2 - x1*z2 + y1*w2 + z1*x2,
            w1*z2 + x1*y2 - y1*x2 + z1*w2
        ]

    def _cpu_mul_motor(self, A, B):
        R = self._cpu_quat_mul(A[0:4], B[0:4])
        da = self._cpu_quat_mul(A[0:4], B[4:8])
        db = self._cpu_quat_mul(A[4:8], B[0:4])
        return R + [da[0]+db[0], da[1]+db[1], da[2]+db[2], da[3]+db[3]]

    def compute_forward_kinematics(self, joint_angles: list[float]) -> tuple[list[dict], list[float]]:
        # Ensure we have the correct number of angles
        joint_angles = list(joint_angles[:self.num_joints]) + [0.0] * max(0, self.num_joints - len(joint_angles))
        
        if HAS_WARP:
            wp_angles = wp.array(joint_angles, dtype=float)
            wp_motors = wp.empty(shape=self.num_joints, dtype=PGAMotor)
            wp_ee_pos = wp.empty(shape=1, dtype=wp.vec3)
            
            wp.launch(
                kernel=compute_fk_kernel,
                dim=1,
                inputs=[wp_angles, self.wp_axes, self.wp_axis_signs, self.wp_static_motors, self.num_joints, wp_motors, wp_ee_pos]
            )
            
            # Convert structs to list of lists
            raw_motors = wp_motors.list()
            motors_np = []
            for m in raw_motors:
                motors_np.append([m.r_w, m.r_x, m.r_y, m.r_z, m.d_w, m.d_x, m.d_y, m.d_z])
            
            ee_pos_np = wp_ee_pos.numpy()[0]
        else:
            # CPU Fallback
            motors_np = []
            M_curr = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
            
            for i in range(self.num_joints):
                M_curr = self._cpu_mul_motor(M_curr, self.static_motors_data[i])
                
                angle = joint_angles[i] * self.axis_signs[i]
                axis = self.axes[i]
                half = angle * 0.5
                c, s = math.cos(half), math.sin(half)
                
                M_joint = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
                if axis == 0: M_joint[1] = s; M_joint[0] = c
                elif axis == 1: M_joint[2] = s; M_joint[0] = c
                elif axis == 2: M_joint[3] = s; M_joint[0] = c
                
                M_curr = self._cpu_mul_motor(M_curr, M_joint)
                motors_np.append(M_curr)
                
            M_curr = self._cpu_mul_motor(M_curr, self.static_motors_data[self.num_joints])
            
            # Extract pos
            D = M_curr[4:8]
            R_rev = [M_curr[0], -M_curr[1], -M_curr[2], -M_curr[3]]
            T_dual = self._cpu_quat_mul(D, R_rev)
            ee_pos_np = [2.0 * T_dual[1], 2.0 * T_dual[2], 2.0 * T_dual[3]]

        joint_states = []
        for i in range(self.num_joints):
            joint_states.append({
                "name": f"joint_{i + 1}",
                "angle": float(joint_angles[i]),
                "motor_data": list(motors_np[i])
            })
            
        return joint_states, [float(ee_pos_np[0]), float(ee_pos_np[1]), float(ee_pos_np[2])]
