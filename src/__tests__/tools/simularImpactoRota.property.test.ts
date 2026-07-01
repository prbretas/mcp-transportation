/**
 * Property-based tests for simularImpactoRota
 *
 * Feature: mcp-frete-tributario
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { describe, it, vi, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { simularImpactoRota } from "../../tools/simularImpactoRota.js";
import { BrasilApiError } from "../../types.js";
import { UF_VALIDAS } from "../../utils.js";
import type { CronogramaEntry } from "../../types.js";
import cronogramaFixture from "../fixtures/cronograma-test.json" assert { type: "json" };

// Build the cronogramaMap from fixture data
const cronogramaMap = new Map<number, CronogramaEntry>(
  (cronogramaFixture as CronogramaEntry[]).map((entry) => [entry.ano, entry])
);

const UF_VALIDAS_ARRAY = Array.from(UF_VALIDAS);

// ---------------------------------------------------------------------------
// Property 5 — CNPJ resolution and UF mapping (requires year in [2026,2033])
// ---------------------------------------------------------------------------

describe("simularImpactoRota — Property 5: Resolução de CNPJ e mapeamento de UF", () => {
  /**
   * **Validates: Requirements 3.2, 3.3**
   *
   * Feature: mcp-frete-tributario, Property 5: Resolução de CNPJ e mapeamento de UF
   *
   * For any pair of valid CNPJs (14 digits), valid UFs returned from the mocked
   * BrasilAPI, and a positive valorFrete, the handler must propagate the UF and
   * razão social exactly as returned by the fetch function.
   */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Property 5: Resolução de CNPJ e mapeamento de UF", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...UF_VALIDAS_ARRAY),
        fc.constantFrom(...UF_VALIDAS_ARRAY),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.stringMatching(/^\d{14}$/),
        fc.stringMatching(/^\d{14}$/),
        fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }),
        async (
          ufOrigemMocked,
          ufDestinoMocked,
          razaoSocialOrigemMocked,
          razaoSocialDestinoMocked,
          cnpjOrigem,
          cnpjDestino,
          valorFrete
        ) => {
          // Mock fetchCnpjFn — returns different data for each CNPJ
          const mockFetchCnpj = vi.fn().mockImplementation((cnpj: string) => {
            if (cnpj === cnpjOrigem) {
              return Promise.resolve({
                uf: ufOrigemMocked,
                razao_social: razaoSocialOrigemMocked,
              });
            }
            return Promise.resolve({
              uf: ufDestinoMocked,
              razao_social: razaoSocialDestinoMocked,
            });
          });

          const result = await simularImpactoRota(
            { cnpjOrigem, cnpjDestino, valorFrete },
            cronogramaMap,
            mockFetchCnpj
          );

          // Must not be an error
          if (result.isError) {
            return false;
          }

          const parsed = JSON.parse(result.content[0].text);

          return (
            parsed.ufOrigem === ufOrigemMocked &&
            parsed.ufDestino === ufDestinoMocked &&
            parsed.razaoSocialOrigem === razaoSocialOrigemMocked &&
            parsed.razaoSocialDestino === razaoSocialDestinoMocked
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6 — Rejects invalid CNPJ format (no year mock needed)
// ---------------------------------------------------------------------------

describe("simularImpactoRota — Property 6: Rejeição de CNPJ com formato inválido", () => {
  /**
   * **Validates: Requirement 3.5**
   *
   * Feature: mcp-frete-tributario, Property 6: Rejeição de CNPJ com formato inválido
   *
   * For any string whose numeric-only characters do not number exactly 14 digits,
   * the handler must return isError: true with a message starting with "CNPJ inválido:"
   * without ever calling the BrasilAPI fetch function.
   */
  it("Property 6: Rejeição de CNPJ com formato inválido", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => s.replace(/\D/g, "").length !== 14),
        async (invalidCnpj) => {
          const mockFetchCnpj = vi.fn();

          // Test with invalidCnpj as origin
          const resultOrigin = await simularImpactoRota(
            { cnpjOrigem: invalidCnpj, cnpjDestino: "98765432000111", valorFrete: 1000 } as any,
            cronogramaMap,
            mockFetchCnpj
          );

          expect(mockFetchCnpj).not.toHaveBeenCalled();

          return (
            resultOrigin.isError === true &&
            resultOrigin.content[0].text.startsWith("CNPJ inválido:")
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3 — Rejects non-positive valorFrete (no year mock needed)
// ---------------------------------------------------------------------------

describe("simularImpactoRota — Property 3: Rejeição de valorFrete inválido (simular_impacto_rota)", () => {
  /**
   * **Validates: Requirement 3.6**
   *
   * Feature: mcp-frete-tributario, Property 3: Rejeição de valorFrete inválido (simular_impacto_rota)
   *
   * For any valorFrete <= 0 (bypassing zod), the handler must return isError: true
   * with the exact message "valorFrete deve ser um número positivo" without calling
   * the BrasilAPI fetch function.
   */
  it("Property 3: Rejeição de valorFrete inválido (simular_impacto_rota)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(0),
          fc.float({ max: -Number.EPSILON, noNaN: true })
        ),
        async (valorFrete) => {
          const mockFetchCnpj = vi.fn();

          const result = await simularImpactoRota(
            {
              cnpjOrigem: "12345678000195",
              cnpjDestino: "98765432000111",
              valorFrete,
            } as any,
            cronogramaMap,
            mockFetchCnpj
          );

          expect(mockFetchCnpj).not.toHaveBeenCalled();

          return (
            result.isError === true &&
            result.content[0].text === "valorFrete deve ser um número positivo"
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8 — BrasilAPI failure tolerance (requires year in [2026,2033])
// ---------------------------------------------------------------------------

describe("simularImpactoRota — Property 8: Tolerância a falhas de BrasilAPI", () => {
  /**
   * **Validates: Requirement 3.4**
   *
   * Feature: mcp-frete-tributario, Property 8: Tolerância a falhas de BrasilAPI
   *
   * For any HTTP status code in [400, 599] thrown as a BrasilApiError (for either
   * origin or destination), the handler must return isError: true with a message
   * starting with "Não foi possível consultar o CNPJ". Timeout errors must produce
   * a message ending with ": timeout".
   */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Property 8: Tolerância a falhas de BrasilAPI — HTTP errors", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          const cnpjOrigem = "12345678000195";
          const cnpjDestino = "98765432000111";

          // Mock that throws for origin CNPJ
          const mockFetchCnpjOriginFail = vi.fn().mockImplementation((cnpj: string) => {
            throw new BrasilApiError(cnpj, statusCode);
          });

          const resultOriginFail = await simularImpactoRota(
            { cnpjOrigem, cnpjDestino, valorFrete: 1000 },
            cronogramaMap,
            mockFetchCnpjOriginFail
          );

          if (
            resultOriginFail.isError !== true ||
            !resultOriginFail.content[0].text.startsWith("Não foi possível consultar o CNPJ")
          ) {
            return false;
          }

          // Mock that resolves for origin but throws for destination
          const mockFetchCnpjDestFail = vi.fn().mockImplementation((cnpj: string) => {
            if (cnpj === cnpjOrigem) {
              return Promise.resolve({ uf: "SP", razao_social: "Empresa A" });
            }
            throw new BrasilApiError(cnpj, statusCode);
          });

          const resultDestFail = await simularImpactoRota(
            { cnpjOrigem, cnpjDestino, valorFrete: 1000 },
            cronogramaMap,
            mockFetchCnpjDestFail
          );

          return (
            resultDestFail.isError === true &&
            resultDestFail.content[0].text.startsWith("Não foi possível consultar o CNPJ")
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 8: Tolerância a falhas de BrasilAPI — timeout", async () => {
    const cnpjOrigem = "12345678000195";
    const cnpjDestino = "98765432000111";

    // Timeout for origin
    const mockFetchCnpjTimeout = vi.fn().mockImplementation((cnpj: string) => {
      throw new BrasilApiError(cnpj, "timeout");
    });

    const result = await simularImpactoRota(
      { cnpjOrigem, cnpjDestino, valorFrete: 1000 },
      cronogramaMap,
      mockFetchCnpjTimeout
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/: timeout$/);
  });
});
