/**
 * Shared TypeScript interfaces for mcp-frete-tributario
 */

/**
 * Entry from the Cronograma_Transicao (cronograma-reforma.json).
 * Represents tax rates (in percentage points 0–100) for a single year
 * during the Brazilian Tax Reform transition period (2026–2033).
 */
export interface CronogramaEntry {
  /** Calendar year (2026–2033) */
  ano: number;
  /** ICMS rate — old regime, state tax */
  icms: number;
  /** ISS rate — old regime, municipal tax */
  iss: number;
  /** PIS rate — old regime, federal contribution */
  pis: number;
  /** COFINS rate — old regime, federal contribution */
  cofins: number;
  /** IBS rate — new regime, subnational tax */
  ibs: number;
  /** CBS rate — new regime, federal contribution */
  cbs: number;
}

/**
 * Company record stored in empresas.json (Banco_Simulado).
 */
export interface Empresa {
  /** Company legal name, non-empty */
  razaoSocial: string;
  /** CNPJ with exactly 14 numeric digits */
  cnpj: string;
  /** Valid Brazilian state abbreviation (UF) */
  uf: string;
  /** Value of the last freight, >= 0 (BRL) */
  valorUltimoFrete: number;
}

/**
 * Calculated tax burden for a freight operation.
 * All monetary values are in BRL rounded to 2 decimal places (half-up).
 */
export interface CargaTributaria {
  /** Nominal rate = IBS% + CBS% for the given year (percentage points) */
  aliquotaNominal: number;
  /** IBS value = valorFrete × ibs% / 100, half-up 2 decimals */
  valorIBS: number;
  /** CBS value = valorFrete × cbs% / 100, half-up 2 decimals */
  valorCBS: number;
  /** Total new regime = valorIBS + valorCBS, half-up 2 decimals */
  totalNovoRegime: number;
  /** ICMS value = valorFrete × icms% / 100, half-up 2 decimals */
  valorICMS: number;
  /** PIS value = valorFrete × pis% / 100, half-up 2 decimals */
  valorPIS: number;
  /** COFINS value = valorFrete × cofins% / 100, half-up 2 decimals */
  valorCOFINS: number;
  /** Total old regime = valorICMS + valorPIS + valorCOFINS, half-up 2 decimals */
  totalAntigoRegime: number;
}

/**
 * Relevant fields from a successful BrasilAPI CNPJ response.
 * The API returns many more fields; only these are consumed.
 */
export interface BrasilApiCnpjResponse {
  /** State abbreviation (UF) of the company's registered address */
  uf: string;
  /** Company legal name */
  razao_social: string;
}

/**
 * Typed error thrown when BrasilAPI returns HTTP >= 400 or times out.
 */
export class BrasilApiError extends Error {
  /** The CNPJ that triggered the error */
  readonly cnpj: string;
  /** HTTP status code (as string) or "timeout" */
  readonly motivo: string;

  constructor(cnpj: string, motivo: string | number) {
    super(`Não foi possível consultar o CNPJ ${cnpj}: ${motivo}`);
    this.name = "BrasilApiError";
    this.cnpj = cnpj;
    this.motivo = String(motivo);
  }
}
