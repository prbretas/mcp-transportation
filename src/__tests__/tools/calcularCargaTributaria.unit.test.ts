/**
 * Unit tests (example-based) for calcularCargaTributaria
 *
 * Feature: mcp-frete-tributario
 * Validates concrete examples against known expected values.
 */

import { describe, it, expect } from "vitest";
import { calcularCargaTributaria } from "../../tools/calcularCargaTributaria.js";
import type { CronogramaEntry } from "../../types.js";
import cronogramaFixture from "../fixtures/cronograma-test.json" assert { type: "json" };

// Build the cronogramaMap from fixture data
const cronogramaMap = new Map<number, CronogramaEntry>(
  (cronogramaFixture as CronogramaEntry[]).map((entry) => [entry.ano, entry])
);

describe("calcularCargaTributaria — unit tests", () => {
  /**
   * Concrete example 2026:
   * valorFrete=1000.00, ufOrigem="SP", ufDestino="RJ", ano=2026
   * cronograma 2026: icms=12, iss=2, pis=0.65, cofins=3, ibs=0.10, cbs=0.10
   */
  it("computes correct values for 2026 with SP→RJ and valorFrete=1000", () => {
    const result = calcularCargaTributaria(
      { valorFrete: 1000.0, ufOrigem: "SP", ufDestino: "RJ", ano: 2026 },
      cronogramaMap
    );

    expect("isError" in result).toBe(false);
    if ("isError" in result) return;

    expect(result.aliquotaNominal).toBe(0.20);   // ibs + cbs = 0.10 + 0.10
    expect(result.valorIBS).toBe(1.00);           // 1000 × 0.10 / 100
    expect(result.valorCBS).toBe(1.00);           // 1000 × 0.10 / 100
    expect(result.totalNovoRegime).toBe(2.00);    // 1.00 + 1.00
    expect(result.valorICMS).toBe(120.00);        // 1000 × 12 / 100
    expect(result.valorPIS).toBe(6.50);           // 1000 × 0.65 / 100
    expect(result.valorCOFINS).toBe(30.00);       // 1000 × 3 / 100
    expect(result.totalAntigoRegime).toBe(156.50); // 120.00 + 6.50 + 30.00
  });

  /**
   * NCM not in table falls back to default rates.
   * Same inputs as above but with ncm: "12345678" — result must be identical.
   */
  it("NCM not in table falls back to default — result equals no-NCM result", () => {
    const withNcm = calcularCargaTributaria(
      { valorFrete: 1000.0, ufOrigem: "SP", ufDestino: "RJ", ano: 2026, ncm: "12345678" },
      cronogramaMap
    );
    const withoutNcm = calcularCargaTributaria(
      { valorFrete: 1000.0, ufOrigem: "SP", ufDestino: "RJ", ano: 2026 },
      cronogramaMap
    );

    expect("isError" in withNcm).toBe(false);
    expect("isError" in withoutNcm).toBe(false);
    if ("isError" in withNcm || "isError" in withoutNcm) return;

    expect(withNcm.aliquotaNominal).toBe(withoutNcm.aliquotaNominal);
    expect(withNcm.valorIBS).toBe(withoutNcm.valorIBS);
    expect(withNcm.valorCBS).toBe(withoutNcm.valorCBS);
    expect(withNcm.totalNovoRegime).toBe(withoutNcm.totalNovoRegime);
    expect(withNcm.valorICMS).toBe(withoutNcm.valorICMS);
    expect(withNcm.valorPIS).toBe(withoutNcm.valorPIS);
    expect(withNcm.valorCOFINS).toBe(withoutNcm.valorCOFINS);
    expect(withNcm.totalAntigoRegime).toBe(withoutNcm.totalAntigoRegime);
  });

  /**
   * Invalid ufOrigem "XX" → isError: true with message "UF inválida: XX"
   */
  it("returns error for invalid ufOrigem XX", () => {
    const result = calcularCargaTributaria(
      { valorFrete: 1000.0, ufOrigem: "XX", ufDestino: "RJ", ano: 2026 },
      cronogramaMap
    );

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("UF inválida: XX");
  });

  /**
   * Invalid ufDestino "ZZ" with valid ufOrigem → isError: true with message "UF inválida: ZZ"
   */
  it("returns error for invalid ufDestino ZZ", () => {
    const result = calcularCargaTributaria(
      { valorFrete: 1000.0, ufOrigem: "SP", ufDestino: "ZZ", ano: 2026 },
      cronogramaMap
    );

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("UF inválida: ZZ");
  });
});
