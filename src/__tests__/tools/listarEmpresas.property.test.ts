/**
 * Property-based tests for listarEmpresas
 *
 * Feature: mcp-frete-tributario
 * Validates: Requirements 4.1, 4.3, 4.6
 */

import { describe, it } from "vitest";
import fc from "fast-check";
import { listarEmpresas } from "../../tools/listarEmpresas.js";
import { UF_VALIDAS } from "../../utils.js";

const UF_VALIDAS_ARRAY = Array.from(UF_VALIDAS);

describe("listarEmpresas — property-based tests", () => {
  /**
   * **Validates: Requirements 4.1, 4.3, 4.6**
   *
   * Feature: mcp-frete-tributario, Property 7: Invariante da listagem de empresas
   *
   * For any array of empresa records (including empty), listarEmpresas must:
   * - Return no error
   * - Return the exact same array (same elements, same order)
   * - Return totalEmpresas equal to the array length
   */
  it("Property 7: Invariante da listagem de empresas", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            razaoSocial: fc.string({ minLength: 1 }),
            cnpj: fc.stringMatching(/^\d{14}$/),
            uf: fc.constantFrom(...UF_VALIDAS_ARRAY),
            valorUltimoFrete: fc.float({ min: 0, noNaN: true }),
          })
        ),
        (empresas) => {
          const result = listarEmpresas(empresas);

          // Must not have isError
          if ("isError" in result) {
            return false;
          }

          // result.empresas must deeply equal input array (same elements, same order)
          if (result.empresas.length !== empresas.length) {
            return false;
          }
          for (let i = 0; i < empresas.length; i++) {
            const a = result.empresas[i];
            const b = empresas[i];
            if (
              a.razaoSocial !== b.razaoSocial ||
              a.cnpj !== b.cnpj ||
              a.uf !== b.uf ||
              a.valorUltimoFrete !== b.valorUltimoFrete
            ) {
              return false;
            }
          }

          // totalEmpresas must equal input length
          return result.totalEmpresas === empresas.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});
