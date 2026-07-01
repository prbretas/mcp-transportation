/**
 * Shared utilities for mcp-frete-tributario
 */

/**
 * Set of all 27 valid Brazilian state abbreviations (UF siglas).
 * Used for input validation across multiple tools.
 */
export const UF_VALIDAS = new Set<string>([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

/**
 * Rounds a number to 2 decimal places using the half-up strategy.
 *
 * JavaScript's `Math.round` applies half-up for positive values
 * (rounds .5 toward positive infinity), satisfying requirement 1.7.
 *
 * @example
 * halfUp(1234.555)  // 1234.56
 * halfUp(0.1 + 0.2) // 0.30
 *
 * @param value - The number to round
 * @returns The value rounded to exactly 2 decimal places
 */
export function halfUp(value: number): number {
  return Math.round(value * 100) / 100;
}
