/**
 * Tool: consultar_cronograma_transicao
 *
 * Returns the tax rates for a given year (2026–2033) from the
 * Cronograma_Transicao, plus computed totals for new and old regimes.
 *
 * Implements Requirements: 2.1, 2.3, 2.4, 2.5
 */

import { z } from "zod";
import { CronogramaEntry } from "../types.js";
import { halfUp } from "../utils.js";

/**
 * Zod input schema for consultar_cronograma_transicao.
 * Validates that `ano` is an integer in the range [2026, 2033].
 */
export const consultarCronogramaSchema = z.object({
  // Accept number or numeric string (LLMs often pass strings)
  ano: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
    .pipe(z.number().int().min(2026).max(2033)),
});

export type ConsultarCronogramaParams = z.infer<typeof consultarCronogramaSchema>;

/**
 * Success response shape for consultar_cronograma_transicao.
 */
export interface ConsultarCronogramaResult {
  ano: number;
  icms: number;
  iss: number;
  pis: number;
  cofins: number;
  ibs: number;
  cbs: number;
  /** ibs + cbs, rounded half-up to 2 decimal places */
  totalNovoRegime: number;
  /** icms + iss + pis + cofins, rounded half-up to 2 decimal places */
  totalAntigoRegime: number;
}

/**
 * MCP error response shape.
 */
export interface McpErrorResponse {
  isError: true;
  content: [{ type: "text"; text: string }];
}

/**
 * Pure handler for the `consultar_cronograma_transicao` tool.
 *
 * @param params         - Validated input ({ ano })
 * @param cronogramaMap  - Pre-loaded Map<number, CronogramaEntry> (O(1) lookup by year)
 * @returns The tax rates for the requested year plus computed totals,
 *          or an MCP error response if `ano` is not found in the map.
 */
export function consultarCronograma(
  params: ConsultarCronogramaParams,
  cronogramaMap: Map<number, CronogramaEntry>
): ConsultarCronogramaResult | McpErrorResponse {
  const { ano } = params;

  const entry = cronogramaMap.get(ano);

  // Defensive guard: the zod schema already rejects anos outside [2026, 2033],
  // but if the map doesn't contain the entry (e.g. data inconsistency), return
  // the same user-facing error rather than throwing.
  if (!entry) {
    return {
      isError: true,
      content: [{ type: "text", text: "ano deve estar entre 2026 e 2033" }],
    };
  }

  const totalNovoRegime = halfUp(entry.ibs + entry.cbs);
  const totalAntigoRegime = halfUp(entry.icms + entry.iss + entry.pis + entry.cofins);

  return {
    ano: entry.ano,
    icms: entry.icms,
    iss: entry.iss,
    pis: entry.pis,
    cofins: entry.cofins,
    ibs: entry.ibs,
    cbs: entry.cbs,
    totalNovoRegime,
    totalAntigoRegime,
  };
}
