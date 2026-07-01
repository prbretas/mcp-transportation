/**
 * Property-based tests for consultarCronograma
 *
 * Feature: mcp-frete-tributario
 * Validates: Requirements 2.3, 2.4
 */

import { describe, it } from "vitest";
import fc from "fast-check";
import { consultarCronograma } from "../../tools/consultarCronograma.js";
import { halfUp } from "../../utils.js";
import type { CronogramaEntry } from "../../types.js";
import cronogramaFixture from "../fixtures/cronograma-test.json" assert { type: "json" };

// Build the cronogramaMap from fixture data
const cronogramaMap = new Map<number, CronogramaEntry>(
  (cronogramaFixture as CronogramaEntry[]).map((entry) => [entry.ano, entry])
);

describe("consultarCronograma — property-based tests", () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * Feature: mcp-frete-tributario, Property 10: Totais do cronograma
   *
   * For any valid ano in [2026, 2033], the computed totalNovoRegime and
   * totalAntigoRegime must match the halfUp arithmetic of the fixture entries.
   */
  it("Property 10: Totais do cronograma", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2026, max: 2033 }),
        (ano) => {
          const result = consultarCronograma({ ano }, cronogramaMap);

          // Result must not be an error
          if ("isError" in result) {
            throw new Error(`Unexpected error for ano=${ano}: ${result.content[0].text}`);
          }

          const entry = cronogramaMap.get(ano)!;

          return (
            result.totalNovoRegime === halfUp(entry.ibs + entry.cbs) &&
            result.totalAntigoRegime === halfUp(entry.icms + entry.iss + entry.pis + entry.cofins)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * Feature: mcp-frete-tributario, Property 4: Rejeição de ano fora do intervalo (consultar_cronograma_transicao)
   *
   * For any integer outside [2026, 2033] (bypassing zod), the handler must return
   * isError: true with the exact expected message.
   */
  it("Property 4: Rejeição de ano fora do intervalo (consultar_cronograma_transicao)", () => {
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < 2026 || n > 2033),
        (ano) => {
          // Bypass zod validation — call handler directly with raw params
          const result = consultarCronograma({ ano } as any, cronogramaMap);

          return (
            "isError" in result &&
            result.isError === true &&
            result.content[0].text === "ano deve estar entre 2026 e 2033"
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
