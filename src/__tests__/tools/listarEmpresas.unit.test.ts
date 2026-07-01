/**
 * Unit tests (example-based) for listarEmpresas
 *
 * Feature: mcp-frete-tributario
 * Validates concrete examples for Requirements 4.1, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect } from "vitest";
import { listarEmpresas } from "../../tools/listarEmpresas.js";
import empresasFixture from "../fixtures/empresas-test.json" assert { type: "json" };
import empresasEmpty from "../fixtures/empresas-empty.json" assert { type: "json" };

describe("listarEmpresas — unit tests", () => {
  /**
   * Returns all 7 companies from the empresas-test.json fixture.
   * totalEmpresas must equal 7 and empresas must deeply match the fixture.
   */
  it("returns all 7 companies from empresas-test.json fixture", () => {
    const result = listarEmpresas(empresasFixture as any);

    expect("isError" in result).toBe(false);
    if ("isError" in result) return;

    expect(result.totalEmpresas).toBe(7);
    expect(result.empresas).toEqual(empresasFixture);
  });

  /**
   * Returns { empresas: [], totalEmpresas: 0 } for the empty array fixture.
   * Must not return an error.
   */
  it("returns { empresas: [], totalEmpresas: 0 } for empresas-empty.json fixture", () => {
    const result = listarEmpresas(empresasEmpty as any);

    expect("isError" in result).toBe(false);
    if ("isError" in result) return;

    expect(result.empresas).toEqual([]);
    expect(result.totalEmpresas).toBe(0);
  });

  /**
   * Returns isError: true with message "Banco de dados de empresas indisponível"
   * when called with null.
   */
  it("returns isError with 'Banco de dados de empresas indisponível' when called with null", () => {
    const result = listarEmpresas(null);

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Banco de dados de empresas indisponível");
  });

  /**
   * Returns isError: true with the same error message when called with undefined.
   */
  it("returns isError with 'Banco de dados de empresas indisponível' when called with undefined", () => {
    const result = listarEmpresas(undefined);

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Banco de dados de empresas indisponível");
  });
});
