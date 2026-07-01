/**
 * Carrega e valida os arquivos JSON de dados do mcp-frete-tributario.
 * Reutiliza a mesma lógica de validação do index.ts principal.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DATA_DIR } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CronogramaEntry {
  ano: number;
  icms: number;
  iss: number;
  pis: number;
  cofins: number;
  ibs: number;
  cbs: number;
}

export interface Empresa {
  razaoSocial: string;
  cnpj: string;
  uf: string;
  valorUltimoFrete: number;
}

function loadCronograma(): Map<number, CronogramaEntry> {
  const filePath = join(__dirname, DATA_DIR, "cronograma-reforma.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as CronogramaEntry[];

  if (!Array.isArray(raw)) {
    throw new Error("cronograma-reforma.json deve ser um array JSON.");
  }

  return new Map(raw.map((entry) => [entry.ano, entry]));
}

function loadEmpresas(): Empresa[] {
  const filePath = join(__dirname, DATA_DIR, "empresas.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Empresa[];

  if (!Array.isArray(raw)) {
    throw new Error("empresas.json deve ser um array JSON.");
  }

  return raw;
}

// Exporta os dados carregados em memória (singleton)
export const cronogramaMap = loadCronograma();
export const empresas = loadEmpresas();
