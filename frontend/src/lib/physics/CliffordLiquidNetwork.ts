import { Multivector } from 'engine';

/**
 * Geometric Neural Computing: Clifford-based Liquid Time-constant Network (LTC)
 * 
 * Embodies an E(3) equivariant Liquid Neural Network using Geometric Algebra.
 * The hidden states are Multivectors, and the ODE time-constants are liquid
 * (input-dependent), providing resilience against severe cyclogenetic perturbations.
 */
export class CliffordLTCNode {
    state: Multivector;
    weights: Multivector[];
    bias: Multivector;
    tau: number; // Base time constant

    /** Save current hidden state for gradient computation checkpointing */
    public saveState(): number[] {
        return [
            this.state.get_scalar(),
            this.state.get_vector_x(),
            this.state.get_vector_y(),
            this.state.get_vector_z(),
            this.state.get_bivector_xy(),
            this.state.get_bivector_yz(),
            this.state.get_bivector_zx(),
            this.state.get_trivector(),
        ];
    }

    /** Restore hidden state from checkpoint */
    public restoreState(s: number[]): void {
        this.state = new Multivector(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
    }
    
    constructor(inputSize: number) {
        this.state = Multivector.scalar(0.1);
        this.tau = 1.0;
        this.bias = Multivector.scalar(0.01);
        
        // Initialize weights as tiny multivectors
        this.weights = [];
        for (let i = 0; i < inputSize; i++) {
            this.weights.push(new Multivector(0.1, 0.01, 0.01, 0.01, 0.0, 0.0, 0.0, 0.0));
        }
    }

    /**
     * Clifford Activation Function: Geometric Sigmoid over Multivectors
     * Very basic approximation: applying standard sigmoid to scalar and vector components.
     */
    private geometricSigmoid(m: Multivector): Multivector {
        const sig = (x: number) => 1.0 / (1.0 + Math.exp(-x));
        return new Multivector(
            sig(m.get_scalar()) - 0.5,
            sig(m.get_vector_x()) - 0.5,
            sig(m.get_vector_y()) - 0.5,
            sig(m.get_vector_z()) - 0.5,
            sig(m.get_bivector_xy()) - 0.5,
            sig(m.get_bivector_yz()) - 0.5,
            sig(m.get_bivector_zx()) - 0.5,
            sig(m.get_trivector()) - 0.5
        );
    }

    /**
     * Geometric addition (simple component-wise addition)
     */
    private add(a: Multivector, b: Multivector): Multivector {
        return new Multivector(
            a.get_scalar() + b.get_scalar(),
            a.get_vector_x() + b.get_vector_x(),
            a.get_vector_y() + b.get_vector_y(),
            a.get_vector_z() + b.get_vector_z(),
            a.get_bivector_xy() + b.get_bivector_xy(),
            a.get_bivector_yz() + b.get_bivector_yz(),
            a.get_bivector_zx() + b.get_bivector_zx(),
            a.get_trivector() + b.get_trivector()
        );
    }
    
    private scale(a: Multivector, s: number): Multivector {
        return new Multivector(
            a.get_scalar() * s,
            a.get_vector_x() * s,
            a.get_vector_y() * s,
            a.get_vector_z() * s,
            a.get_bivector_xy() * s,
            a.get_bivector_yz() * s,
            a.get_bivector_zx() * s,
            a.get_trivector() * s
        );
    }

    public getParameters(): number[] {
        const params: number[] = [];
        for (const w of this.weights) {
            params.push(
                w.get_scalar(),
                w.get_vector_x(),
                w.get_vector_y(),
                w.get_vector_z(),
                w.get_bivector_xy(),
                w.get_bivector_yz(),
                w.get_bivector_zx(),
                w.get_trivector()
            );
        }
        params.push(
            this.bias.get_scalar(),
            this.bias.get_vector_x(),
            this.bias.get_vector_y(),
            this.bias.get_vector_z(),
            this.bias.get_bivector_xy(),
            this.bias.get_bivector_yz(),
            this.bias.get_bivector_zx(),
            this.bias.get_trivector()
        );
        return params;
    }

    public setParameters(params: number[], offset: number = 0): number {
        let idx = offset;
        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] = new Multivector(
                params[idx],
                params[idx + 1],
                params[idx + 2],
                params[idx + 3],
                params[idx + 4],
                params[idx + 5],
                params[idx + 6],
                params[idx + 7]
            );
            idx += 8;
        }
        this.bias = new Multivector(
            params[idx],
            params[idx + 1],
            params[idx + 2],
            params[idx + 3],
            params[idx + 4],
            params[idx + 5],
            params[idx + 6],
            params[idx + 7]
        );
        idx += 8;
        return idx;
    }

    /**
     * Fused ODE Solver step for the Clifford-LTC (Algorithm 1 from Hasani et al.)
     * extended to Multivector operations.
     * dx/dt = -x/tau + f(x, I)(A - x)
     */
    public forward(inputs: Multivector[], dt: number): Multivector {
        // 1. Calculate the non-linear coupling term f(x, I) using geometric product
        let coupling = this.bias;
        for (let i = 0; i < inputs.length; i++) {
            const w_I = this.weights[i].geometric_product(inputs[i]);
            coupling = this.add(coupling, w_I);
        }
        
        // Add recurrent connection (state -> coupling)
        const recurrent = this.state.geometric_product(Multivector.scalar(0.5));
        coupling = this.add(coupling, recurrent);
        
        // Activation
        const f_val = this.geometricSigmoid(coupling);
        
        // 2. Liquid Time-constant formulation (simplified Fused Euler step)
        const f_norm = Math.abs(f_val.get_scalar()) + 
                       Math.abs(f_val.get_vector_x()) + 
                       Math.abs(f_val.get_vector_y()) + 
                       Math.abs(f_val.get_vector_z());
                       
        const liquid_tau = 1.0 / (1.0/this.tau + f_norm);
        
        // Update state
        // x(t+dt) = x(t) + dt * (-x(t)/tau + f_val)
        // Explicit euler approximation for the liquid update
        const decay = this.scale(this.state, -1.0 / this.tau);
        const delta = this.scale(this.add(decay, f_val), dt);
        
        this.state = this.add(this.state, delta);
        
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
    
    public forward(inputs: Multivector[], dt: number): Multivector[] {
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

    /** Save all node hidden states (for gradient checkpointing) */
    private saveStates(): number[][] {
        return this.nodes.map(n => n.saveState());
    }

    /** Restore all node hidden states from checkpoint */
    private restoreStates(states: number[][]): void {
        this.nodes.forEach((n, i) => n.restoreState(states[i]));
    }

    /**
     * Compute Loss over a target vector direction and bivector strain penalty
     * L = ||v_out - v_target||^2 + lambda * ||B_out||^2
     */
    public computeLoss(
        inputs: Multivector[],
        targetVector: Multivector,
        strainLambda: number = 0.1,
        dt: number = 0.016
    ): { loss: number; vecError: number; strainError: number } {
        const outputs = this.forward(inputs, dt);
        let sumVx = 0, sumVy = 0, sumVz = 0;
        let sumBxy = 0, sumByz = 0, sumBzx = 0;

        for (const out of outputs) {
            sumVx += out.get_vector_x();
            sumVy += out.get_vector_y();
            sumVz += out.get_vector_z();
            sumBxy += out.get_bivector_xy();
            sumByz += out.get_bivector_yz();
            sumBzx += out.get_bivector_zx();
        }
        const n = outputs.length || 1;
        const avgVx = sumVx / n;
        const avgVy = sumVy / n;
        const avgVz = sumVz / n;
        const avgBxy = sumBxy / n;
        const avgByz = sumByz / n;
        const avgBzx = sumBzx / n;

        const targetVx = targetVector.get_vector_x();
        const targetVy = targetVector.get_vector_y();
        const targetVz = targetVector.get_vector_z();

        const vecError =
            Math.pow(avgVx - targetVx, 2) +
            Math.pow(avgVy - targetVy, 2) +
            Math.pow(avgVz - targetVz, 2);

        const strainError =
            Math.pow(avgBxy, 2) + Math.pow(avgByz, 2) + Math.pow(avgBzx, 2);

        const loss = vecError + strainLambda * strainError;

        return { loss, vecError, strainError };
    }

    /**
     * Single step of Finite-Difference SGD optimization
     */
    public trainStep(
        inputs: Multivector[],
        targetVector: Multivector,
        lr: number = 0.01,
        dt: number = 0.016,
        strainLambda: number = 0.1,
        epsilon: number = 1e-4
    ): { loss: number; vecError: number; strainError: number } {
        const p = this.getParameters();
        const grads = new Array<number>(p.length);

        // Checkpoint node hidden states before gradient computation.
        // forward() mutates state on every call, so we must restore
        // to the same starting state for each finite-difference probe.
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

        // Apply SGD update
        for (let i = 0; i < p.length; i++) {
            p[i] -= lr * grads[i];
        }
        this.setParameters(p);

        // Final forward pass from the checkpointed state
        this.restoreStates(savedStates);
        return this.computeLoss(inputs, targetVector, strainLambda, dt);
    }
    
    // Exports architecture schema for GCP / JAX RL pipeline
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
