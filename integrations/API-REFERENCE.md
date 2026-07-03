# API Reference — mcp-frete-tributario REST API

> Referência técnica completa dos endpoints. Base URL: `http://localhost:3001`

---

## Sumário de endpoints

| Método | Endpoint | Descrição | Autenticação |
|---|---|---|---|
| GET | `/health` | Status do servidor | Não |
| POST | `/calcular-carga` | Cálculo tributário completo | Não |
| GET | `/cronograma/:ano` | Alíquotas por ano | Não |
| POST | `/simular-rota` | Impacto por CNPJ | Não |
| GET | `/empresas` | Lista de empresas | Não |

Todos os endpoints retornam `Content-Type: application/json`.

---

## Códigos de resposta HTTP

| Código | Significado |
|---|---|
| `200` | Sucesso |
| `400` | Erro de validação — campo inválido ou fora do range |
| `404` | Recurso não encontrado (ex: ano não cadastrado) |
| `500` | Erro interno — geralmente BrasilAPI indisponível |

---

## GET /health

Verifica se o servidor está operacional. Use para monitoramento e health check.

### Response 200
```json
{
  "status": "ok",
  "servidor": "mcp-frete-tributario REST API",
  "versao": "1.0.0",
  "timestamp": "2026-07-02T14:30:00.000Z",
  "anosDisponiveis": [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]
}
```

---

## POST /calcular-carga

Calcula a carga tributária de um frete para um ano específico da transição.
Retorna valores para novo regime (IBS+CBS) e antigo regime (ICMS+PIS+COFINS).

### Request
```
POST /calcular-carga
Content-Type: application/json
```

### Body
```json
{
  "valorFrete": 5000.00,
  "ufOrigem":  "SP",
  "ufDestino": "RJ",
  "ano": 2029
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Regras de validação |
|---|---|---|---|
| `valorFrete` | `number` \| `string` | ✅ | Positivo (> 0). Aceita string numérica para compatibilidade com LLMs. |
| `ufOrigem` | `string` | ✅ | Uma das 27 siglas de estado brasileiras válidas (case-insensitive). |
| `ufDestino` | `string` | ✅ | Uma das 27 siglas de estado brasileiras válidas (case-insensitive). |
| `ano` | `number` \| `string` | ✅ | Inteiro entre 2026 e 2033 (inclusive). |

### Response 200
```json
{
  "aliquotaNominal": 11.20,
  "valorIBS":        320.00,
  "valorCBS":        240.00,
  "totalNovoRegime": 560.00,
  "valorICMS":       360.00,
  "valorPIS":         19.50,
  "valorCOFINS":      90.00,
  "totalAntigoRegime": 469.50
}
```

### Campos da resposta

| Campo | Tipo | Descrição | Fórmula |
|---|---|---|---|
| `aliquotaNominal` | number | Soma IBS% + CBS% do ano | — |
| `valorIBS` | number | R$ do IBS | frete × IBS% / 100, arredondado half-up 2 dec. |
| `valorCBS` | number | R$ do CBS | frete × CBS% / 100, arredondado half-up 2 dec. |
| `totalNovoRegime` | number | IBS + CBS em R$ | valorIBS + valorCBS, arredondado |
| `valorICMS` | number | R$ do ICMS | frete × ICMS% / 100, arredondado half-up 2 dec. |
| `valorPIS` | number | R$ do PIS | frete × PIS% / 100, arredondado half-up 2 dec. |
| `valorCOFINS` | number | R$ do COFINS | frete × COFINS% / 100, arredondado half-up 2 dec. |
| `totalAntigoRegime` | number | ICMS+PIS+COFINS em R$ | soma arredondada |

> O ISS não compõe o `totalAntigoRegime` — não incide sobre frete interestadual de cargas.

### Responses de erro 400
```json
{ "error": "Campos obrigatórios: valorFrete, ufOrigem, ufDestino, ano" }
{ "error": "valorFrete deve ser um número positivo" }
{ "error": "ano deve estar entre 2026 e 2033" }
{ "error": "UF inválida: XX" }
```

### Exemplo completo — cálculo para todos os anos

```bash
for ano in 2026 2027 2028 2029 2030 2031 2032 2033; do
  echo "=== $ano ==="
  curl -s -X POST http://localhost:3001/calcular-carga \
    -H "Content-Type: application/json" \
    -d "{\"valorFrete\":10000,\"ufOrigem\":\"SP\",\"ufDestino\":\"RJ\",\"ano\":$ano}" | \
    python3 -m json.tool
