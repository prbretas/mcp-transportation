# Documentação Técnica — mcp-frete-tributario

> Documentação completa do servidor MCP para simulação tributária de frete durante a Reforma Tributária brasileira (LC 214/2025).

---

## Índice

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Contexto de Negócio](#2-contexto-de-negócio)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Estrutura de Arquivos](#4-estrutura-de-arquivos)
5. [Tipos e Interfaces](#5-tipos-e-interfaces)
6. [Utilitários Compartilhados](#6-utilitários-compartilhados)
7. [Ferramentas MCP](#7-ferramentas-mcp)
8. [Serviços Externos](#8-serviços-externos)
9. [Dados de Referência](#9-dados-de-referência)
10. [Bootstrap e Ciclo de Vida](#10-bootstrap-e-ciclo-de-vida)
11. [Testes](#11-testes)
12. [Configuração e Deploy](#12-configuração-e-deploy)
13. [Tratamento de Erros](#13-tratamento-de-erros)
14. [Decisões de Design](#14-decisões-de-design)
15. [Extensibilidade](#15-extensibilidade)

---

## 1. Visão Geral do Projeto

O **mcp-frete-tributario** é um servidor MCP (Model Context Protocol) escrito em TypeScript que expõe quatro ferramentas para agentes de IA calcularem e consultarem a tributação de frete no contexto da **Reforma Tributária brasileira**.

### Stack tecnológica

| Tecnologia | Versão | Papel |
|---|---|---|
| Node.js | >= 20.0.0 | Runtime |
| TypeScript | 5.7 | Linguagem principal |
| @modelcontextprotocol/sdk | 1.12 | Protocolo MCP / transporte stdio |
| Zod | 3.23 | Validação e parsing de entrada |
| Vitest | 2.1 | Framework de testes |
| fast-check | 3.22 | Property-based testing |

### Características principais

- Transporte **stdio** (JSON-RPC 2.0) — compatível com todos os clientes MCP
- Validação de entrada com **Zod** (aceita números como strings para compatibilidade com LLMs)
- Cálculo monetário com arredondamento **half-up** de 2 casas decimais
- Integração com **BrasilAPI** para resolução de CNPJ → UF
- Dados carregados em memória no startup com validação de schema fatal
- **Map O(1)** para lookup do cronograma por ano
- 100% **ESM** (ES Modules) — `"type": "module"` no package.json

---

## 2. Contexto de Negócio

### A Reforma Tributária (LC 214/2025)

A Lei Complementar 214/2025 institui dois novos tributos que substituem progressivamente o sistema atual:

- **IBS** (Imposto sobre Bens e Serviços) — substitui ICMS e ISS, de competência subnacional
- **CBS** (Contribuição sobre Bens e Serviços) — substitui PIS e COFINS, de competência federal

### Cronograma de transição (2026–2033)

| Ano  | ICMS  | ISS  | PIS   | COFINS | IBS    | CBS    | Total Novo | Total Antigo |
|------|-------|------|-------|--------|--------|--------|-----------|--------------|
| 2026 | 12,0% | 2,0% | 0,65% | 3,00%  | 0,10%  | 0,10%  | 0,20%     | 17,65%       |
| 2027 | 12,0% | 2,0% | 0,65% | 3,00%  | 0,10%  | 0,10%  | 0,20%     | 17,65%       |
| 2028 | 9,6%  | 1,6% | 0,52% | 2,40%  | 3,20%  | 2,40%  | 5,60%     | 14,12%       |
| 2029 | 7,2%  | 1,2% | 0,39% | 1,80%  | 6,40%  | 4,80%  | 11,20%    | 10,59%       |
| 2030 | 4,8%  | 0,8% | 0,26% | 1,20%  | 9,60%  | 7,20%  | 16,80%    | 7,06%        |
| 2031 | 2,4%  | 0,4% | 0,13% | 0,60%  | 12,80% | 9,60%  | 22,40%    | 3,53%        |
| 2032 | 0,0%  | 0,0% | 0,00% | 0,00%  | 16,00% | 12,00% | 28,00%    | 0,00%        |
| 2033 | 0,0%  | 0,0% | 0,00% | 0,00%  | 16,00% | 12,00% | 28,00%    | 0,00%        |

### Impacto no frete

- O **ISS não é aplicado** ao transporte interestadual de cargas — apenas ao frete municipal
- O princípio do **destino** substitui o da **origem**, alterando a forma de precificar fretes interestaduais
- A alíquota plena estimada de IBS+CBS (28%) representa aumento significativo em relação ao PIS+COFINS atuais (~3,65%)
- O ICMS, que variava por estado (7%–12%), é unificado e reduzido gradualmente até zero

---

## 3. Arquitetura do Sistema

### Modelo de comunicação

```
Cliente MCP
    │
    │  stdin/stdout (JSON-RPC 2.0)
    │
    ▼
[Processo Node.js — dist/index.js]
    │
    ├─── McpServer (@modelcontextprotocol/sdk)
    │        │
    │        ├─ tool: calcular_carga_tributaria_frete
    │        ├─ tool: consultar_cronograma_transicao
    │        ├─ tool: simular_impacto_rota
    │        └─ tool: listar_empresas_cadastradas
    │
    ├─── cronogramaMap: Map<number, CronogramaEntry>  (em memória)
    ├─── empresas: Empresa[]                           (em memória)
    │
    └─── BrasilAPI (HTTP externo — apenas simular_impacto_rota)
```

### Fluxo de inicialização

```
npm start
   │
   ▼
dist/index.js
   │
   ├─ 1. Carrega cronograma-reforma.json (fatal se ausente/inválido)
   ├─ 2. Carrega empresas.json (fatal se ausente/inválido)
   ├─ 3. Constrói Map<number, CronogramaEntry> (O(1) lookup)
   ├─ 4. Instancia McpServer { name, version }
   ├─ 5. Registra as 4 tools com schemas Zod
   ├─ 6. Cria StdioServerTransport
   └─ 7. server.connect(transport) — aguarda chamadas do cliente
```

### Diagrama de dependências de módulos

```
index.ts
  ├── types.ts
  ├── tools/calcularCargaTributaria.ts
  │     ├── types.ts
  │     └── utils.ts
  ├── tools/consultarCronograma.ts
  │     └── types.ts
  ├── tools/simularImpactoRota.ts
  │     ├── types.ts
  │     └── tools/calcularCargaTributaria.ts
  ├── tools/listarEmpresas.ts
  │     └── types.ts
  └── services/brasilApiService.ts
        └── types.ts
```

---

## 4. Estrutura de Arquivos

```
mcp-transportation/
├── src/
│   ├── index.ts                            # Ponto de entrada e bootstrap
│   ├── types.ts                            # Interfaces e classes de erro
│   ├── utils.ts                            # halfUp() e UF_VALIDAS
│   │
│   ├── tools/
│   │   ├── calcularCargaTributaria.ts      # Tool 1
│   │   ├── consultarCronograma.ts          # Tool 2
│   │   ├── simularImpactoRota.ts           # Tool 3
│   │   └── listarEmpresas.ts              # Tool 4
│   │
│   ├── services/
│   │   └── brasilApiService.ts            # Integração BrasilAPI
│   │
│   ├── data/
│   │   ├── cronograma-reforma.json        # Alíquotas 2026–2033
│   │   └── empresas.json                  # Banco simulado (7 empresas)
│   │
│   └── __tests__/
│       ├── fixtures/
│       │   ├── cronograma-test.json
│       │   ├── empresas-test.json
│       │   └── empresas-empty.json
│       ├── server/
│       │   └── bootstrap.unit.test.ts
│       └── tools/
│           ├── calcularCargaTributaria.unit.test.ts
│           ├── calcularCargaTributaria.property.test.ts
│           ├── consultarCronograma.unit.test.ts
│           ├── consultarCronograma.property.test.ts
│           ├── simularImpactoRota.unit.test.ts
│           ├── simularImpactoRota.property.test.ts
│           ├── listarEmpresas.unit.test.ts
│           ├── listarEmpresas.property.test.ts
│           └── utils.unit.test.ts
│
├── data/                                   # Gerado pelo build — runtime
│   ├── cronograma-reforma.json
│   └── empresas.json
│
├── dist/                                   # JavaScript compilado — gitignored
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── mcp-config.json                         # Exemplo de configuração MCP
└── README.md
```

---

## 5. Tipos e Interfaces

Arquivo: `src/types.ts`

### `CronogramaEntry`

Representa uma linha da tabela de transição tributária para um ano específico.

```typescript
interface CronogramaEntry {
  ano: number;      // 2026–2033
  icms: number;     // % — regime antigo, tributo estadual
  iss: number;      // % — regime antigo, tributo municipal
  pis: number;      // % — regime antigo, contribuição federal
  cofins: number;   // % — regime antigo, contribuição federal
  ibs: number;      // % — novo regime, tributo subnacional
  cbs: number;      // % — novo regime, contribuição federal
}
```

### `Empresa`

Registro de empresa no banco simulado (`empresas.json`).

```typescript
interface Empresa {
  razaoSocial: string;      // Nome jurídico — não vazio
  cnpj: string;             // 14 dígitos numéricos
  uf: string;               // UF válida (2 letras)
  valorUltimoFrete: number; // Valor em BRL — >= 0
}
```

### `CargaTributaria`

Resultado do cálculo tributário. Todos os valores monetários em BRL com 2 casas decimais (half-up).

```typescript
interface CargaTributaria {
  aliquotaNominal: number;    // IBS% + CBS% do ano
  valorIBS: number;           // valorFrete × ibs% / 100
  valorCBS: number;           // valorFrete × cbs% / 100
  totalNovoRegime: number;    // valorIBS + valorCBS
  valorICMS: number;          // valorFrete × icms% / 100
  valorPIS: number;           // valorFrete × pis% / 100
  valorCOFINS: number;        // valorFrete × cofins% / 100
  totalAntigoRegime: number;  // valorICMS + valorPIS + valorCOFINS
}
```

> **Nota:** O ISS não integra o `totalAntigoRegime` pois não é aplicável ao transporte interestadual de cargas.

### `BrasilApiCnpjResponse`

Subconjunto dos campos retornados pela BrasilAPI. A API retorna dezenas de campos; apenas estes dois são consumidos.

```typescript
interface BrasilApiCnpjResponse {
  uf: string;           // UF do endereço registrado
  razao_social: string; // Nome jurídico
}
```

### `BrasilApiError`

Erro tipado lançado quando a BrasilAPI retorna HTTP >= 400 ou quando a requisição expira.

```typescript
class BrasilApiError extends Error {
  readonly cnpj: string;    // CNPJ que causou o erro
  readonly motivo: string;  // Código HTTP (string) ou "timeout"
}
```

---

## 6. Utilitários Compartilhados

Arquivo: `src/utils.ts`

### `UF_VALIDAS`

```typescript
const UF_VALIDAS = new Set<string>([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);
```

Conjunto com as 27 siglas de estados brasileiros válidos. Usado em `calcularCargaTributaria` para validar `ufOrigem` e `ufDestino`.

### `halfUp(value: number): number`

```typescript
function halfUp(value: number): number {
  return Math.round(value * 100) / 100;
}
```

Arredonda para 2 casas decimais usando a estratégia **half-up** (rounds 0.5 para cima). O `Math.round` do JavaScript aplica half-up para valores positivos, satisfazendo os requisitos de precisão monetária.

**Exemplos:**
```
halfUp(1234.555) → 1234.56
halfUp(0.1 + 0.2) → 0.30
halfUp(1.005)    → 1.01
```

---

## 7. Ferramentas MCP

### Tool 1: `calcular_carga_tributaria_frete`

**Arquivo:** `src/tools/calcularCargaTributaria.ts`

#### Schema de entrada (Zod)

```typescript
const calcularCargaTributariaSchema = z.object({
  valorFrete: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)])
    .pipe(z.number().positive()),
  ufOrigem:  z.string().length(2),
  ufDestino: z.string().length(2),
  ano: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
    .pipe(z.number().int().min(2026).max(2033)),
  ncm: z.string().optional(),
});
```

> O schema aceita `number` **ou** `string` numérica para `valorFrete` e `ano`. Isso é intencional — LLMs frequentemente passam números como strings nas chamadas de ferramenta.

#### Lógica de cálculo

```
valorIBS         = halfUp(valorFrete × ibs  / 100)
valorCBS         = halfUp(valorFrete × cbs  / 100)
totalNovoRegime  = halfUp(valorIBS + valorCBS)

valorICMS        = halfUp(valorFrete × icms  / 100)
valorPIS         = halfUp(valorFrete × pis   / 100)
valorCOFINS      = halfUp(valorFrete × cofins / 100)
totalAntigoRegime = halfUp(valorICMS + valorPIS + valorCOFINS)

aliquotaNominal  = ibs + cbs  (sem arredondamento adicional)
```

#### Validações

1. `valorFrete > 0` — retorna erro se zero ou negativo
2. `ano` em [2026, 2033] — validado pelo Zod e pelo handler
3. `ufOrigem` na lista `UF_VALIDAS`
4. `ufDestino` na lista `UF_VALIDAS`
5. Ano presente no `cronogramaMap` (guarda defensiva)

#### NCM (campo opcional)

O campo `ncm` está previsto para suporte futuro a alíquotas diferenciadas por código de mercadoria. Atualmente a tabela `ncmRates` está vazia e qualquer NCM faz fallback para as alíquotas padrão do cronograma.

---

### Tool 2: `consultar_cronograma_transicao`

**Arquivo:** `src/tools/consultarCronograma.ts`

#### Schema de entrada

```typescript
const consultarCronogramaSchema = z.object({
  ano: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
    .pipe(z.number().int().min(2026).max(2033)),
});
```

#### Resposta

```typescript
interface ConsultarCronogramaResult {
  ano: number;
  icms: number;
  iss: number;
  pis: number;
  cofins: number;
  ibs: number;
  cbs: number;
  totalNovoRegime: number;     // halfUp(ibs + cbs)
  totalAntigoRegime: number;   // halfUp(icms + iss + pis + cofins)
}
```

> Diferente de `calcularCargaTributaria`, o `totalAntigoRegime` aqui inclui o ISS, pois esta tool retorna o cronograma completo — não o cálculo de uma operação específica de frete interestadual.

---

### Tool 3: `simular_impacto_rota`

**Arquivo:** `src/tools/simularImpactoRota.ts`

#### Schema de entrada

```typescript
const simularImpactoRotaSchema = z.object({
  cnpjOrigem:  z.string(),
  cnpjDestino: z.string(),
  valorFrete: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)])
    .pipe(z.number().positive()),
});
```

#### Fluxo de execução

```
1. Valida valorFrete > 0
2. Strip de caracteres não-numéricos dos CNPJs
3. Valida que ambos os CNPJs têm exatamente 14 dígitos
4. Chama BrasilAPI em paralelo (Promise.all) para os dois CNPJs
5. Captura BrasilApiError e retorna mensagem de erro formatada
6. Determina anoCorrente via new Date().getFullYear()
7. Valida anoCorrente em [2026, 2033]
8. Delega para calcularCargaTributaria com as UFs resolvidas
9. Retorna resultado enriquecido com UFs e razões sociais
```

#### Injeção de dependência (testabilidade)

O `fetchCnpj` é injetado como parâmetro, não importado diretamente:

```typescript
export async function simularImpactoRota(
  params: SimularImpactoRotaParams,
  cronogramaMap: Map<number, CronogramaEntry>,
  fetchCnpjFn: (cnpj: string) => Promise<BrasilApiCnpjResponse>
)
```

Isso permite que os testes substituam a chamada HTTP por um mock sem monkey-patching.

---

### Tool 4: `listar_empresas_cadastradas`

**Arquivo:** `src/tools/listarEmpresas.ts`

Não recebe parâmetros. Retorna a lista completa de empresas e o total.

```typescript
// Sem schema de entrada — registrada sem .shape no index.ts
server.tool("listar_empresas_cadastradas", "...", async () => { ... });
```

#### Resposta

```typescript
interface ListarEmpresasSuccess {
  empresas: Empresa[];
  totalEmpresas: number;
}
```

#### Tratamento de dados indisponíveis

Se `empresas` for `null` ou `undefined` (indisponibilidade do dado em runtime), retorna `isError: true` em vez de lançar exceção.

---

## 8. Serviços Externos

### BrasilAPI — `src/services/brasilApiService.ts`

**Endpoint:** `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`

#### Implementação

```typescript
export async function fetchCnpj(
  cnpj: string,
  timeoutMs = 5000
): Promise<BrasilApiCnpjResponse>
```

- Usa `AbortController` para implementar timeout configurável (padrão: 5 segundos)
- Lança `BrasilApiError(cnpj, statusCode)` para HTTP >= 400
- Lança `BrasilApiError(cnpj, "timeout")` para timeout (AbortError)
- Retorna apenas `{ uf, razao_social }` do payload completo da API

#### Tratamento de erros

| Condição | Comportamento |
|---|---|
| HTTP 200 | Retorna `{ uf, razao_social }` |
| HTTP 404 | `BrasilApiError(cnpj, 404)` |
| HTTP 429/500 | `BrasilApiError(cnpj, statusCode)` |
| Timeout (> 5s) | `BrasilApiError(cnpj, "timeout")` |
| Erro de rede | Re-lança o erro original |

---

## 9. Dados de Referência

### `cronograma-reforma.json`

Localização em runtime: `data/cronograma-reforma.json` (relativo ao `dist/`)

```json
[
  { "ano": 2026, "icms": 12.00, "iss": 2.00, "pis": 0.65, "cofins": 3.00, "ibs": 0.10, "cbs": 0.10 },
  { "ano": 2027, "icms": 12.00, "iss": 2.00, "pis": 0.65, "cofins": 3.00, "ibs": 0.10, "cbs": 0.10 },
  ...
]
```

Validação no startup: todos os 7 campos (`ano`, `icms`, `iss`, `pis`, `cofins`, `ibs`, `cbs`) devem ser do tipo `number`. Falha fatal se qualquer campo estiver ausente ou inválido.

### `empresas.json`

7 empresas transportadoras representando diferentes regiões do Brasil (RS, SP, BA, MT, AM, MG, RJ), com CNPJs fictícios no formato correto (14 dígitos numéricos).

---

## 10. Bootstrap e Ciclo de Vida

**Arquivo:** `src/index.ts`

### Sequência de inicialização detalhada

```
Processo inicia
    │
    ├─ Lê cronograma-reforma.json
    │      ├─ Falha na leitura → stderr + process.exit(1)
    │      ├─ JSON não é array → stderr + process.exit(1)
    │      └─ Campo numérico ausente/inválido → stderr + process.exit(1)
    │
    ├─ Lê empresas.json
    │      ├─ Falha na leitura → stderr + process.exit(1)
    │      ├─ JSON não é array → stderr + process.exit(1)
    │      └─ Campo obrigatório ausente/inválido → stderr + process.exit(1)
    │
    ├─ Constrói cronogramaMap (Map<number, CronogramaEntry>)
    │
    ├─ Instancia McpServer
    │
    ├─ Registra 4 tools
    │
    └─ server.connect(StdioServerTransport) — processo fica ativo
```

### Resolução de caminhos (ESM-safe)

```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const cronogramaPath = join(__dirname, "../data/cronograma-reforma.json");
```

O uso de `fileURLToPath` + `dirname` é necessário porque em ESM o `__dirname` global não existe. Os dados ficam em `data/` (um nível acima de `dist/`).

---

## 11. Testes

### Estratégia de testes

O projeto adota duas modalidades complementares:

1. **Testes unitários (example-based)** — validam exemplos concretos com valores esperados fixos
2. **Property-based tests (fast-check)** — validam propriedades matemáticas e invariantes sobre domínios arbitrários de entrada

### Configuração (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

### Testes por módulo

#### `calcularCargaTributaria`

**Unitários:**
- Cálculo correto para SP→RJ ano 2026 com `valorFrete=1000`
- NCM não encontrado faz fallback para alíquotas padrão
- UF de origem inválida → `isError: true`
- UF de destino inválida → `isError: true`

**Property-based:**
- `totalNovoRegime === valorIBS + valorCBS` (consistência)
- `valorIBS >= 0` e `valorCBS >= 0` (não-negatividade)
- Para 2032/2033: `totalAntigoRegime === 0` (ICMS/PIS/COFINS zerados)

#### `consultarCronograma`

**Unitários:**
- Retorna os 9 campos esperados para ano 2026
- Erro para ano fora do range (2025, 2034)

**Property-based:**
- `totalNovoRegime === halfUp(ibs + cbs)`
- Todos os campos numéricos >= 0

#### `simularImpactoRota`

**Unitários (com mocks):**
- Sucesso com dois CNPJs mockados (ano 2026 simulado com `vi.useFakeTimers`)
- HTTP 404 no CNPJ de origem → `isError: true` com mensagem correta
- Timeout no CNPJ de destino → `isError: true` com mensagem correta

**Property-based:**
- CNPJ com != 14 dígitos sempre retorna erro
- `valorFrete <= 0` sempre retorna erro

#### `listarEmpresas`

**Unitários:**
- Array válido → retorna `{ empresas, totalEmpresas }`
- Array vazio → `{ empresas: [], totalEmpresas: 0 }`
- `null` → `isError: true`

**Property-based:**
- `totalEmpresas === empresas.length` para qualquer array

#### `utils`

**Unitários:**
- `halfUp(1234.555) === 1234.56`
- `halfUp(0) === 0`
- Todos os 27 estados em `UF_VALIDAS`

### Fixtures de teste

| Arquivo | Conteúdo |
|---|---|
| `cronograma-test.json` | Versão reduzida do cronograma para testes |
| `empresas-test.json` | Empresas de exemplo para testes |
| `empresas-empty.json` | Array vazio para testar borda |

### Executar testes

```bash
npm test              # Executa todos os testes (vitest run)
npm run test:watch    # Modo watch (desenvolvimento)
npm run typecheck     # Verifica tipos sem compilar
```

---

## 12. Configuração e Deploy

### Build

```bash
npm run build
```

O script de build:
1. Compila TypeScript com `tsc`
2. Cria o diretório `data/` na raiz
3. Copia `src/data/cronograma-reforma.json` → `data/cronograma-reforma.json`
4. Copia `src/data/empresas.json` → `data/empresas.json`

### Configuração no Claude Desktop

Arquivo: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "frete-tributario": {
      "command": "node",
      "args": ["C:\\caminho\\para\\mcp-transportation\\dist\\index.js"]
    }
  }
}
```

### Configuração no Kiro (VS Code)

Arquivo: `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "frete-tributario": {
      "command": "node",
      "args": ["C:\\caminho\\para\\mcp-transportation\\dist\\index.js"],
      "disabled": false,
      "autoApprove": [
        "calcular_carga_tributaria_frete",
        "consultar_cronograma_transicao",
        "listar_empresas_cadastradas"
      ]
    }
  }
}
```

> `simular_impacto_rota` não está em `autoApprove` pois faz chamadas HTTP externas — boa prática exigir aprovação manual.

---

## 13. Tratamento de Erros

### Convenção de resposta de erro MCP

Todos os erros retornam no formato padrão do protocolo MCP:

```typescript
{
  isError: true,
  content: [{ type: "text", text: "mensagem de erro" }]
}
```

### Tabela de erros por ferramenta

| Ferramenta | Condição de Erro | Mensagem |
|---|---|---|
| `calcularCargaTributaria` | `valorFrete <= 0` | `"valorFrete deve ser um número positivo"` |
| `calcularCargaTributaria` | `ano` fora de [2026,2033] | `"ano deve estar entre 2026 e 2033"` |
| `calcularCargaTributaria` | `ufOrigem` inválida | `"UF inválida: {ufOrigem}"` |
| `calcularCargaTributaria` | `ufDestino` inválida | `"UF inválida: {ufDestino}"` |
| `consultarCronograma` | `ano` não encontrado no Map | `"ano deve estar entre 2026 e 2033"` |
| `simularImpactoRota` | `valorFrete <= 0` | `"valorFrete deve ser um número positivo"` |
| `simularImpactoRota` | CNPJ com != 14 dígitos | `"CNPJ inválido: {cnpj}"` |
| `simularImpactoRota` | BrasilAPI HTTP error | `"Não foi possível consultar o CNPJ {cnpj}: {status}"` |
| `simularImpactoRota` | BrasilAPI timeout | `"Não foi possível consultar o CNPJ {cnpj}: timeout"` |
| `simularImpactoRota` | Ano corrente fora da transição | `"Simulação indisponível: ano corrente fora do período..."` |
| `listarEmpresas` | `empresas` é null/undefined | `"Banco de dados de empresas indisponível"` |

### Erros fatais no startup

Se os arquivos de dados não puderem ser carregados ou tiverem schema inválido, o processo termina com `process.exit(1)` e uma mensagem descritiva no `stderr`. Isso é intencional — um servidor MCP não deve ficar rodando com dados corrompidos.

---

## 14. Decisões de Design

### 1. Aceitar string como número no Zod

```typescript
valorFrete: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)])
```

LLMs frequentemente serializam números como strings nas chamadas de ferramentas MCP. Aceitar ambos evita erros desnecessários para o usuário final.

### 2. Map O(1) para cronograma

Em vez de `array.find(e => e.ano === ano)` (O(n)), o cronograma é pré-processado em `Map<number, CronogramaEntry>` no startup. Com apenas 8 entradas o ganho é mínimo, mas a prática é correta e escalável.

### 3. Injeção de dependência em `simularImpactoRota`

A função `fetchCnpj` é injetada como parâmetro em vez de importada diretamente. Isso torna a tool 100% testável sem interceptar chamadas HTTP reais.

### 4. ISS excluído do `totalAntigoRegime` na calculadora de frete

O ISS é um tributo municipal que **não incide** sobre transporte interestadual de cargas (apenas sobre frete dentro do mesmo município). Incluí-lo seria tecnicamente incorreto.

### 5. Dados de empresa em JSON em vez de banco de dados

Para um projeto de estudo que replica o padrão do sistema SCTEC (que usa LocalStorage), JSON estático é a escolha mais simples e portátil. Futuras versões podem substituir por SQLite ou uma API REST do SCTEC backend.

### 6. `process.exit(1)` no startup vs. lançar exceção

O MCP server precisa estar completamente operacional antes de aceitar conexões. Dados corrompidos ou ausentes não são uma condição recuperável — terminar o processo com mensagem clara é mais seguro do que servir resultados incorretos.

---

## 15. Extensibilidade

### Adicionar alíquotas diferenciadas por NCM

Em `src/tools/calcularCargaTributaria.ts`, expanda o objeto `ncmRates`:

```typescript
const ncmRates: Record<string, Pick<CronogramaEntry, "ibs" | "cbs" | "icms" | "pis" | "cofins">> = {
  "01012100": { ibs: 5.0, cbs: 3.0, icms: 7.0, pis: 0.65, cofins: 3.0 },
  // adicione outros NCMs aqui
};
```

### Adicionar uma nova tool MCP

1. Crie `src/tools/minhaTool.ts` com schema Zod e handler puro
2. Importe em `src/index.ts`
3. Registre com `server.tool("nome_da_tool", "descrição", schema.shape, handler)`
4. Adicione testes em `src/__tests__/tools/`

### Conectar ao backend real do SCTEC

Substitua `empresas.json` por uma chamada ao endpoint REST do SCTEC:

```typescript
// No startup (index.ts), troque a leitura do arquivo por:
const empresas = await fetch("https://sctec.api/empresas").then(r => r.json());
```

### Suporte a frete municipal (ISS)

Para incluir o ISS no cálculo de fretes intramunicipal, adicione um parâmetro `tipoFrete: "interestadual" | "municipal"` ao schema de `calcularCargaTributaria` e ajuste o cálculo do `totalAntigoRegime` conforme o tipo.

---

*Documentação gerada em julho de 2026 — mcp-frete-tributario v1.0.0*
