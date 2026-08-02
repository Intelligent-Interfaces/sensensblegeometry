use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator. We're skipping this for now for simplicity, but it's common in WASM.

#[wasm_bindgen]
pub fn init_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_once` function. This provides better error messages in the browser console.
    console_error_panic_hook::set_once();
}

/// A 3D Geometric Algebra Multivector (Cl(3, 0)).
/// Components correspond to:
/// 0: Scalar (1)
/// 1: Vector X (e1)
/// 2: Vector Y (e2)
/// 3: Vector Z (e3)
/// 4: Bivector XY (e12)
/// 5: Bivector YZ (e23)
/// 6: Bivector ZX (e31)
/// 7: Trivector / Pseudoscalar (e123)
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Multivector {
    data: [f64; 8],
}

#[wasm_bindgen]
impl Multivector {
    #[wasm_bindgen(constructor)]
    pub fn new(s: f64, e1: f64, e2: f64, e3: f64, e12: f64, e23: f64, e31: f64, e123: f64) -> Multivector {
        Multivector {
            data: [s, e1, e2, e3, e12, e23, e31, e123],
        }
    }

    pub fn scalar(val: f64) -> Multivector {
        let mut m = Multivector::new(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        m.data[0] = val;
        m
    }

    pub fn vector(x: f64, y: f64, z: f64) -> Multivector {
        let mut m = Multivector::new(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        m.data[1] = x;
        m.data[2] = y;
        m.data[3] = z;
        m
    }

    pub fn geometric_product(&self, other: &Multivector) -> Multivector {
        let mut res = [0.0; 8];
        let a = self.data;
        let b = other.data;
        res[0] = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] - a[4] * b[4] - a[5] * b[5] - a[6] * b[6] - a[7] * b[7];
        res[1] = a[0] * b[1] + a[1] * b[0] - a[2] * b[4] + a[3] * b[6] + a[4] * b[2] - a[5] * b[7] - a[6] * b[3] - a[7] * b[5];
        res[2] = a[0] * b[2] + a[1] * b[4] + a[2] * b[0] - a[3] * b[5] - a[4] * b[1] + a[5] * b[3] - a[6] * b[7] - a[7] * b[6];
        res[3] = a[0] * b[3] - a[1] * b[6] + a[2] * b[5] + a[3] * b[0] - a[4] * b[7] - a[5] * b[2] + a[6] * b[1] - a[7] * b[4];
        res[4] = a[0] * b[4] + a[1] * b[2] - a[2] * b[1] + a[3] * b[7] + a[4] * b[0] - a[5] * b[6] + a[6] * b[5] + a[7] * b[3];
        res[5] = a[0] * b[5] + a[1] * b[7] + a[2] * b[3] - a[3] * b[2] + a[4] * b[6] + a[5] * b[0] - a[6] * b[4] + a[7] * b[1];
        res[6] = a[0] * b[6] - a[1] * b[3] + a[2] * b[7] + a[3] * b[1] - a[4] * b[5] + a[5] * b[4] + a[6] * b[0] + a[7] * b[2];
        res[7] = a[0] * b[7] + a[1] * b[5] + a[2] * b[6] + a[3] * b[4] + a[4] * b[3] + a[5] * b[1] + a[6] * b[2] + a[7] * b[0];
        Multivector { data: res }
    }

    pub fn wedge(&self, other: &Multivector) -> Multivector {
        let mut res = [0.0; 8];
        let a = self.data;
        let b = other.data;
        res[0] = a[0] * b[0];
        res[1] = a[0] * b[1] + a[1] * b[0];
        res[2] = a[0] * b[2] + a[2] * b[0];
        res[3] = a[0] * b[3] + a[3] * b[0];
        res[4] = a[0] * b[4] + a[1] * b[2] - a[2] * b[1] + a[4] * b[0];
        res[5] = a[0] * b[5] + a[2] * b[3] - a[3] * b[2] + a[5] * b[0];
        res[6] = a[0] * b[6] - a[1] * b[3] + a[3] * b[1] + a[6] * b[0];
        res[7] = a[0] * b[7] + a[1] * b[5] + a[2] * b[6] + a[3] * b[4] + a[4] * b[3] + a[5] * b[1] + a[6] * b[2] + a[7] * b[0];
        Multivector { data: res }
    }

    pub fn inner(&self, other: &Multivector) -> Multivector {
        let mut res = [0.0; 8];
        let a = self.data;
        let b = other.data;
        res[0] = a[1] * b[1] + a[2] * b[2] + a[3] * b[3] - a[4] * b[4] - a[5] * b[5] - a[6] * b[6] - a[7] * b[7];
        res[1] = - a[2] * b[4] + a[3] * b[6] + a[4] * b[2] - a[5] * b[7] - a[6] * b[3] - a[7] * b[5];
        res[2] = a[1] * b[4] - a[3] * b[5] - a[4] * b[1] + a[5] * b[3] - a[6] * b[7] - a[7] * b[6];
        res[3] = - a[1] * b[6] + a[2] * b[5] - a[4] * b[7] - a[5] * b[2] + a[6] * b[1] - a[7] * b[4];
        res[4] = a[3] * b[7] + a[7] * b[3];
        res[5] = a[1] * b[7] + a[7] * b[1];
        res[6] = a[2] * b[7] + a[7] * b[2];
        Multivector { data: res }
    }

    pub fn dual(&self) -> Multivector {
        let i_inv = Multivector::new(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0);
        self.geometric_product(&i_inv)
    }

    pub fn get_scalar(&self) -> f64 { self.data[0] }
    pub fn get_vector_x(&self) -> f64 { self.data[1] }
    pub fn get_vector_y(&self) -> f64 { self.data[2] }
    pub fn get_vector_z(&self) -> f64 { self.data[3] }
    pub fn get_bivector_xy(&self) -> f64 { self.data[4] }
    pub fn get_bivector_yz(&self) -> f64 { self.data[5] }
    pub fn get_bivector_zx(&self) -> f64 { self.data[6] }
    pub fn get_trivector(&self) -> f64 { self.data[7] }
}

/// The state of our geometric canvas simulation
#[wasm_bindgen]
pub struct SimulationState {
    objects: Vec<Multivector>,
}

#[wasm_bindgen]
impl SimulationState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SimulationState {
        SimulationState {
            objects: Vec::new(),
        }
    }

    pub fn add_object(&mut self, obj: Multivector) {
        self.objects.push(obj);
    }

    pub fn object_count(&self) -> usize {
        self.objects.len()
    }

    pub fn get_object(&self, index: usize) -> Multivector {
        self.objects[index]
    }

    pub fn clear(&mut self) {
        self.objects.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_e1_squared_is_1() {
        let e1 = Multivector::vector(1.0, 0.0, 0.0);
        let e1_sq = e1.geometric_product(&e1);
        
        // e1^2 = 1 (scalar)
        assert_eq!(e1_sq.data[0], 1.0);
        assert_eq!(e1_sq.data[1], 0.0);
    }

    #[test]
    fn test_e1_e2_anticommute() {
        let e1 = Multivector::vector(1.0, 0.0, 0.0);
        let e2 = Multivector::vector(0.0, 1.0, 0.0);
        
        let e12 = e1.geometric_product(&e2);
        let e21 = e2.geometric_product(&e1);
        
        // e1 e2 = e12
        assert_eq!(e12.data[4], 1.0);
        
        // e2 e1 = -e12
        assert_eq!(e21.data[4], -1.0);
    }
}
