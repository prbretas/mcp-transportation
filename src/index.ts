/**
 * Bootstrap entry point for mcp-frete-tributario MCP server.
 *
 * Responsibilities:
 *  1. Load and validate JSON data files at startup (fatal on failure).
 *  2. Build an O(1) Map<number, CronogramaEntry> from the cronograma array.
 *  3. Instantiate McpServer and register the 4 tools.
 *  4. Connect to StdioServerTransport.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3, 6.4, 6.5
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { CronogramaEntry, Empresa } from "./types.js";
import {
  calcularCargaTributaria,
  calcularCargaTributariaSchema,
} from "./tools/calcularCargaTributaria.js";
import {
  consultarCronograma,
  consultarCronogramaSchema,
} from "./tools/consultarCronograma.js";
import {
  simularImpactoRota,
  simularImpactoRotaSchema,
} from "./tools/simularImpactoRota.js";
import {
  listarEmpresas,
  listarEmpresasSchema,
} from "./tools/listarEmpresas.js";
import { fetchCnpj } from "./services/brasilApiService.js";

// ---------------------------------------------------------------------------
// Path resolution (ESM-safe equivalent of __dirname)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Load and validate JSON data at startup
// ---------------------------------------------------------------------------

// --- cronograma-reforma.json ---

let cronogramaRaw: unknown;
try {
  const cronogramaPath = join(__dirname, "../data/cronograma-reforma.json");
  cronogramaRaw = JSON.parse(readFileSync(cronogramaPath, "utf-8"));
} catch (err) {
  process.stderr.write(
    `[mcp-frete-tributario] Falha ao carregar cronograma-reforma.json: ${(err as Error).message}\n`
  );
  process.exit(1);
}

if (!Array.isArray(cronogramaRaw)) {
  process.stderr.write(
    "[mcp-frete-tributario] cronograma-reforma.json deve ser um array JSON.\n"
  );
  process.exit(1);
}

const CRONOGRAMA_FIELDS = ["ano", "icms", "iss", "pis", "cofins", "ibs", "cbs"] as const;

for (let i = 0; i < cronogramaRaw.length; i++) {
  const entry = cronogramaRaw[i] as Record<string, unknown>;
  for (const field of CRONOGRAMA_FIELDS) {
    if (typeof entry[field] !== "number") {
      process.stderr.write(
        `[mcp-frete-tributario] cronograma-reforma.json: entrada[${i}] campo "${field}" inválido ou ausente (esperado number, recebido ${typeof entry[field]}).\n`
      );
      process.exit(1);
    }
  }
}

const cronogramaArray = cronogramaRaw as CronogramaEntry[];

// --- empresas.json ---

let empresasRaw: unknown;
try {
  const empresasPath = join(__dirname, "../data/empresas.json");
  empresasRaw = JSON.parse(readFileSync(empresasPath, "utf-8"));
} catch (err) {
  process.stderr.write(
    `[mcp-frete-tributario] Falha ao carregar empresas.json: ${(err as Error).message}\n`
  );
  process.exit(1);
}

if (!Array.isArray(empresasRaw)) {
  process.stderr.write(
    "[mcp-frete-tributario] empresas.json deve ser um array JSON.\n"
  );
  process.exit(1);
}

for (let i = 0; i < empresasRaw.length; i++) {
  const e = empresasRaw[i] as Record<string, unknown>;
  if (typeof e["razaoSocial"] !== "string") {
    process.stderr.write(
      `[mcp-frete-tributario] empresas.json: empresa[${i}] campo "razaoSocial" inválido ou ausente (esperado string).\n`
    );
    process.exit(1);
  }
  if (typeof e["cnpj"] !== "string") {
    process.stderr.write(
      `[mcp-frete-tributario] empresas.json: empresa[${i}] campo "cnpj" inválido ou ausente (esperado string).\n`
    );
    process.exit(1);
  }
  if (typeof e["uf"] !== "string") {
    process.stderr.write(
      `[mcp-frete-tributario] empresas.json: empresa[${i}] campo "uf" inválido ou ausente (esperado string).\n`
    );
    process.exit(1);
  }
  if (typeof e["valorUltimoFrete"] !== "number") {
    process.stderr.write(
      `[mcp-frete-tributario] empresas.json: empresa[${i}] campo "valorUltimoFrete" inválido ou ausente (esperado number).\n`
    );
    process.exit(1);
  }
}

const empresas = empresasRaw as Empresa[];

// ---------------------------------------------------------------------------
// 2. Build cronograma Map for O(1) lookup
// ---------------------------------------------------------------------------

const cronogramaMap = new Map<number, CronogramaEntry>(
  cronogramaArray.map((entry) => [entry.ano, entry])
);

// ---------------------------------------------------------------------------
// 3. Instantiate McpServer
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "mcp-frete-tributario",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// 4. Register the 4 tools
// ---------------------------------------------------------------------------

// Tool 1: calcular_carga_tributaria_frete
server.tool(
  "calcular_carga_tributaria_frete",
  "Calcula a carga tributária de um frete para um ano da transição tributária (2026–2033), comparando novo regime (IBS/CBS) com antigo regime (ICMS/PIS/COFINS).",
  calcularCargaTributariaSchema.shape,
  async (params) => {
    try {
      const result = calcularCargaTributaria(params, cronogramaMap);
      if ("isError" in result) {
        return { isError: true, content: result.content };
      }
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Erro interno: ${(e as Error).message}` }],
      };
    }
  }
);

// Tool 2: consultar_cronograma_transicao
server.tool(
  "consultar_cronograma_transicao",
  "Consulta os percentuais de cada tributo (ICMS, ISS, PIS, COFINS, IBS, CBS) para um determinado ano da Reforma Tributária (2026–2033).",
  consultarCronogramaSchema.shape,
  async (params) => {
    try {
      const result = consultarCronograma(params, cronogramaMap);
      if ("isError" in result) {
        return { isError: true, content: result.content };
      }
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Erro interno: ${(e as Error).message}` }],
      };
    }
  }
);

// Tool 3: simular_impacto_rota
server.tool(
  "simular_impacto_rota",
  "Simula o impacto tributário de uma rota de frete informando os CNPJs de origem e destino — as UFs são resolvidas automaticamente via BrasilAPI.",
  simularImpactoRotaSchema.shape,
  async (params) => {
    try {
      const result = await simularImpactoRota(params, cronogramaMap, fetchCnpj);
      if ("isError" in result) {
        return { isError: true, content: result.content };
      }
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Erro interno: ${(e as Error).message}` }],
      };
    }
  }
);

// Tool 4: listar_empresas_cadastradas
// Note: no input schema — tool takes no parameters. Using server.tool overload
// without schema to avoid validation errors when LLM sends undefined/null input.
server.tool(
  "listar_empresas_cadastradas",
  "Lista todas as empresas cadastradas no banco simulado, retornando dados de CNPJ, UF e último frete.",
  async () => {
    try {
      const result = listarEmpresas(empresas);
      if ("isError" in result) {
        return { isError: true, content: result.content };
      }
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Erro interno: ${(e as Error).message}` }],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// 5. Connect to stdio transport
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
