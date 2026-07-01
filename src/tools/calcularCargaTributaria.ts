/**
 * Tool: calcular_carga_tributaria_frete
 * Calculates the tax burden for a freight operation under the Brazilian Tax Reform transition.
 */

import { z } from "zod";
import { UF_VALIDAS, halfUp } from "../utils.js";
import type { CronogramaEntry, CargaTributaria } from "../types.js";

// ---------------------------------------------------------------------------
// Input schema (exported for use in src/index.ts)
// ---------------------------------------------------------------------------

export const calcularCargaTributariaSchema = z.object({
  // Accept number or numeric string for valorFrete (LLMs often pass strings)
  valorFrete: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)])
    .pipe(z.number().positive()),
  ufOrigem: z.string().length(2),
  ufDestino: z.string().length(2),
  // Accept number or numeric string for ano
  ano: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
    .pipe(z.number().int().min(2026).max(2033)),
  ncm: z.string().optional(),
});

export type CalcularCargaTributariaParams = z.infer<typeof calcularCargaTributariaSchema>;

// ---------------------------------------------------------------------------
// Error response helper
// ---------------------------------------------------------------------------

function errorResponse(text: string) {
  return { isError: true as const, content: [{ type: "text" as const, text }] };
}

// ---------------------------------------------------------------------------
// Pure handler
// ---------------------------------------------------------------------------

/**
 * Calculates the full tax burden (CargaTributaria) for a freight operation.
 *
 * @param params       - Validated input parameters (valorFrete, ufOrigem, ufDestino, ano, ncm?)
 * @param cronogramaMap - Pre-built Map<ano, CronogramaEntry> loaded at server startup
 * @returns CargaTributaria on success, or an MCP isError response on validation failure
 */
export function calcularCargaTributaria(
  params: CalcularCargaTributariaParams,
  cronogramaMap: Map<number, CronogramaEntry>
): CargaTributaria | ReturnType<typeof errorResponse> {
  const { valorFrete, ufOrigem, ufDestino, ano, ncm } = params;

  // Validation: valorFrete must be positive (belt-and-suspenders; zod schema also enforces this)
  if (valorFrete <= 0) {
    return errorResponse("valorFrete deve ser um número positivo");
  }

  // Validation: ano must be within transition range
  if (ano < 2026 || ano > 2033) {
    return errorResponse("ano deve estar entre 2026 e 2033");
  }

  // Validation: ufOrigem
  if (!UF_VALIDAS.has(ufOrigem.toUpperCase())) {
    return errorResponse(`UF inválida: ${ufOrigem}`);
  }

  // Validation: ufDestino
  if (!UF_VALIDAS.has(ufDestino.toUpperCase())) {
    return errorResponse(`UF inválida: ${ufDestino}`);
  }

  // Look up cronograma entry
  const entry = cronogramaMap.get(ano);
  if (!entry) {
    return errorResponse("ano deve estar entre 2026 e 2033");
  }

  // NCM differentiated rate lookup.
  // Currently there is no differentiated-rate table; if ncm is provided and
  // no specific rates are found, fall back to the default cronograma rates.
  // Future implementations can replace this block with a real NCM lookup.
  const rates = resolveRates(entry, ncm);

  // Compute new-regime values
  const valorIBS = halfUp((valorFrete * rates.ibs) / 100);
  const valorCBS = halfUp((valorFrete * rates.cbs) / 100);
  const totalNovoRegime = halfUp(valorIBS + valorCBS);

  // Compute old-regime values (ISS excluded per requirement 1.2 — not applicable to interstate freight)
  const valorICMS = halfUp((valorFrete * rates.icms) / 100);
  const valorPIS = halfUp((valorFrete * rates.pis) / 100);
  const valorCOFINS = halfUp((valorFrete * rates.cofins) / 100);
  const totalAntigoRegime = halfUp(valorICMS + valorPIS + valorCOFINS);

  // aliquotaNominal = IBS% + CBS% for the year
  const aliquotaNominal = rates.ibs + rates.cbs;

  const result: CargaTributaria = {
    aliquotaNominal,
    valorIBS,
    valorCBS,
    totalNovoRegime,
    valorICMS,
    valorPIS,
    valorCOFINS,
    totalAntigoRegime,
  };

  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the effective tax rates for a given NCM code.
 * Falls back to the default CronogramaEntry rates when no differentiated
 * rate exists for the NCM (requirement 1.3).
 */
function resolveRates(
  entry: CronogramaEntry,
  ncm: string | undefined
): Pick<CronogramaEntry, "ibs" | "cbs" | "icms" | "pis" | "cofins"> {
  // NCM differentiated-rate table (empty for now — extend here in the future).
  // If ncm is undefined or not found in the table, the default entry rates apply.
  const ncmRates: Record<string, Pick<CronogramaEntry, "ibs" | "cbs" | "icms" | "pis" | "cofins">> = {};

  if (ncm !== undefined && Object.prototype.hasOwnProperty.call(ncmRates, ncm)) {
    return ncmRates[ncm];
  }

  return {
    ibs: entry.ibs,
    cbs: entry.cbs,
    icms: entry.icms,
    pis: entry.pis,
    cofins: entry.cofins,
  };
}
