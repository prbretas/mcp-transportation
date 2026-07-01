# Abordagem 1 — Wrapper HTTP (REST API)

> Expõe as funções do mcp-frete-tributario como endpoints REST para consumo direto pelo Protheus via AdvPL.

## Como funciona

```
Protheus (AdvPL)
    │  HTTP POST /calcular-carga
    ▼
[Express — porta 3001]
    │  importa as funções diretamente
    ▼
calcularCargaTributaria(params, cronogramaMap)
    │
    └─ retorna JSON
```

As funções do MCP são **puras e exportadas** — o servidor HTTP as importa diretamente, sem usar o transporte stdio.

## Pré-requisitos

- Node.js >= 20
- Projeto mcp-frete-tributario já compilado (`npm run build` na raiz)
- Protheus com acesso HTTP (FWHTTPClient ou APISendRequest)

## Instalação

```bash
cd integrations/abordagem-1-rest-api
npm install
npm run build
npm start
```

O servidor sobe na porta **3001** por padrão.

## Endpoints disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/calcular-carga` | Calcula carga tributária completa |
| GET | `/cronograma/:ano` | Retorna alíquotas do ano |
| POST | `/simular-rota` | Simula impacto por CNPJs |
| GET | `/empresas` | Lista empresas cadastradas |
| GET | `/health` | Health check |

## Exemplos de chamada

### POST /calcular-carga

**Request:**
```json
{
  "valorFrete": 5000,
  "ufOrigem": "SP",
  "ufDestino": "RJ",
  "ano": 2029
}
```

**Response:**
```json
{
  "aliquotaNominal": 11.20,
  "valorIBS": 320.00,
  "valorCBS": 240.00,
  "totalNovoRegime": 560.00,
  "valorICMS": 360.00,
  "valorPIS": 19.50,
  "valorCOFINS": 90.00,
  "totalAntigoRegime": 469.50
}
```

### GET /cronograma/2029

**Response:**
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

## Código AdvPL para consumo no Protheus

Veja o arquivo `advpl/ConsultaTributacao.prw` para exemplos completos de:
- Cálculo de carga tributária em CTe
- Consulta de cronograma para relatórios
- Simulação de impacto por rota

## Configuração de porta

Edite `src/config.ts` para mudar a porta padrão:

```typescript
export const PORT = process.env.PORT ?? 3001;
```

Ou use variável de ambiente:
```bash
PORT=8080 npm start
```

## Vantagens desta abordagem

- Integração direta via HTTP — o Protheus já sabe consumir
- Sem necessidade de agente de IA intermediário
- Pode ser deployado como serviço Windows/Linux
- Latência baixa (chamada local ou rede interna)
- Sem custo de API de LLM

## Limitações

- Requer manutenção de um servidor Node.js rodando
- Não tem capacidade de raciocínio — só executa os cálculos
- Precisa de abertura de porta no firewall do ambiente TOTVS
