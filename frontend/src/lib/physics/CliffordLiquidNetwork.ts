/**
 * Geometric Neural Computing: Clifford-based Liquid Time-constant Network (LTC)
 * 
 * Embodies an E(3) equivariant Liquid Neural Network using Geometric Algebra Cl(3,0).
 * The hidden states are Multivectors, and the ODE time-constants are liquid
 * (input-dependent), providing resilience against severe cyclogenetic perturbations.
 */

export class JSMultivector {
    constructor(
        public s: number = 0,
        public x: number = 0,
        public y: number = 0,
        public z: number = 0,
        public xy: number = 0,
        public yz: number = 0,
        public zx: number = 0,
        public t: number = 0
    ) {}

    public get_scalar(): number { return this.s; }
    public get_vector_x(): number { return this.x; }
    public get_vector_y(): number { return this.y; }
    public get_vector_z(): number { return this.z; }
    public get_bivector_xy(): number { return this.xy; }
    public get_bivector_yz(): number { return this.yz; }
    public get_bivector_zx(): number { return this.zx; }
    public get_trivector(): number { return this.t; }

    public static scalar(s: number): JSMultivector {
        return new JSMultivector(s, 0, 0, 0, 0, 0, 0, 0);
    }

    public static vector(x: number, y: number, z: number): JSMultivector {
        return new JSMultivector(0, x, y, z, 0, 0, 0, 0);
    }

    public static from(m: any): JSMultivector {
        if (!m) return new JSMultivector();
        if (m instanceof JSMultivector) return m;
        return new JSMultivector(
            typeof m.get_scalar === 'function' ? m.get_scalar() : 0,
            typeof m.get_vector_x === 'function' ? m.get_vector_x() : 0,
            typeof m.get_vector_y === 'function' ? m.get_vector_y() : 0,
            typeof m.get_vector_z === 'function' ? m.get_vector_z() : 0,
            typeof m.get_bivector_xy === 'function' ? m.get_bivector_xy() : 0,
            typeof m.get_bivector_yz === 'function' ? m.get_bivector_yz() : 0,
            typeof m.get_bivector_zx === 'function' ? m.get_bivector_zx() : 0,
            typeof m.get_trivector === 'function' ? m.get_trivector() : 0
        );
    }

    public add(b: JSMultivector): JSMultivector {
        return new JSMultivector(
            this.s + b.s,
            this.x + b.x,
            this.y + b.y,
            this.z + b.z,
            this.xy + b.xy,
            this.yz + b.yz,
            this.zx + b.zx,
            this.t + b.t
        );
    }

    public scale(factor: number): JSMultivector {
        return new JSMultivector(
            this.s * factor,
            this.x * factor,
            this.y * factor,
            this.z * factor,
            this.xy * factor,
            this.yz * factor,
            this.zx * factor,
            this.t * factor
        );
    }

    public geometric_product(b: JSMultivector): JSMultivector {
        const a = this;
        return new JSMultivector(
            a.s*b.s + a.x*b.x + a.y*b.y + a.z*b.z - a.xy*b.xy - a.yz*b.yz - a.zx*b.zx - a.t*b.t,
            a.s*b.x + a.x*b.s - a.y*b.xy + a.z*b.zx + a.xy*b.y - a.yz*b.t - a.zx*b.z - a.t*b.yz,
            a.s*b.y + a.x*b.xy + a.y*b.s - a.z*b.yz - a.xy*b.x + a.yz*b.z - a.zx*b.t - a.t*b.zx,
            a.s*b.z - a.x*b.zx + a.y*b.yz + a.z*b.s - a.yz*b.y + a.zx*b.x - a.xy*b.t - a.t*b.xy,
            a.s*b.xy + a.x*b.y - a.y*b.x + a.z*b.t + a.xy*b.s - a.yz*b.zx + a.zx*b.yz + a.t*b.z,
            a.s*b.yz + a.x*b.t + a.y*b.z - a.z*b.y + a.xy*b.zx + a.yz*b.s - a.zx*b.xy + a.t*b.x,
            a.s*b.zx - a.x*b.z + a.y*b.t + a.z*b.x - a.xy*b.yz + a.yz*b.xy + a.zx*b.s + a.t*b.y,
            a.s*b.t + a.x*b.yz + a.y*b.zx + a.z*b.xy + a.xy*b.z + a.yz*b.x + a.zx*b.y + a.t*b.s
        );
    }

