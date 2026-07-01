/**
 * Property-based tests for calcularCargaTributaria
 *
 * Feature: mcp-frete-tributario
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7
 */

import { describe, it } from "vitest";
import fc from "fast-check";
import { calcularCargaTributaria } from "../../tools/calcularCargaTributaria.js";
import { UF_VALIDAS, halfUp } from "../../utils.js";
import type { CronogramaEntry } from "../../types.js";
import cronogramaFixture from "../fixtures/cronograma-test.json" assert { type: "json" };

// Build the cronogramaMap from fixture data
const cronogramaMap = new Map<number, CronogramaEntry>(
  (cronogramaFixture as CronogramaEntry[]).map((entry) => [entry.ano, entry])
);

const UF_VALIDAS_ARRAY = Array.from(UF_VALIDAS);

describe("calcularCargaTributaria — property-based tests", () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.7**
   *
   * Feature: mcp-frete-tributario, Property 1: Consistência aritmética da carga tributária
   *
   * For any positive valorFrete, valid UFs and valid ano, all computed monetary
   * values must satisfy the half-up arithmetic relationships defined in the spec.
   */
  it("Property 1: Consistência aritmética da carga tributária", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }),
        fc.constantFrom(...UF_VALIDAS_ARRAY),
        fc.constantFrom(...UF_VALIDAS_ARRAY),
        fc.integer({ min: 2026, max: 2033 }),
        (valorFrete, ufOrigem, ufDestino, ano) => {
          const result = calcularCargaTributaria(
            { valorFrete, ufOrigem, ufDestino, ano },
            cronogramaMap
          );

          // Result must not be an error
          if ("isError" in result) {
            throw new Error(`Unexpected error: ${result.content[0].text}`);
          }

          const entry = cronogramaMap.get(ano)!;
          const { ibs, cbs, icms, pis, cofins } = entry;

          // New regime
          const expectedValorIBS = halfUp((valorFrete * ibs) / 100);
          const expectedValorCBS = halfUp((valorFrete * cbs) / 100);
          const expectedTotalNovoRegime = halfUp(expectedValorIBS + expectedValorCBS);

          // Old regime
          const expectedValorICMS = halfUp((valorFrete * icms) / 100);
          const expectedValorPIS = halfUp((valorFrete * pis) / 100);
          const expectedValorCOFINS = halfUp((valorFrete * cofins) / 100);
          const expectedTotalAntigoRegime = halfUp(
            expectedValorICMS + expectedValorPIS + expectedValorCOFINS
          );

          // Nominal rate
          const expectedAliquotaNominal = ibs + cbs;

          return (
            result.valorIBS === expectedValorIBS &&
            result.valorCBS === expectedValorCBS &&
            result.totalNovoRegime === expectedTotalNovoRegime &&
            result.aliquotaNominal === expectedAliquotaNominal &&
            result.valorICMS === expectedValorICMS &&
            result.valorPIS === expectedValorPIS &&
            result.valorCOFINS === expectedValorCOFINS &&
            result.totalAntigoRegime === expectedTotalAntigoRegime
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirement 1.3**
   *
   * Feature: mcp-frete-tributario, Property 2: NCM desconhecido não altera resultado
   *
   * For any valid inputs plus an arbitrary NCM string not in the differentiated-rate
   * table, the result must be identical to calling without ncm.
   */
  it("Property 2: NCM desconhecido não altera resultado", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }),
        fc.constantFrom(...UF_VALIDAS_ARRAY),
        fc.constantFrom(...UF_VALIDAS_ARRAY),
        fc.integer({ min: 2026, max: 2033 }),
        fc.string(),
        (valorFrete, ufOrigem, ufDestino, ano, ncm) => {
          const resultWithNcm = calcularCargaTributaria(
            { valorFrete, ufOrigem, ufDestino, ano, ncm },
            cronogramaMap
          );
          const resultWithoutNcm = calcularCargaTributaria(
            { valorFrete, ufOrigem, ufDestino, ano },
            cronogramaMap
          );

          // Both must be non-error results
          if ("isError" in resultWithNcm || "isError" in resultWithoutNcm) {
            throw new Error("Unexpected error response");
          }

          return (
            resultWithNcm.aliquotaNominal === resultWithoutNcm.aliquotaNominal &&
            resultWithNcm.valorIBS === resultWithoutNcm.valorIBS &&
            resultWithNcm.valorCBS === resultWithoutNcm.valorCBS &&
            resultWithNcm.totalNovoRegime === resultWithoutNcm.totalNovoRegime &&
            resultWithNcm.valorICMS === resultWithoutNcm.valorICMS &&
            resultWithNcm.valorPIS === resultWithoutNcm.valorPIS &&
            resultWithNcm.valorCOFINS === resultWithoutNcm.valorCOFINS &&
            resultWithNcm.totalAntigoRegime === resultWithoutNcm.totalAntigoRegime
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirement 1.4**
   *
   * Feature: mcp-frete-tributario, Property 3: Rejeição de valorFrete inválido
   *
   * For any valorFrete <= 0 (bypassing zod), the handler must return
   * isError: true with the exact expected message.
   */
  it("Property 3: Rejeição de valorFrete inválido", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.float({ max: -Number.EPSILON, noNaN: true })
        ),
        (valorFrete) => {
          // Bypass zod validation — call handler directly with raw params
          const result = calcularCargaTributaria(
            { valorFrete, ufOrigem: "SP", ufDestino: "RJ", ano: 2026 } as any,
            cronogramaMap
          );

          return (
            "isError" in result &&
            result.isError === true &&
            result.content[0].text === "valorFrete deve ser um número positivo"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirement 1.5**
   *
   * Feature: mcp-frete-tributario, Property 4: Rejeição de ano fora do intervalo
   *
   * For any integer outside [2026, 2033] (bypassing zod), the handler must return
   * isError: true with the exact expected message.
   */
  it("Property 4: Rejeição de ano fora do intervalo", () => {
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < 2026 || n > 2033),
        (ano) => {
          // Bypass zod validation — call handler directly with raw params
          const result = calcularCargaTributaria(
            { valorFrete: 1000, ufOrigem: "SP", ufDestino: "RJ", ano } as any,
            cronogramaMap
          );

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
