/**
 * Tool: simular_impacto_rota
 * Resolves UFs from CNPJs via BrasilAPI and calculates the freight tax burden
 * for the current calendar year under the Brazilian Tax Reform transition.
 */

import { z } from "zod";
import { BrasilApiError, BrasilApiCnpjResponse } from "../types.js";
import type { CronogramaEntry } from "../types.js";
import { calcularCargaTributaria } from "./calcularCargaTributaria.js";

// ---------------------------------------------------------------------------
// Input schema (exported for use in src/index.ts)
// ---------------------------------------------------------------------------

export const simularImpactoRotaSchema = z.object({
  cnpjOrigem: z.string(),
  cnpjDestino: z.string(),
  // Accept number or numeric string for valorFrete
  valorFrete: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)])
    .pipe(z.number().positive()),
});

export type SimularImpactoRotaParams = z.infer<typeof simularImpactoRotaSchema>;

// ---------------------------------------------------------------------------
// Error response helper
// ---------------------------------------------------------------------------

function errorResponse(text: string) {
  return { isError: true as const, content: [{ type: "text" as const, text }] };
}

// ---------------------------------------------------------------------------
// CNPJ validation helper
// ---------------------------------------------------------------------------

/**
 * Strips all non-numeric characters from a CNPJ string.
 */
function stripNonNumeric(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

// ---------------------------------------------------------------------------
// Pure handler
// ---------------------------------------------------------------------------

/**
 * Simulates the freight tax impact for a given route identified by CNPJs.
 *
 * @param params        - Validated input parameters (cnpjOrigem, cnpjDestino, valorFrete)
 * @param cronogramaMap - Pre-built Map<ano, CronogramaEntry> loaded at server startup
 * @param fetchCnpjFn   - Injected fetch function for testability (defaults to BrasilAPI)
 * @returns Full response with UFs, razões sociais, anoCorrente, and CargaTributaria fields,
 *          or an MCP isError response on any validation or external failure.
 */
export async function simularImpactoRota(
  params: SimularImpactoRotaParams,
  cronogramaMap: Map<number, CronogramaEntry>,
  fetchCnpjFn: (cnpj: string) => Promise<BrasilApiCnpjResponse>
) {
  const { cnpjOrigem, cnpjDestino, valorFrete } = params;

  // 1. Validate valorFrete > 0
  if (valorFrete <= 0) {
    return errorResponse("valorFrete deve ser um número positivo");
  }

  // 2. Strip non-numeric chars and validate exactly 14 digits for each CNPJ
  const cnpjOrigemStripped = stripNonNumeric(cnpjOrigem);
  if (cnpjOrigemStripped.length !== 14) {
    return errorResponse(`CNPJ inválido: ${cnpjOrigem}`);
  }

  const cnpjDestinoStripped = stripNonNumeric(cnpjDestino);
  if (cnpjDestinoStripped.length !== 14) {
    return errorResponse(`CNPJ inválido: ${cnpjDestino}`);
  }

  // 3. Call BrasilAPI concurrently for both CNPJs
  let origemData: BrasilApiCnpjResponse;
  let destinoData: BrasilApiCnpjResponse;

  try {
    [origemData, destinoData] = await Promise.all([
      fetchCnpjFn(cnpjOrigemStripped),
      fetchCnpjFn(cnpjDestinoStripped),
    ]);
  } catch (error) {
    // 4. Catch BrasilApiError and return formatted error
    if (error instanceof BrasilApiError) {
      return errorResponse(
        `Não foi possível consultar o CNPJ ${error.cnpj}: ${error.motivo}`
      );
    }
    throw error;
  }

  // 5. Determine current year and validate it's in [2026, 2033]
  const anoCorrente = new Date().getFullYear();
  if (anoCorrente < 2026 || anoCorrente > 2033) {
    return errorResponse(
      "Simulação indisponível: ano corrente fora do período de transição (2026–2033)"
    );
  }

  const ufOrigem = origemData.uf;
  const ufDestino = destinoData.uf;
  const razaoSocialOrigem = origemData.razao_social;
  const razaoSocialDestino = destinoData.razao_social;

  // 6. Delegate tax calculation to calcularCargaTributaria
  const cargaResult = calcularCargaTributaria(
    { valorFrete, ufOrigem, ufDestino, ano: anoCorrente },
    cronogramaMap
  );

  // Propagate any error from calcularCargaTributaria (e.g., invalid UF from BrasilAPI)
  if ("isError" in cargaResult) {
    return cargaResult;
  }

  // 7. Return full response with all fields
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          ufOrigem,
          ufDestino,
          razaoSocialOrigem,
          razaoSocialDestino,
          anoCorrente,
          ...cargaResult,
        }),
      },
    ],
  };
}
