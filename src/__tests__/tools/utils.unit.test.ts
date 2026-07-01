import { describe, it, expect } from "vitest";
import { halfUp, UF_VALIDAS } from "../../utils.js";

describe("halfUp", () => {
  it("rounds values down when the third decimal is < 5", () => {
    // 1.234 → 1.23
    expect(halfUp(1.234)).toBe(1.23);
    // 9.991 → 9.99
    expect(halfUp(9.991)).toBe(9.99);
  });

  it("rounds values up when the third decimal is >= 5", () => {
    // 1.236 → 1.24
    expect(halfUp(1.236)).toBe(1.24);
    // 9.999 → 10.00
    expect(halfUp(9.999)).toBe(10);
  });

  it("leaves already-rounded values unchanged", () => {
    expect(halfUp(100.00)).toBe(100);
    expect(halfUp(0.01)).toBe(0.01);
  });

  it("handles zero", () => {
    expect(halfUp(0)).toBe(0);
  });

  it("works for typical freight tax values", () => {
    // valorFrete=1000, icms=12% => 120.00
    expect(halfUp(1000 * 12 / 100)).toBe(120);
    // valorFrete=333.33, ibs=0.1% => 0.33
    expect(halfUp(333.33 * 0.1 / 100)).toBe(0.33);
  });
});

describe("UF_VALIDAS", () => {
  it("contains exactly 27 entries", () => {
    expect(UF_VALIDAS.size).toBe(27);
  });

  it("includes all expected UFs", () => {
    const expected = [
      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
      "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
      "RS", "RO", "RR", "SC", "SP", "SE", "TO",
    ];
    for (const uf of expected) {
      expect(UF_VALIDAS.has(uf), `Expected UF_VALIDAS to contain ${uf}`).toBe(true);
    }
  });

  it("does not include invalid UF siglas", () => {
    expect(UF_VALIDAS.has("XX")).toBe(false);
    expect(UF_VALIDAS.has("BR")).toBe(false);
    expect(UF_VALIDAS.has("")).toBe(false);
    expect(UF_VALIDAS.has("sp")).toBe(false); // lowercase
  });
});