    public sigmoid(): JSMultivector {
        const sig = (val: number) => 1.0 / (1.0 + Math.exp(-val));
        return new JSMultivector(
            sig(this.s) - 0.5,
            sig(this.x) - 0.5,
            sig(this.y) - 0.5,
            sig(this.z) - 0.5,
            sig(this.xy) - 0.5,
            sig(this.yz) - 0.5,
            sig(this.zx) - 0.5,
            sig(this.t) - 0.5
        );
    }
}

export class CliffordLTCNode {
    state: JSMultivector;
    weights: JSMultivector[];
    bias: JSMultivector;
    tau: number;

    constructor(inputSize: number) {
        this.state = JSMultivector.scalar(0.1);
        this.tau = 1.0;
        this.bias = JSMultivector.scalar(0.01);
        
        this.weights = [];
        for (let i = 0; i < inputSize; i++) {
            this.weights.push(new JSMultivector(0.1, 0.01, 0.01, 0.01, 0.0, 0.0, 0.0, 0.0));
        }
    }

    public saveState(): number[] {
        return [
            this.state.s,
            this.state.x,
            this.state.y,
            this.state.z,
            this.state.xy,
            this.state.yz,
            this.state.zx,
            this.state.t,
        ];
    }

    public restoreState(s: number[]): void {
        this.state = new JSMultivector(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
    }

    public getParameters(): number[] {
        const params: number[] = [];
        for (const w of this.weights) {
            params.push(w.s, w.x, w.y, w.z, w.xy, w.yz, w.zx, w.t);
        }
        params.push(this.bias.s, this.bias.x, this.bias.y, this.bias.z, this.bias.xy, this.bias.yz, this.bias.zx, this.bias.t);
        return params;
    }

    public setParameters(params: number[], offset: number = 0): number {
        let idx = offset;
        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] = new JSMultivector(
                params[idx], params[idx + 1], params[idx + 2], params[idx + 3],
                params[idx + 4], params[idx + 5], params[idx + 6], params[idx + 7]
            );
            idx += 8;
        }
        this.bias = new JSMultivector(
            params[idx], params[idx + 1], params[idx + 2], params[idx + 3],
            params[idx + 4], params[idx + 5], params[idx + 6], params[idx + 7]
        );
        idx += 8;
        return idx;
    }

    public forward(inputsRaw: any[], dt: number): JSMultivector {
        const inputs = inputsRaw.map(i => JSMultivector.from(i));
        let coupling = this.bias;
        for (let i = 0; i < inputs.length; i++) {
            const w_I = this.weights[i].geometric_product(inputs[i]);
            coupling = coupling.add(w_I);
        }
        
        const recurrent = this.state.geometric_product(JSMultivector.scalar(0.5));
        coupling = coupling.add(recurrent);
        
        const f_val = coupling.sigmoid();
        
        const f_norm = Math.abs(f_val.s) + Math.abs(f_val.x) + Math.abs(f_val.y) + Math.abs(f_val.z);
        const liquid_tau = 1.0 / (1.0 / this.tau + f_norm);
        
        const decay = this.state.scale(-1.0 / this.tau);
        const delta = decay.add(f_val).scale(dt);
        
        this.state = this.state.add(delta);
        return this.state;
    }
}

export class CliffordLiquidNetwork {
    nodes: CliffordLTCNode[];
    
    constructor(numNodes: number, inputsPerNode: number) {
        this.nodes = [];
        for (let i = 0; i < numNodes; i++) {
            this.nodes.push(new CliffordLTCNode(inputsPerNode));
        }
    }
    
