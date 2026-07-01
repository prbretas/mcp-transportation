/**
 * Servidor REST — Abordagem 1
 *
 * Expõe os cálculos do mcp-frete-tributario como endpoints HTTP
 * para consumo pelo Protheus via FWHTTPClient ou APISendRequest.
 *
 * Endpoints:
 *   GET  /health               — verifica se o servidor está no ar
 *   POST /calcular-carga       — carga tributária de um frete
 *   GET  /cronograma/:ano      — alíquotas de um ano específico
 *   POST /simular-rota         — impacto por CNPJ (chama BrasilAPI)
 *   GET  /empresas             — lista empresas cadastradas
 */

import express, { Request, Response } from "express";
import { PORT } from "./config.js";
import { cronogramaMap, empresas } from "./dataLoader.js";
import { calcularCarga } from "./calcular.js";

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Middleware: log de requisições
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    servidor: "mcp-frete-tributario REST API",
    versao: "1.0.0",
    timestamp: new Date().toISOString(),
    anosDisponiveis: [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033],
  });
});

// ---------------------------------------------------------------------------
// POST /calcular-carga
// Body: { valorFrete, ufOrigem, ufDestino, ano, ncm? }
// ---------------------------------------------------------------------------
app.post("/calcular-carga", (req: Request, res: Response) => {
  const { valorFrete, ufOrigem, ufDestino, ano } = req.body as {
    valorFrete: unknown;
    ufOrigem: unknown;
    ufDestino: unknown;
    ano: unknown;
  };

  // Validação básica de presença
  if (valorFrete === undefined || ufOrigem === undefined || ufDestino === undefined || ano === undefined) {
    res.status(400).json({ error: "Campos obrigatórios: valorFrete, ufOrigem, ufDestino, ano" });
    return;
  }

  const result = calcularCarga(
    Number(valorFrete),
    String(ufOrigem),
    String(ufDestino),
    Number(ano),
    cronogramaMap
  );

  if ("error" in result) {
    res.status(400).json(result);
    return;
  }

  res.json(result);
});

// ---------------------------------------------------------------------------
// GET /cronograma/:ano
// ---------------------------------------------------------------------------
app.get("/cronograma/:ano", (req: Request, res: Response) => {
  const ano = Number(req.params["ano"]);

  if (isNaN(ano) || ano < 2026 || ano > 2033) {
    res.status(400).json({ error: "ano deve estar entre 2026 e 2033" });
    return;
  }

  const entry = cronogramaMap.get(ano);
  if (!entry) {
    res.status(404).json({ error: "Ano não encontrado no cronograma" });
    return;
  }

  const halfUp = (v: number) => Math.round(v * 100) / 100;

  res.json({
    ...entry,
    totalNovoRegime: halfUp(entry.ibs + entry.cbs),
    totalAntigoRegime: halfUp(entry.icms + entry.iss + entry.pis + entry.cofins),
  });
});

// ---------------------------------------------------------------------------
// POST /simular-rota
// Body: { cnpjOrigem, cnpjDestino, valorFrete }
// Chama BrasilAPI para resolver as UFs e calcula o impacto para o ano corrente
// ---------------------------------------------------------------------------
app.post("/simular-rota", async (req: Request, res: Response) => {
  const { cnpjOrigem, cnpjDestino, valorFrete } = req.body as {
    cnpjOrigem: unknown;
    cnpjDestino: unknown;
    valorFrete: unknown;
  };

  if (!cnpjOrigem || !cnpjDestino || !valorFrete) {
    res.status(400).json({ error: "Campos obrigatórios: cnpjOrigem, cnpjDestino, valorFrete" });
    return;
  }

  const strip = (s: string) => s.replace(/\D/g, "");
  const cnpjO = strip(String(cnpjOrigem));
  const cnpjD = strip(String(cnpjDestino));

  if (cnpjO.length !== 14) {
    res.status(400).json({ error: `CNPJ inválido: ${cnpjOrigem}` });
    return;
  }
  if (cnpjD.length !== 14) {
    res.status(400).json({ error: `CNPJ inválido: ${cnpjDestino}` });
    return;
  }

  const anoCorrente = new Date().getFullYear();
  if (anoCorrente < 2026 || anoCorrente > 2033) {
    res.status(400).json({ error: "Ano corrente fora do período de transição (2026–2033)" });
    return;
  }

  try {
    const [respO, respD] = await Promise.all([
      fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjO}`),
      fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjD}`),
    ]);

    if (!respO.ok) {
      res.status(400).json({ error: `Não foi possível consultar o CNPJ ${cnpjO}: HTTP ${respO.status}` });
      return;
    }
    if (!respD.ok) {
      res.status(400).json({ error: `Não foi possível consultar o CNPJ ${cnpjD}: HTTP ${respD.status}` });
      return;
    }

    const dadosO = await respO.json() as { uf: string; razao_social: string };
    const dadosD = await respD.json() as { uf: string; razao_social: string };

    const carga = calcularCarga(Number(valorFrete), dadosO.uf, dadosD.uf, anoCorrente, cronogramaMap);

    if ("error" in carga) {
      res.status(400).json(carga);
      return;
    }

    res.json({
      ufOrigem: dadosO.uf,
      ufDestino: dadosD.uf,
      razaoSocialOrigem: dadosO.razao_social,
      razaoSocialDestino: dadosD.razao_social,
      anoCorrente,
      ...carga,
    });
  } catch (err) {
    res.status(500).json({ error: `Erro ao consultar BrasilAPI: ${(err as Error).message}` });
  }
});

// ---------------------------------------------------------------------------
// GET /empresas
// ---------------------------------------------------------------------------
app.get("/empresas", (_req: Request, res: Response) => {
  res.json({
    empresas,
    totalEmpresas: empresas.length,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(Number(PORT), () => {
  console.log(`[mcp-frete-tributario REST] Servidor iniciado na porta ${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/calcular-carga`);
  console.log(`  GET  http://localhost:${PORT}/cronograma/:ano`);
  console.log(`  POST http://localhost:${PORT}/simular-rota`);
  console.log(`  GET  http://localhost:${PORT}/empresas`);
});
