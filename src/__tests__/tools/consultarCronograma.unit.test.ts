/**
 * Unit tests (example-based) for consultarCronograma
 *
 * Feature: mcp-frete-tributario
 * Validates concrete examples for all 8 transition years (2026–2033)
 * plus boundary error cases.
 */

import { describe, it, expect } from "vitest";
import { consultarCronograma } from "../../tools/consultarCronograma.js";
import { halfUp } from "../../utils.js";
import type { CronogramaEntry } from "../../types.js";
import cronogramaFixture from "../fixtures/cronograma-test.json" assert { type: "json" };

// Build the cronogramaMap from fixture data
const cronogramaMap = new Map<number, CronogramaEntry>(
  (cronogramaFixture as CronogramaEntry[]).map((entry) => [entry.ano, entry])
);

describe("consultarCronograma — unit tests", () => {
  /**
   * For each of the 8 transition years, verify all 6 percentage fields
   * plus the two computed totals match the fixture data.
   */
  describe("verifies all fields for each transition year (2026–2033)", () => {
    for (const entry of cronogramaFixture as CronogramaEntry[]) {
      it(`returns correct rates and totals for ano=${entry.ano}`, () => {
        const result = consultarCronograma({ ano: entry.ano }, cronogramaMap);

        expect("isError" in result).toBe(false);
        if ("isError" in result) return;

        expect(result.ano).toBe(entry.ano);
        expect(result.icms).toBe(entry.icms);
        expect(result.iss).toBe(entry.iss);
        expect(result.pis).toBe(entry.pis);
        expect(result.cofins).toBe(entry.cofins);
        expect(result.ibs).toBe(entry.ibs);
        expect(result.cbs).toBe(entry.cbs);
        expect(result.totalNovoRegime).toBe(halfUp(entry.ibs + entry.cbs));
        expect(result.totalAntigoRegime).toBe(
          halfUp(entry.icms + entry.iss + entry.pis + entry.cofins)
        );
      });
    }
  });

  /**
   * ano = 2025 is one below the valid range → error
   */
  it("returns error for ano = 2025 (below range)", () => {
    const result = consultarCronograma({ ano: 2025 } as any, cronogramaMap);

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("ano deve estar entre 2026 e 2033");
  });

  /**
   * ano = 2034 is one above the valid range → error
   */
  it("returns error for ano = 2034 (above range)", () => {
    const result = consultarCronograma({ ano: 2034 } as any, cronogramaMap);

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("ano deve estar entre 2026 e 2033");
  });
});
