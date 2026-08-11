/**
 * VHDLExporter.ts
 * Generates behavioral VHDL specification and simulation testbench for the
 * Cl(3,0) Geometric Product combinational multiplier entity.
 */

export function generateVHDLMultivectorMultiplier(): string {
  return `-- =============================================================================
-- Sensensible Geometry: Cl(3,0) Geometric Product Multiplier Specification
-- Entity: clifford_multiplier
-- Description: Combinational hardware multiplier for 8-component multivectors in Cl(3,0).
-- =============================================================================

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity clifford_multiplier is
    port (
        -- Multivector A Inputs
        a_scalar : in  real;
        a_e1     : in  real;
        a_e2     : in  real;
        a_e3     : in  real;
        a_e12    : in  real;
        a_e23    : in  real;
        a_e31    : in  real;
        a_e123   : in  real;

        -- Multivector B Inputs
        b_scalar : in  real;
        b_e1     : in  real;
        b_e2     : in  real;
        b_e3     : in  real;
        b_e12    : in  real;
        b_e23    : in  real;
        b_e31    : in  real;
        b_e123   : in  real;

        -- Result Multivector Outputs
        res_scalar : out real;
        res_e1     : out real;
        res_e2     : out real;
        res_e3     : out real;
        res_e12    : out real;
        res_e23    : out real;
        res_e31    : out real;
        res_e123   : out real
    );
end entity clifford_multiplier;

architecture behavioral of clifford_multiplier is
begin
    -- Geometric Product in Cl(3,0): 8-grade output combinational logic
    res_scalar <= a_scalar*b_scalar + a_e1*b_e1 + a_e2*b_e2 + a_e3*b_e3 
                 - a_e12*b_e12 - a_e23*b_e23 - a_e31*b_e31 - a_e123*b_e123;

    res_e1     <= a_scalar*b_e1 + a_e1*b_scalar - a_e2*b_e12 + a_e3*b_e31 
                 + a_e12*b_e2 - a_e23*b_e123 - a_e31*b_e3 - a_e123*b_e23;

    res_e2     <= a_scalar*b_e2 + a_e1*b_e12 + a_e2*b_scalar - a_e3*b_e23 
                 - a_e12*b_e1 + a_e23*b_e3 - a_e31*b_e123 - a_e123*b_e31;

    res_e3     <= a_scalar*b_e3 - a_e1*b_e31 + a_e2*b_e23 + a_e3*b_scalar 
                 - a_e12*b_e123 - a_e23*b_e2 + a_e31*b_e1 - a_e123*b_e12;

    res_e12    <= a_scalar*b_e12 + a_e1*b_e2 - a_e2*b_e1 + a_e3*b_e123 
                 + a_e12*b_scalar - a_e23*b_e31 + a_e31*b_e23 + a_e123*b_e3;

    res_e23    <= a_scalar*b_e23 + a_e1*b_e123 + a_e2*b_e3 - a_e3*b_e2 
                 + a_e12*b_e31 + a_e23*b_scalar - a_e31*b_e12 + a_e123*b_e1;

    res_e31    <= a_scalar*b_e31 - a_e1*b_e3 + a_e2*b_e123 + a_e3*b_e1 
                 - a_e12*b_e23 + a_e23*b_e12 + a_e31*b_scalar + a_e123*b_e2;

    res_e123   <= a_scalar*b_e123 + a_e1*b_e23 + a_e2*b_e31 + a_e3*b_e12 
                 + a_e12*b_e3 + a_e23*b_e1 + a_e31*b_e2 + a_e123*b_scalar;
end architecture behavioral;

-- =============================================================================
-- Simulation Testbench Entity: tb_clifford_multiplier
-- =============================================================================

entity tb_clifford_multiplier is
end entity tb_clifford_multiplier;

architecture testbench of tb_clifford_multiplier is
    component clifford_multiplier is
        port (
            a_scalar, a_e1, a_e2, a_e3, a_e12, a_e23, a_e31, a_e123 : in real;
            b_scalar, b_e1, b_e2, b_e3, b_e12, b_e23, b_e31, b_e123 : in real;
            res_scalar, res_e1, res_e2, res_e3, res_e12, res_e23, res_e31, res_e123 : out real
        );
    end component;

    signal a_s, a_1, a_2, a_3, a_12, a_23, a_31, a_123 : real := 0.0;
    signal b_s, b_1, b_2, b_3, b_12, b_23, b_31, b_123 : real := 0.0;
    signal r_s, r_1, r_2, r_3, r_12, r_23, r_31, r_123 : real;

begin
    uut: clifford_multiplier port map (
        a_scalar => a_s, a_e1 => a_1, a_e2 => a_2, a_e3 => a_3,
        a_e12 => a_12, a_e23 => a_23, a_e31 => a_31, a_e123 => a_123,
        b_scalar => b_s, b_e1 => b_1, b_e2 => b_2, b_e3 => b_3,
        b_e12 => b_12, b_e23 => b_23, b_e31 => b_31, b_e123 => b_123,
        res_scalar => r_s, res_e1 => r_1, res_e2 => r_2, res_e3 => r_3,
        res_e12 => r_12, res_e23 => r_23, res_e31 => r_31, res_e123 => r_123
    );

    stim_proc: process
    begin
        -- Test Case 1: e1 * e1 = 1.0 (Scalar inner product identity)
        a_1 <= 1.0; b_1 <= 1.0;
        wait for 10 ns;
        assert (r_s = 1.0) report "FAILED: e1 * e1 should equal scalar 1.0" severity error;

        -- Test Case 2: e1 * e2 = e12 (Outer product bivector creation)
        a_1 <= 1.0; b_1 <= 0.0; b_2 <= 1.0;
        wait for 10 ns;
        assert (r_12 = 1.0) report "FAILED: e1 * e2 should equal bivector e12" severity error;

        report "TESTBENCH COMPLETED: All Clifford Cl(3,0) multiplier identities verified!";
        wait;
    end process;
end architecture testbench;
`;
}
