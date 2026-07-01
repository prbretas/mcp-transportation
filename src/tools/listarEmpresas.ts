import { z } from "zod";
import { Empresa } from "../types.js";

/**
 * Zod input schema for the `listar_empresas_cadastradas` tool.
 * No parameters are required — the tool takes an empty object.
 */
export const listarEmpresasSchema = z.object({});

/**
 * Success response type for `listarEmpresas`.
 */
interface ListarEmpresasSuccess {
  empresas: Empresa[];
  totalEmpresas: number;
}

/**
 * Error response type following the MCP `isError` convention.
 */
interface ListarEmpresasError {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
}

type ListarEmpresasResult = ListarEmpresasSuccess | ListarEmpresasError;

/**
 * Handler for the `listar_empresas_cadastradas` tool.
 *
 * Returns the full list of companies loaded from the Banco_Simulado,
 * along with a `totalEmpresas` count.
 *
 * Requirements 4.1, 4.3, 4.4, 4.5, 4.6:
 * - Returns `{ empresas, totalEmpresas }` for any valid array, including empty.
 * - Returns `{ isError: true, content }` if `empresas` is null or undefined
 *   (runtime unavailability of the data source).
 *
 * @param empresas - The in-memory company array loaded at startup,
 *                   or null/undefined if the data source is unavailable.
 * @returns Either the company listing with count, or an error response.
 */
export function listarEmpresas(
  empresas: Empresa[] | null | undefined
): ListarEmpresasResult {
  if (empresas == null) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "Banco de dados de empresas indisponível",
        },
      ],
    };
  }

  return {
    empresas,
    totalEmpresas: empresas.length,
  };
}
