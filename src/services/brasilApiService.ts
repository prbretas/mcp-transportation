import { BrasilApiError, BrasilApiCnpjResponse } from "../types.js";

const BRASIL_API_BASE_URL = "https://brasilapi.com.br/api/cnpj/v1";

/**
 * Fetches CNPJ data from BrasilAPI.
 *
 * @param cnpj - 14-digit numeric CNPJ string
 * @param timeoutMs - request timeout in milliseconds (default: 5000)
 * @returns Promise resolving to { uf, razao_social }
 * @throws {BrasilApiError} if HTTP >= 400 or request times out
 */
export async function fetchCnpj(
  cnpj: string,
  timeoutMs = 5000
): Promise<BrasilApiCnpjResponse> {
  const url = `${BRASIL_API_BASE_URL}/${cnpj}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new BrasilApiError(cnpj, response.status);
    }
    const data = (await response.json()) as BrasilApiCnpjResponse;
    return { uf: data.uf, razao_social: data.razao_social };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new BrasilApiError(cnpj, "timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
