# mcp-frete-tributario

> Servidor MCP (Model Context Protocol) para simulação e cálculo da carga tributária de frete durante o período de transição da Reforma Tributária brasileira (LC 214/2025 — 2026 a 2033).

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.12-purple)](https://github.com/modelcontextprotocol/typescript-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Sumário

- [O que é este projeto](#o-que-é-este-projeto)
- [Contexto: Reforma Tributária e o Setor de Frete](#contexto-reforma-tributária-e-o-setor-de-frete)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Como usar](#como-usar)
- [Ferramentas MCP disponíveis](#ferramentas-mcp-disponíveis)
- [Dados incluídos](#dados-incluídos)
- [Testes](#testes)
- [Configuração no cliente MCP](#configuração-no-cliente-mcp)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Contribuindo](#contribuindo)

---

## O que é este projeto

Este é um **servidor MCP** escrito em TypeScript que expõe quatro ferramentas de IA para calcular, consultar e simular o impacto tributário de operações de frete no Brasil durante a transição da Reforma Tributária (2026–2033).

Ele pode ser plugado a qualquer **cliente MCP** — Claude Desktop, Cursor, VS Code + Kiro, Amazon Q, ou qualquer agente que suporte o protocolo — e permite que um assistente de IA responda perguntas como:

- *"Qual será a carga tributária de um frete de R$ 5.000 de SP para RJ em 2029?"*
- *"Como os tributos de frete mudam ao longo da transição?"*
- *"Quanto a empresa com CNPJ 12.345.678/0001-95 paga de imposto no frete hoje?"*

---

## Contexto: Reforma Tributária e o Setor de Frete

A **Lei Complementar 214/2025** institui o IBS (Imposto sobre Bens e Serviços) e a CBS (Contribuição sobre Bens e Serviços), que substituirão progressivamente ICMS, ISS, PIS e COFINS entre 2026 e 2033. Para o **transporte de cargas**, isso representa uma das maiores mudanças fiscais das últimas décadas:

| Ano  | ICMS  | ISS  | PIS   | COFINS | IBS    | CBS    |
|------|-------|------|-------|--------|--------|--------|
| 2026 | 12,0% | 2,0% | 0,65% | 3,00%  | 0,10%  | 0,10%  |
| 2027 | 12,0% | 2,0% | 0,65% | 3,00%  | 0,10%  | 0,10%  |
| 2028 | 9,6%  | 1,6% | 0,52% | 2,40%  | 3,20%  | 2,40%  |
| 2029 | 7,2%  | 1,2% | 0,39% | 1,80%  | 6,40%  | 4,80%  |
| 2030 | 4,8%  | 0,8% | 0,26% | 1,20%  | 9,60%  | 7,20%  |
| 2031 | 2,4%  | 0,4% | 0,13% | 0,60%  | 12,80% | 9,60%  |
| 2032 | 0,0%  | 0,0% | 0,00% | 0,00%  | 16,00% | 12,00% |
| 2033 | 0,0%  | 0,0% | 0,00% | 0,00%  | 16,00% | 12,00% |

Este servidor encapsula esse cronograma e permite que agentes de IA raciocinem sobre ele de forma estruturada.

---

## Arquitetura

```
Cliente MCP (Claude Desktop / Cursor / Kiro)
        │  stdio (JSON-RPC)
        ▼
┌─────────────────────────────────────────────┐
│            mcp-frete-tributario             │
│                                             │
│  src/index.ts  ◄── bootstrap & validação   │
│       │                                     │
│  ┌────▼──────────────────────────────────┐  │
│  │            4 Tools MCP                │  │
│  │  calcular_carga_tributaria_frete      │  │
│  │  consultar_cronograma_transicao       │  │
│  │  simular_impacto_rota                 │  │
│  │  listar_empresas_cadastradas          │  │
│  └───────────────────┬───────────────────┘  │
│                      │                      │
│  ┌───────────────────▼───────────────────┐  │
│  │           Camada de dados             │  │
│  │  cronograma-reforma.json (alíquotas)  │  │
│  │  empresas.json (banco simulado)       │  │
│  └───────────────────┬───────────────────┘  │
│                      │                      │
│  ┌───────────────────▼───────────────────┐  │
│  │         Serviço externo               │  │
│  │  BrasilAPI — consulta CNPJ → UF       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

O servidor usa o **transporte stdio** do MCP SDK, o que significa que o cliente MCP o inicializa como subprocesso e se comunica via stdin/stdout com JSON-RPC 2.0.

---

## Pré-requisitos

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0

---

## Instalação

```bash
git clone https://github.com/prbretas/mcp-transportation.git
cd mcp-transportation
npm install
npm run build
```

O script `build` compila o TypeScript para `dist/` e copia os arquivos de dados para `data/`.

---

## Como usar

### 1. Executar diretamente

```bash
npm start
```

O servidor ficará aguardando conexão via stdio. Normalmente você não o executa diretamente — ele é iniciado pelo cliente MCP.

### 2. Desenvolvimento com watch

```bash
npm run dev
```

Compila em modo watch. Reinicie o servidor manualmente após cada rebuild.

### 3. Verificação de tipos

```bash
npm run typecheck
```

---

## Ferramentas MCP disponíveis

### `calcular_carga_tributaria_frete`

Calcula a carga tributária completa de um frete para um ano específico da transição, comparando o novo regime (IBS + CBS) com o antigo (ICMS + PIS + COFINS).

**Parâmetros:**

| Campo       | Tipo             | Obrigatório | Descrição                              |
|-------------|------------------|-------------|----------------------------------------|
| `valorFrete` | `number`        | ✅          | Valor do frete em BRL (deve ser > 0)  |
| `ufOrigem`  | `string` (2 chars) | ✅        | UF de origem (ex: `"SP"`)             |
| `ufDestino` | `string` (2 chars) | ✅        | UF de destino (ex: `"RJ"`)            |
| `ano`       | `number`         | ✅          | Ano da transição (2026 a 2033)        |
| `ncm`       | `string`         | ❌          | Código NCM da mercadoria (futuro)     |

**Exemplo de resposta:**

```json
{
  "aliquotaNominal": 0.20,
  "valorIBS": 1.00,
  "valorCBS": 1.00,
  "totalNovoRegime": 2.00,
  "valorICMS": 120.00,
  "valorPIS": 6.50,
  "valorCOFINS": 30.00,
  "totalAntigoRegime": 156.50
}
```

---

### `consultar_cronograma_transicao`

Retorna as alíquotas de todos os tributos para um ano específico da transição, com totais calculados.

**Parâmetros:**

| Campo | Tipo     | Obrigatório | Descrição                       |
|-------|----------|-------------|---------------------------------|
| `ano` | `number` | ✅          | Ano da transição (2026 a 2033) |

**Exemplo de resposta:**

```json
{
  "ano": 2029,
  "icms": 7.2,
  "iss": 1.2,
  "pis": 0.39,
  "cofins": 1.80,
  "ibs": 6.40,
  "cbs": 4.80,
  "totalNovoRegime": 11.20,
  "totalAntigoRegime": 10.59
}
```

---

### `simular_impacto_rota`

Simula o impacto tributário de uma rota de frete a partir dos CNPJs de origem e destino. As UFs são resolvidas automaticamente via **BrasilAPI** — nenhum dado de UF precisa ser informado manualmente.

**Parâmetros:**

| Campo          | Tipo     | Obrigatório | Descrição                              |
|----------------|----------|-------------|----------------------------------------|
| `cnpjOrigem`   | `string` | ✅          | CNPJ da empresa de origem (14 dígitos) |
| `cnpjDestino`  | `string` | ✅          | CNPJ da empresa de destino             |
| `valorFrete`   | `number` | ✅          | Valor do frete em BRL                  |

**Exemplo de resposta:**

```json
{
  "ufOrigem": "SP",
  "ufDestino": "RJ",
  "razaoSocialOrigem": "Logística Paulista S.A.",
  "razaoSocialDestino": "Rio Frete e Logística Ltda",
  "anoCorrente": 2026,
  "aliquotaNominal": 0.20,
  "valorIBS": 10.00,
  "valorCBS": 10.00,
  "totalNovoRegime": 20.00,
  "valorICMS": 1200.00,
  "valorPIS": 65.00,
  "valorCOFINS": 300.00,
  "totalAntigoRegime": 1565.00
}
```

> **Nota:** Esta ferramenta faz chamadas reais à BrasilAPI. CNPJs devem ser de empresas existentes e a API deve estar acessível.

---

### `listar_empresas_cadastradas`

Lista todas as empresas no banco de dados simulado. Não recebe parâmetros.

**Exemplo de resposta:**

```json
{
  "empresas": [
    {
      "razaoSocial": "Transportes Sul Ltda",
      "cnpj": "12345678000195",
      "uf": "RS",
      "valorUltimoFrete": 1850.00
    }
  ],
  "totalEmpresas": 7
}
```

---

## Dados incluídos

### `cronograma-reforma.json`

Tabela com as alíquotas reais de cada tributo para os anos de 2026 a 2033, baseada na LC 214/2025 e nas estimativas do Ministério da Fazenda.

### `empresas.json`

Banco de dados simulado com 7 empresas transportadoras distribuídas pelos estados brasileiros (RS, SP, BA, MT, AM, MG, RJ), no mesmo formato do sistema SCTEC.

---

## Testes

O projeto usa **Vitest** com testes unitários (example-based) e **property-based tests** com **fast-check**.

```bash
# Rodar todos os testes
npm test

# Modo watch
npm run test:watch
```

Cobertura de testes:

| Arquivo                        | Testes unitários | Property-based |
|-------------------------------|-----------------|----------------|
| `calcularCargaTributaria`     | ✅              | ✅             |
| `consultarCronograma`         | ✅              | ✅             |
| `simularImpactoRota`          | ✅              | ✅             |
| `listarEmpresas`              | ✅              | ✅             |
| `utils`                       | ✅              | —              |
| `index` (bootstrap)           | ✅              | —              |

---

## Configuração no cliente MCP

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "frete-tributario": {
      "command": "node",
      "args": ["/caminho/absoluto/para/mcp-transportation/dist/index.js"]
    }
  }
}
```

### Kiro / Cursor (`mcp.json`)

```json
{
  "mcpServers": {
    "frete-tributario": {
      "command": "node",
      "args": ["/caminho/absoluto/para/mcp-transportation/dist/index.js"]
    }
  }
}
```

> Substitua `/caminho/absoluto/para/mcp-transportation` pelo caminho real no seu sistema. No Windows, use barras duplas ou barras normais: `C:\\Users\\seu-usuario\\...`.

---

## Estrutura de pastas

```
mcp-transportation/
├── src/
│   ├── index.ts                    # Bootstrap: carrega dados, registra tools, inicia servidor
│   ├── types.ts                    # Interfaces TypeScript compartilhadas
│   ├── utils.ts                    # halfUp() e UF_VALIDAS
│   ├── tools/
│   │   ├── calcularCargaTributaria.ts
│   │   ├── consultarCronograma.ts
│   │   ├── simularImpactoRota.ts
│   │   └── listarEmpresas.ts
│   ├── services/
│   │   └── brasilApiService.ts     # Integração com BrasilAPI (CNPJ → UF)
│   ├── data/
│   │   ├── cronograma-reforma.json
│   │   └── empresas.json
│   └── __tests__/
│       ├── fixtures/               # Dados de fixture para testes
│       ├── server/                 # Testes de bootstrap
│       └── tools/                  # Testes por ferramenta
├── data/                           # Cópia dos JSONs gerada pelo build (usada em runtime)
├── dist/                           # JavaScript compilado
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça commit das mudanças: `git commit -m "feat: descrição"`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## Origem do projeto

Este projeto foi desenvolvido como projeto de estudo durante uma aula sobre agentes de IA, com foco em **Model Context Protocol (MCP)**, **TypeScript**, e aplicação real à **Reforma Tributária brasileira**. O domínio de negócio (tributação de frete, IBS/CBS, cronograma de transição) é diretamente relevante para sistemas TMS como o Protheus da TOTVS.

---

*Documentação gerada em julho de 2026.*
