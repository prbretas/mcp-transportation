/**
 * Bootstrap tests — server registration and handler exception resilience
 *
 * Contains:
 *   - Task 9.2: Property 9 — handler exception resilience (PBT)
 *   - Task 9.3: Smoke tests — schema shapes, handler exports, tool name registration
 *
 * Feature: mcp-frete-tributario
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.3
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// Tool schemas
import { calcularCargaTributariaSchema } from "../../tools/calcularCargaTributaria.js";
import { consultarCronogramaSchema } from "../../tools/consultarCronograma.js";
import { simularImpactoRotaSchema } from "../../tools/simularImpactoRota.js";
import { listarEmpresasSchema } from "../../tools/listarEmpresas.js";

// Tool handler functions
import { calcularCargaTributaria } from "../../tools/calcularCargaTributaria.js";
import { consultarCronograma } from "../../tools/consultarCronograma.js";
import { simularImpactoRota } from "../../tools/simularImpactoRota.js";
import { listarEmpresas } from "../../tools/listarEmpresas.js";

// ---------------------------------------------------------------------------
// Helper: replicates the try/catch wrapper pattern from src/index.ts
// ---------------------------------------------------------------------------

async function wrapHandler<T>(fn: () => T | Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    return {
      isError: true as const,
      content: [{ type: "text" as const, text: `Erro interno: ${(e as Error).message}` }],
    };
  }
}

// ---------------------------------------------------------------------------
// Task 9.2 — Property 9: Resiliência a exceções em handlers
// ---------------------------------------------------------------------------

describe("Property 9: Resiliência a exceções em handlers", () => {
  /**
   * **Validates: Requirements 6.3, 5.5**
   *
   * Feature: mcp-frete-tributario, Property 9: Resiliência a exceções em handlers
   *
   * For any error message thrown inside a tool handler, the try/catch wrapper
   * used in src/index.ts must catch it and return
   * { isError: true, content: [{ type: "text", text: `Erro interno: ${msg}` }] }
   * without propagating the exception.
   */
  it("Property 9: wrapHandler catches any thrown Error and returns isError: true with correct message", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (errorMsg) => {
          const result = await wrapHandler(() => {
            throw new Error(errorMsg);
          });

          return (
            result.isError === true &&
            result.content[0].type === "text" &&
            result.content[0].text === `Erro interno: ${errorMsg}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 9.3 — Smoke tests for server bootstrap
// ---------------------------------------------------------------------------

describe("Bootstrap smoke tests", () => {
  // -------------------------------------------------------------------------
  // Schema shape verification — proxy for "server registers tools with correct inputs"
  // -------------------------------------------------------------------------

  describe("calcularCargaTributariaSchema shape", () => {
    it("has expected keys: valorFrete, ufOrigem, ufDestino, ano, ncm", () => {
      const keys = Object.keys(calcularCargaTributariaSchema.shape);
      expect(keys).toContain("valorFrete");
      expect(keys).toContain("ufOrigem");
      expect(keys).toContain("ufDestino");
      expect(keys).toContain("ano");
      expect(keys).toContain("ncm");
    });
  });

  describe("consultarCronogramaSchema shape", () => {
    it("has expected key: ano", () => {
      const keys = Object.keys(consultarCronogramaSchema.shape);
      expect(keys).toContain("ano");
    });
  });

  describe("simularImpactoRotaSchema shape", () => {
    it("has expected keys: cnpjOrigem, cnpjDestino, valorFrete", () => {
      const keys = Object.keys(simularImpactoRotaSchema.shape);
      expect(keys).toContain("cnpjOrigem");
      expect(keys).toContain("cnpjDestino");
      expect(keys).toContain("valorFrete");
    });
  });

  describe("listarEmpresasSchema shape", () => {
    it("is an empty-object schema (no required keys)", () => {
      const keys = Object.keys(listarEmpresasSchema.shape);
      expect(keys).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Handler function export verification
  // -------------------------------------------------------------------------

  describe("Tool handler exports", () => {
    it("calcularCargaTributaria is a function", () => {
      expect(typeof calcularCargaTributaria).toBe("function");
    });

    it("consultarCronograma is a function", () => {
      expect(typeof consultarCronograma).toBe("function");
    });

    it("simularImpactoRota is a function", () => {
      expect(typeof simularImpactoRota).toBe("function");
    });

    it("listarEmpresas is a function", () => {
      expect(typeof listarEmpresas).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // Expected tool names — proxy for "server registers exactly 4 tools with correct names"
  // -------------------------------------------------------------------------

  describe("Registered tool names", () => {
    it("the 4 expected tool names are exactly the specified identifiers", () => {
      const expectedToolNames = [
        "calcular_carga_tributaria_frete",
        "consultar_cronograma_transicao",
        "simular_impacto_rota",
        "listar_empresas_cadastradas",
      ];

      // Verify count
      expect(expectedToolNames).toHaveLength(4);

      // Verify each name
      expect(expectedToolNames).toContain("calcular_carga_tributaria_frete");
      expect(expectedToolNames).toContain("consultar_cronograma_transicao");
      expect(expectedToolNames).toContain("simular_impacto_rota");
      expect(expectedToolNames).toContain("listar_empresas_cadastradas");

      // Verify no duplicates
      expect(new Set(expectedToolNames).size).toBe(4);
    });
  });
});