done
```

---

## GET /cronograma/:ano

Retorna as alíquotas de todos os tributos para um ano da transição.

### Request
```
GET /cronograma/2028
```

### Parâmetros de rota

| Parâmetro | Tipo | Regras |
|---|---|---|
| `ano` | number | Inteiro entre 2026 e 2033 |

### Response 200
```json
{
  "ano": 2028,
  "icms": 9.6,
  "iss":  1.6,
  "pis":  0.52,
  "cofins": 2.4,
  "ibs":  3.2,
  "cbs":  2.4,
  "totalNovoRegime":    5.6,
  "totalAntigoRegime": 14.12
}
```

### Tabela completa de alíquotas (referência)

| Ano | ICMS | ISS | PIS | COFINS | IBS | CBS | Total Novo | Total Antigo |
|---|---|---|---|---|---|---|---|---|
| 2026 | 12,00 | 2,00 | 0,65 | 3,00 | 0,10 | 0,10 | 0,20 | 17,65 |
| 2027 | 12,00 | 2,00 | 0,65 | 3,00 | 0,10 | 0,10 | 0,20 | 17,65 |
| 2028 | 9,60 | 1,60 | 0,52 | 2,40 | 3,20 | 2,40 | 5,60 | 14,12 |
| 2029 | 7,20 | 1,20 | 0,39 | 1,80 | 6,40 | 4,80 | 11,20 | 10,59 |
| 2030 | 4,80 | 0,80 | 0,26 | 1,20 | 9,60 | 7,20 | 16,80 | 7,06 |
| 2031 | 2,40 | 0,40 | 0,13 | 0,60 | 12,80 | 9,60 | 22,40 | 3,53 |
| 2032 | 0,00 | 0,00 | 0,00 | 0,00 | 16,00 | 12,00 | 28,00 | 0,00 |
| 2033 | 0,00 | 0,00 | 0,00 | 0,00 | 16,00 | 12,00 | 28,00 | 0,00 |

---

## POST /simular-rota

Resolve UFs automaticamente via BrasilAPI e calcula o impacto para o ano corrente.

### Request
```
POST /simular-rota
Content-Type: application/json
```

### Body
```json
{
  "cnpjOrigem":  "12.345.678/0001-95",
  "cnpjDestino": "98.765.432/0001-11",
  "valorFrete":  3500.00
}
```

### Parâmetros

| Campo | Tipo | Regras |
|---|---|---|
| `cnpjOrigem` | string | 14 dígitos (formatação opcional) |
| `cnpjDestino` | string | 14 dígitos (formatação opcional) |
| `valorFrete` | number \| string | Positivo |

> Caracteres não-numéricos (`.`, `/`, `-`) são removidos automaticamente.
> `12.345.678/0001-95` e `12345678000195` são equivalentes.

### Response 200
```json
{
  "ufOrigem":          "SP",
  "ufDestino":         "RJ",
  "razaoSocialOrigem": "Logística Paulista S.A.",
  "razaoSocialDestino":"Rio Frete e Logística Ltda",
  "anoCorrente":       2026,
  "aliquotaNominal":   0.20,
  "valorIBS":          3.50,
  "valorCBS":          3.50,
  "totalNovoRegime":   7.00,
  "valorICMS":         420.00,
  "valorPIS":          22.75,
  "valorCOFINS":       105.00,
  "totalAntigoRegime": 547.75
}
```

### Responses de erro
```json
{ "error": "CNPJ inválido: 1234" }
{ "error": "Não foi possível consultar o CNPJ 12345678000195: 404" }
{ "error": "Não foi possível consultar o CNPJ 12345678000195: timeout" }
{ "error": "Ano corrente fora do período de transição (2026–2033)" }
```

> **Nota:** Este endpoint requer acesso à internet (BrasilAPI).
> Em ambientes isolados, use `/calcular-carga` com as UFs informadas diretamente.

---

## GET /empresas

Lista todas as empresas do banco de dados simulado.

### Request
```
GET /empresas
```

### Response 200
```json
{
  "empresas": [
    { "razaoSocial": "Transportes Sul Ltda",    "cnpj": "12345678000195", "uf": "RS", "valorUltimoFrete": 1850.00 },
    { "razaoSocial": "Logística Paulista S.A.", "cnpj": "98765432000111", "uf": "SP", "valorUltimoFrete": 3200.50 },
    { "razaoSocial": "Fretamento Nordeste Eireli","cnpj":"11223344000188","uf": "BA", "valorUltimoFrete":  980.75 },
    { "razaoSocial": "Cargas do Centro-Oeste ME","cnpj": "55667788000144", "uf": "MT", "valorUltimoFrete": 4500.00 },
    { "razaoSocial": "Amazônia Transportes Ltda","cnpj": "99887766000122", "uf": "AM", "valorUltimoFrete": 7200.30 },
    { "razaoSocial": "Expresso Mineiro S.A.",   "cnpj": "33445566000177", "uf": "MG", "valorUltimoFrete": 2100.00 },
    { "razaoSocial": "Rio Frete e Logística Ltda","cnpj":"77889900000133","uf": "RJ", "valorUltimoFrete": 1450.90 }
  ],
  "totalEmpresas": 7
}
```

---

## UFs válidas

Todas as 27 siglas de estado aceitas pelo sistema:

```
AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO
```

---

*API Reference — mcp-frete-tributario v1.0.0*
*Base URL padrão: http://localhost:3001*