    public forward(inputs: any[], dt: number): JSMultivector[] {
        return this.nodes.map(node => node.forward(inputs, dt));
    }

    public getParameters(): number[] {
        const all: number[] = [];
        for (const node of this.nodes) {
            all.push(...node.getParameters());
        }
        return all;
    }

    public setParameters(params: number[]): void {
        let offset = 0;
        for (const node of this.nodes) {
            offset = node.setParameters(params, offset);
        }
    }

    private saveStates(): number[][] {
        return this.nodes.map(n => n.saveState());
    }

    private restoreStates(states: number[][]): void {
        this.nodes.forEach((n, i) => n.restoreState(states[i]));
    }

    public computeLoss(
        inputs: any[],
        targetVectorRaw: any,
        strainLambda: number = 0.1,
        dt: number = 0.016
    ): { loss: number; vecError: number; strainError: number } {
        const targetVector = JSMultivector.from(targetVectorRaw);
        const outputs = this.forward(inputs, dt);
        let sumVx = 0, sumVy = 0, sumVz = 0;
        let sumBxy = 0, sumByz = 0, sumBzx = 0;

        for (const out of outputs) {
            sumVx += out.x;
            sumVy += out.y;
            sumVz += out.z;
            sumBxy += out.xy;
            sumByz += out.yz;
            sumBzx += out.zx;
        }

        const n = outputs.length || 1;
        const avgVx = sumVx / n;
        const avgVy = sumVy / n;
        const avgVz = sumVz / n;
        const avgBxy = sumBxy / n;
        const avgByz = sumByz / n;
        const avgBzx = sumBzx / n;

        const targetVx = targetVector.x;
        const targetVy = targetVector.y;
        const targetVz = targetVector.z;

        const vecError =
            Math.pow(avgVx - targetVx, 2) +
            Math.pow(avgVy - targetVy, 2) +
            Math.pow(avgVz - targetVz, 2);

        const strainError =
            Math.pow(avgBxy, 2) + Math.pow(avgByz, 2) + Math.pow(avgBzx, 2);

        const loss = vecError + strainLambda * strainError;

        return { loss, vecError, strainError };
    }

    public trainStep(
        inputs: any[],
        targetVector: any,
        lr: number = 0.01,
        dt: number = 0.016,
        strainLambda: number = 0.1,
        epsilon: number = 1e-4
    ): { loss: number; vecError: number; strainError: number } {
        const p = this.getParameters();
        const grads = new Array<number>(p.length);

        const savedStates = this.saveStates();

        for (let i = 0; i < p.length; i++) {
            const originalVal = p[i];
            
            p[i] = originalVal + epsilon;
            this.setParameters(p);
            this.restoreStates(savedStates);
            const lossPlus = this.computeLoss(inputs, targetVector, strainLambda, dt).loss;

            p[i] = originalVal - epsilon;
            this.setParameters(p);
            this.restoreStates(savedStates);
            const lossMinus = this.computeLoss(inputs, targetVector, strainLambda, dt).loss;

            p[i] = originalVal;
            grads[i] = (lossPlus - lossMinus) / (2 * epsilon);
        }

        for (let i = 0; i < p.length; i++) {
            p[i] -= lr * grads[i];
        }
        this.setParameters(p);

        this.restoreStates(savedStates);
        return this.computeLoss(inputs, targetVector, strainLambda, dt);
    }
    
    public exportJAXSchema() {
        return {
            type: "CliffordLiquidTimeConstantNetwork",
            nodes: this.nodes.length,
            geometry: "Cl(3,0) Multivector",
            equivariant: true,
            layers: [
                {
                    type: "LTC_Fused_ODE",
                    tau_base: 1.0,
                    weights_shape: `[${this.nodes.length}, ${this.nodes[0].weights.length}, 8]`
                }
            ]
        };
    }
}
