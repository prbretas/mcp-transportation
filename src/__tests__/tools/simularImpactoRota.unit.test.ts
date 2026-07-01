/**
 * Unit tests for simularImpactoRota
 *
 * Feature: mcp-frete-tributario
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { simularImpactoRota } from "../../tools/simularImpactoRota.js";
import { BrasilApiError } from "../../types.js";
import type { CronogramaEntry } from "../../types.js";
import cronogramaFixture from "../fixtures/cronograma-test.json" assert { type: "json" };

// Build the cronogramaMap from fixture data
const cronogramaMap = new Map<number, CronogramaEntry>(
  (cronogramaFixture as CronogramaEntry[]).map((entry) => [entry.ano, entry])
);

describe("simularImpactoRota — unit tests", () => {
  describe("Test 1: Success with two mocked CNPJs", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns all expected fields for valid origin and destination CNPJs", async () => {
      const mockFetchCnpj = vi.fn().mockImplementation((cnpj: string) => {
        if (cnpj === "12345678000195") {
          return Promise.resolve({ uf: "SP", razao_social: "Empresa A" });
        }
        return Promise.resolve({ uf: "RJ", razao_social: "Empresa B" });
      });

      const result = await simularImpactoRota(
        { cnpjOrigem: "12345678000195", cnpjDestino: "98765432000111", valorFrete: 1000 },
        cronogramaMap,
        mockFetchCnpj
      );

      // Must not be an error
      expect(result.isError).toBeUndefined();

      const parsed = JSON.parse(result.content[0].text);

      // UF and razão social
      expect(parsed.ufOrigem).toBe("SP");
      expect(parsed.ufDestino).toBe("RJ");
      expect(parsed.razaoSocialOrigem).toBe("Empresa A");
      expect(parsed.razaoSocialDestino).toBe("Empresa B");

      // Current year must be 2026 (mocked)
      expect(parsed.anoCorrente).toBe(2026);

      // All 8 CargaTributaria fields must be present and be numbers
      const cargaFields = [
        "aliquotaNominal",
        "valorIBS",
        "valorCBS",
        "totalNovoRegime",
        "valorICMS",
        "valorPIS",
        "valorCOFINS",
        "totalAntigoRegime",
      ] as const;

      for (const field of cargaFields) {
        expect(parsed[field], `field "${field}" should be a number`).toBeTypeOf("number");
      }
    });
  });

  describe("Test 2: HTTP 404 for origin CNPJ", () => {
    it("returns isError true with correct message when origin CNPJ returns 404", async () => {
      const mockFetchCnpj = vi.fn().mockImplementation((cnpj: string) => {
        if (cnpj === "12345678000195") {
          throw new BrasilApiError("12345678000195", 404);
        }
        return Promise.resolve({ uf: "RJ", razao_social: "Empresa B" });
      });

      const result = await simularImpactoRota(
        { cnpjOrigem: "12345678000195", cnpjDestino: "98765432000111", valorFrete: 1000 },
        cronogramaMap,
        mockFetchCnpj
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Não foi possível consultar o CNPJ 12345678000195: 404"
      );
    });
  });

  describe("Test 3: Simulated timeout for destination CNPJ", () => {
    it("returns isError true with correct message when destination CNPJ times out", async () => {
      const mockFetchCnpj = vi.fn().mockImplementation((cnpj: string) => {
        if (cnpj === "12345678000195") {
          return Promise.resolve({ uf: "SP", razao_social: "Empresa A" });
        }
        throw new BrasilApiError("98765432000111", "timeout");
      });

      const result = await simularImpactoRota(
        { cnpjOrigem: "12345678000195", cnpjDestino: "98765432000111", valorFrete: 1000 },
        cronogramaMap,
        mockFetchCnpj
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        "Não foi possível consultar o CNPJ 98765432000111: timeout"
      );
    });
  });
});
