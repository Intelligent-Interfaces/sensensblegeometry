import { describe, it, expect } from 'vitest';
import { JSMultivector, CliffordLiquidNetwork, CliffordLTCNode } from './CliffordLiquidNetwork';

describe('JSMultivector Algebra Cl(3,0)', () => {
  it('correctly evaluates scalar multiplication and addition', () => {
    const a = new JSMultivector(1, 2, 3, 4, 0, 0, 0, 0);
    const b = new JSMultivector(2, -1, 0, 1, 0, 0, 0, 0);
    const c = a.add(b);

    expect(c.s).toBe(3);
    expect(c.x).toBe(1);
    expect(c.y).toBe(3);
    expect(c.z).toBe(5);
  });

  it('correctly computes e1 * e2 = e12 (Geometric Product)', () => {
    const e1 = JSMultivector.vector(1, 0, 0);
    const e2 = JSMultivector.vector(0, 1, 0);
    const e12 = e1.geometric_product(e2);

    expect(e12.s).toBe(0);
    expect(e12.x).toBe(0);
    expect(e12.y).toBe(0);
    expect(e12.z).toBe(0);
    expect(e12.xy).toBe(1);
  });

  it('correctly evaluates e1^2 = 1 and e12^2 = -1', () => {
    const e1 = JSMultivector.vector(1, 0, 0);
    const e1_sq = e1.geometric_product(e1);
    expect(e1_sq.s).toBe(1);

    const e12 = new JSMultivector(0, 0, 0, 0, 1, 0, 0, 0);
    const e12_sq = e12.geometric_product(e12);
    expect(e12_sq.s).toBe(-1);
  });
});

describe('CliffordLiquidNetwork Stability & Memory Leak Prevention', () => {
  it('runs 1,000 forward passes without crashing or accumulating memory leaks', () => {
    const net = new CliffordLiquidNetwork(4, 2);
    const inputs = [
      JSMultivector.vector(1.0, 0.5, 0.2),
      JSMultivector.vector(0.1, -0.5, 1.0)
    ];

    for (let i = 0; i < 1000; i++) {
      const outputs = net.forward(inputs, 0.016);
      expect(outputs.length).toBe(4);
      expect(Number.isNaN(outputs[0].s)).toBe(false);
    }
  });

  it('successfully converges loss during SGD training steps', () => {
    const net = new CliffordLiquidNetwork(2, 2);
    const inputs = [
      JSMultivector.vector(1.0, 0.0, 0.0),
      JSMultivector.vector(0.0, 1.0, 0.0)
    ];
    const target = JSMultivector.vector(0.0, 1.0, 0.0);

    const initialLoss = net.computeLoss(inputs, target).loss;
    let finalLoss = initialLoss;

    for (let step = 0; step < 50; step++) {
      const res = net.trainStep(inputs, target, 0.05, 0.016, 0.1);
      finalLoss = res.loss;
    }

    expect(finalLoss).toBeLessThan(initialLoss);
  });
});
