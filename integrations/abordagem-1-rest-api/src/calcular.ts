/**
 * Funções de cálculo tributário reutilizadas do mcp-frete-tributario.
 * Copiadas aqui para que a abordagem 1 seja autossuficiente,
 * sem depender do build do projeto pai.
 */

import type { CronogramaEntry } from "./dataLoader.js";

const UF_VALIDAS = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
]);

function halfUp(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface CargaTributaria {
  aliquotaNominal: number;
  valorIBS: number;
  valorCBS: number;
  totalNovoRegime: number;
  valorICMS: number;
  valorPIS: number;
  valorCOFINS: number;
  totalAntigoRegime: number;
}

export interface CalcError {
  error: string;
}

export function calcularCarga(
  valorFrete: number,
  ufOrigem: string,
  ufDestino: string,
  ano: number,
  cronogramaMap: Map<number, CronogramaEntry>
): CargaTributaria | CalcError {
  if (valorFrete <= 0) return { error: "valorFrete deve ser um número positivo" };
  if (ano < 2026 || ano > 2033) return { error: "ano deve estar entre 2026 e 2033" };
  if (!UF_VALIDAS.has(ufOrigem.toUpperCase())) return { error: `UF inválida: ${ufOrigem}` };
  if (!UF_VALIDAS.has(ufDestino.toUpperCase())) return { error: `UF inválida: ${ufDestino}` };

  const entry = cronogramaMap.get(ano);
  if (!entry) return { error: "ano não encontrado no cronograma" };

  const valorIBS = halfUp((valorFrete * entry.ibs) / 100);
  const valorCBS = halfUp((valorFrete * entry.cbs) / 100);
  const totalNovoRegime = halfUp(valorIBS + valorCBS);
  const valorICMS = halfUp((valorFrete * entry.icms) / 100);
  const valorPIS = halfUp((valorFrete * entry.pis) / 100);
  const valorCOFINS = halfUp((valorFrete * entry.cofins) / 100);
  const totalAntigoRegime = halfUp(valorICMS + valorPIS + valorCOFINS);

  return {
    aliquotaNominal: entry.ibs + entry.cbs,
    valorIBS, valorCBS, totalNovoRegime,
    valorICMS, valorPIS, valorCOFINS, totalAntigoRegime,
  };
}
