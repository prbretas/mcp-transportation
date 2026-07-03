# Guia de Integração — mcp-frete-tributario com TOTVS Protheus

> **Para desenvolvedores TOTVS e equipes de TMS**
> Este guia explica como conectar o mcp-frete-tributario ao Protheus
> e a qualquer outro sistema, com exemplos práticos e código pronto.

---

## Índice

1. [Por que integrar?](#1-por-que-integrar)
2. [Entendendo o projeto](#2-entendendo-o-projeto)
3. [A API REST — o ponto central de integração](#3-a-api-rest--o-ponto-central-de-integração)
4. [Referência completa dos endpoints](#4-referência-completa-dos-endpoints)
5. [Integração com Protheus via AdvPL](#5-integração-com-protheus-via-advpl)
6. [Integração com outros sistemas](#6-integração-com-outros-sistemas)
7. [Deploy em produção](#7-deploy-em-produção)
8. [Segurança e boas práticas](#8-segurança-e-boas-práticas)
9. [Troubleshooting](#9-troubleshooting)
10. [Roadmap e extensibilidade](#10-roadmap-e-extensibilidade)

---

## 1. Por que integrar?

A **Reforma Tributária (LC 214/2025)** muda completamente o cálculo de tributos sobre frete
entre 2026 e 2033. IBS e CBS entram progressivamente enquanto ICMS, PIS e COFINS saem.

Para o Protheus TMS e GFE, isso significa:

- Tabelas de frete precisam refletir a carga tributária do ano correto da transição
- CTes emitidos em 2028 têm alíquotas diferentes de CTes de 2026
- Relatórios financeiros precisam mostrar o regime antigo E o novo lado a lado
- Analistas precisam simular impacto antes de fechar contratos com transportadoras

O **mcp-frete-tributario** resolve esses cálculos de forma centralizada e expõe
via API REST para que qualquer sistema consuma — sem duplicar a lógica em cada ponto.

---

## 2. Entendendo o projeto

### O que é o MCP?

MCP (Model Context Protocol) é um protocolo aberto criado pela Anthropic que permite
que assistentes de IA (Claude, Cursor, Kiro) usem ferramentas externas de forma padronizada.

**Para desenvolvedores:** pense no MCP como uma camada de abstração entre a IA e suas funções de negócio.

```
Assistente de IA (Claude)
    │  "Calcule o frete SP→RJ em 2029"
    ▼
[MCP Server — stdio/JSON-RPC]
    │  chama calcular_carga_tributaria_frete(...)
    ▼
[Lógica de negócio TypeScript]
    │
    └─ retorna CargaTributaria { valorIBS, valorCBS, ... }
```

### Por que a API REST é a melhor forma de integrar com Protheus?

O transporte padrão do MCP é **stdio** (processo filho comunicando via stdin/stdout).
O Protheus não consegue se comunicar diretamente com um processo stdio.

A solução é uma **camada HTTP** na frente — um servidor Express que expõe
os mesmos cálculos como endpoints REST que o Protheus já sabe consumir via `FWHTTPClient`.

```
Protheus AdvPL          Node.js REST API        Lógica MCP
─────────────           ──────────────────      ───────────────────────
FWHTTPClient  ───POST──► Express :3001    ──────► calcularCargaTributaria()
              ◄──JSON──  /calcular-carga  ◄──────  { valorIBS, valorCBS, ... }
```

---

## 3. A API REST — o ponto central de integração

A API REST está em `integrations/abordagem-1-rest-api/`.
É um servidor **Express** em TypeScript que importa as funções de cálculo diretamente
e as expõe como endpoints HTTP.

### Instalação rápida

```bash
# 1. Clone o repositório
git clone https://github.com/prbretas/mcp-transportation.git
cd mcp-transportation

# 2. Build do projeto principal (gera data/ com os JSONs)
npm install
npm run build

# 3. Build da API REST
cd integrations/abordagem-1-rest-api
npm install
npm run build

# 4. Inicia o servidor
npm start
# → Servidor rodando em http://localhost:3001
```

### Verificar se está no ar

```bash
curl http://localhost:3001/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "servidor": "mcp-frete-tributario REST API",
  "versao": "1.0.0",
  "anosDisponiveis": [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]
}
```

---

## 4. Referência completa dos endpoints

### `GET /health`

Verifica se o servidor está operacional. Use para monitoramento e health check do EAI.

**Response 200:**
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

### `POST /calcular-carga`

**O endpoint mais importante.** Calcula a carga tributária completa de um frete,
retornando valores para o novo regime (IBS+CBS) e antigo regime (ICMS+PIS+COFINS).

**Request body:**
```json
{
  "valorFrete": 5000.00,
  "ufOrigem": "SP",
  "ufDestino": "RJ",
  "ano": 2029
}
```

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `valorFrete` | number ou string numérica | ✅ | Deve ser > 0 |
| `ufOrigem` | string | ✅ | Uma das 27 UFs válidas |
| `ufDestino` | string | ✅ | Uma das 27 UFs válidas |
| `ano` | number ou string numérica | ✅ | Entre 2026 e 2033 |

**Response 200 — sucesso:**
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

**Response 400 — erro de validação:**
```json
{ "error": "UF inválida: XX" }
```

**Descrição dos campos de resposta:**

| Campo | Descrição | Fórmula |
|---|---|---|
| `aliquotaNominal` | Alíquota nominal do novo regime (%) | IBS% + CBS% |
| `valorIBS` | Valor do IBS em R$ | frete × IBS% / 100 |
| `valorCBS` | Valor do CBS em R$ | frete × CBS% / 100 |
| `totalNovoRegime` | Total IBS + CBS em R$ | valorIBS + valorCBS |
| `valorICMS` | Valor do ICMS em R$ | frete × ICMS% / 100 |
| `valorPIS` | Valor do PIS em R$ | frete × PIS% / 100 |
| `valorCOFINS` | Valor do COFINS em R$ | frete × COFINS% / 100 |
| `totalAntigoRegime` | Total ICMS+PIS+COFINS em R$ | soma dos três |

> **Nota sobre ISS:** O ISS não compõe o `totalAntigoRegime` pois não incide
> sobre transporte interestadual de cargas — apenas frete municipal.

---

### `GET /cronograma/:ano`

Retorna as alíquotas de todos os tributos para um ano da transição.
Útil para relatórios e telas informativas no Protheus.

**Exemplo:** `GET /cronograma/2028`

**Response 200:**
```json
{
  "ano": 2028,
  "icms": 9.6,
  "iss": 1.6,
  "pis": 0.52,
  "cofins": 2.4,
  "ibs": 3.2,
  "cbs": 2.4,
  "totalNovoRegime": 5.6,
  "totalAntigoRegime": 14.12
}
```

**Response 400:**
```json
{ "error": "ano deve estar entre 2026 e 2033" }
```

---

### `POST /simular-rota`

Resolve as UFs automaticamente via **BrasilAPI** a partir dos CNPJs de origem e destino,
depois calcula a carga tributária para o **ano corrente**.

**Request body:**
```json
{
  "cnpjOrigem": "12345678000195",
  "cnpjDestino": "98765432000111",
  "valorFrete": 3500.00
}
```

> CNPJs podem ser enviados com ou sem formatação. `12.345.678/0001-95` e `12345678000195` são aceitos.

**Response 200:**
```json
{
  "ufOrigem": "SP",
  "ufDestino": "RJ",
  "razaoSocialOrigem": "Logística Paulista S.A.",
  "razaoSocialDestino": "Rio Frete e Logística Ltda",
  "anoCorrente": 2026,
  "aliquotaNominal": 0.20,
  "valorIBS": 3.50,
  "valorCBS": 3.50,
  "totalNovoRegime": 7.00,
  "valorICMS": 420.00,
  "valorPIS": 22.75,
  "valorCOFINS": 105.00,
  "totalAntigoRegime": 547.75
}
```

**Possíveis erros:**
```json
{ "error": "CNPJ inválido: 1234" }
{ "error": "Não foi possível consultar o CNPJ 12345678000195: 404" }
{ "error": "Ano corrente fora do período de transição (2026–2033)" }
```

> **Dependência externa:** Este endpoint chama a BrasilAPI (`brasilapi.com.br`).
> Em ambientes sem acesso à internet, use `/calcular-carga` com as UFs informadas diretamente.

---

### `GET /empresas`

Lista todas as empresas do banco de dados simulado. Sem parâmetros.

**Response 200:**
```json
{
  "empresas": [
    { "razaoSocial": "Transportes Sul Ltda", "cnpj": "12345678000195", "uf": "RS", "valorUltimoFrete": 1850.00 },
    { "razaoSocial": "Logística Paulista S.A.", "cnpj": "98765432000111", "uf": "SP", "valorUltimoFrete": 3200.50 }
  ],
  "totalEmpresas": 7
}
```

---

## 5. Integração com Protheus via AdvPL

### Pré-requisitos no Protheus

- Protheus P12 12.1.2210 ou superior
- Classe `FWHTTPClient` disponível (ou `APISendRequest` para versões mais antigas)
- Servidor REST acessível na rede (mesmo host ou rede interna)

### Função base de chamada HTTP

```advpl
/*
 * Função utilitária central para chamar a API REST do mcp-frete-tributario.
 * Todas as funções específicas chamam esta.
 */
Static Function MCPRequest(cMetodo, cEndpoint, cBody)
  Local cBaseUrl  := SuperGetMV("MV_MCPURL", .F., "http://localhost:3001")
  Local nTimeout  := Val(SuperGetMV("MV_MCPTOUT", .F., "10000"))
  Local oHttp     := FWHTTPClient():New()
  Local cResposta := ""

  oHttp:setURL(cBaseUrl + cEndpoint)
  oHttp:setTimeout(nTimeout)
  oHttp:addHeader("Content-Type", "application/json")
  oHttp:addHeader("Accept", "application/json")

  If cMetodo == "POST"
    oHttp:Post(cBody)
  Else
    oHttp:Get()
  EndIf

  cResposta := oHttp:getBody()
Return cResposta
```

### Cenário 1 — Cálculo de IBS/CBS no momento de emissão do CTe

```advpl
/*
 * Ponto de entrada: MT140OK (confirmação do CTe)
 * Calcula e exibe a carga tributária do novo regime
 */
User Function MT140OK()
  Local cBody     := ""
  Local cResposta := ""
  Local oJson     := JsonObject():New()
  Local nIBS      := 0
  Local nCBS      := 0
  Local nNovoTotal:= 0
  Local nAntTotal := 0

  // Monta payload com dados do CTe em contexto
  cBody := '{'
  cBody +=   '"valorFrete":' + cValToChar(CT2->CT2_VLFRETE) + ','
  cBody +=   '"ufOrigem":"'  + AllTrim(CT2->CT2_DESTORI) + '",'
  cBody +=   '"ufDestino":"' + AllTrim(CT2->CT2_DESTDES) + '",'
  cBody +=   '"ano":'        + cValToChar(Year(CT2->CT2_DTEMISS))
  cBody += '}'

  cResposta := MCPRequest("POST", "/calcular-carga", cBody)

  // Verifica erro
  If '"error"' $ cResposta
    MsgAlert("MCP: " + cResposta, "Aviso Tributação")
    Return .T.  // não bloqueia o processo
  EndIf

  // Parse do JSON
  oJson:FromJson(cResposta)
  nIBS       := oJson:GetJsonObject("valorIBS")
  nCBS       := oJson:GetJsonObject("valorCBS")
  nNovoTotal := oJson:GetJsonObject("totalNovoRegime")
  nAntTotal  := oJson:GetJsonObject("totalAntigoRegime")

  // Exibe resumo para o operador
  MsgInfo("Carga Tributária — Novo Regime (IBS+CBS)" + CRLF + ;
          "IBS:  R$ " + Transform(nIBS,  "@E 9,999.99") + CRLF + ;
          "CBS:  R$ " + Transform(nCBS,  "@E 9,999.99") + CRLF + ;
          "Total novo regime:  R$ " + Transform(nNovoTotal, "@E 9,999.99") + CRLF + ;
          "Total antigo regime: R$ " + Transform(nAntTotal,  "@E 9,999.99"), ;
          "Reforma Tributária")

Return .T.
```

### Cenário 2 — Gravação nos campos customizados do CTe

```advpl
/*
 * Versão que grava os valores calculados em campos do CTe
 * Requer execução prévia de U_MCPFreteCampos() para criar os campos
 */
User Function GravarIBSCTe()
  Local cBody     := ""
  Local cResposta := ""
  Local oJson     := JsonObject():New()

  cBody := '{"valorFrete":' + cValToChar(CT2->CT2_VLFRETE) + ','
  cBody +=  '"ufOrigem":"'  + AllTrim(CT2->CT2_DESTORI) + '",'
  cBody +=  '"ufDestino":"' + AllTrim(CT2->CT2_DESTDES) + '",'
  cBody +=  '"ano":'        + cValToChar(Year(CT2->CT2_DTEMISS)) + '}'

  cResposta := MCPRequest("POST", "/calcular-carga", cBody)

  If '"error"' $ cResposta .Or. Empty(cResposta)
    ConOut("[MCP] Erro ao calcular carga: " + cResposta)
    Return .F.
  EndIf

  oJson:FromJson(cResposta)

  If CT2->(RLock())
    CT2->CT2_VIBS  := oJson:GetJsonObject("valorIBS")
    CT2->CT2_VCBS  := oJson:GetJsonObject("valorCBS")
    CT2->CT2_VNOVO := oJson:GetJsonObject("totalNovoRegime")
    CT2->CT2_VANT  := oJson:GetJsonObject("totalAntigoRegime")
    MsUnlock()
    ConOut("[MCP] IBS/CBS gravados no CTe " + CT2->CT2_NUM)
  EndIf

Return .T.
```

### Cenário 3 — Relatório de cronograma tributário

```advpl
/*
 * Gera um relatório com o cronograma completo 2026-2033
 * para um valor de frete referência fornecido pelo usuário
 */
User Function RelatCronograma()
  Local nFrete    := 0
  Local nAno      := 0
  Local cResposta := ""
  Local oJson     := JsonObject():New()
  Local cLinha    := ""

  nFrete := GetNumber("Valor de frete referência (R$):", 0, 99999.99)
  If nFrete <= 0
    Return
  EndIf

  // Cabeçalho
  cLinha := PadR("ANO", 6) + PadR("IBS%", 8) + PadR("CBS%", 8) + ;
            PadR("ICMS%", 8) + PadR("NOVO(R$)", 14) + PadR("ANTIGO(R$)", 14)
  ConOut(cLinha)
  ConOut(Replicate("-", 58))

  For nAno := 2026 To 2033
    cResposta := MCPRequest("GET", "/cronograma/" + cValToChar(nAno), "")
    oJson:FromJson(cResposta)

    // Calcula os valores para o frete referência
    Local nNovoR  := nFrete * oJson:GetJsonObject("totalNovoRegime")  / 100
    Local nAntigoR:= nFrete * oJson:GetJsonObject("totalAntigoRegime") / 100

    cLinha := PadR(cValToChar(nAno), 6) + ;
              PadR(Str(oJson:GetJsonObject("ibs"),   5, 2), 8) + ;
              PadR(Str(oJson:GetJsonObject("cbs"),   5, 2), 8) + ;
              PadR(Str(oJson:GetJsonObject("icms"),  5, 2), 8) + ;
              PadR(Str(nNovoR,  9, 2), 14) + ;
              PadR(Str(nAntigoR, 9, 2), 14)
    ConOut(cLinha)
  Next nAno

Return
```

### Cenário 4 — Verificação de alíquota de um CTe recebido

```advpl
/*
 * Audita um CTe recebido — verifica se o ICMS destacado está correto
 * conforme o cronograma da Reforma Tributária
 */
User Function AuditarCTe(cNumCTe)
  Local cResposta  := ""
  Local oJson      := JsonObject():New()
  Local nICMSEsper := 0
  Local nICMSDoc   := 0
  Local nDifer     := 0

  // Posiciona no CTe
  CT2->(dbSetOrder(1))
  If !CT2->(dbSeek(xFilial("CT2") + cNumCTe))
    MsgStop("CTe não encontrado: " + cNumCTe)
    Return
  EndIf

  // Busca alíquotas do ano do CTe
  cResposta := MCPRequest("GET", "/cronograma/" + cValToChar(Year(CT2->CT2_DTEMISS)), "")
  oJson:FromJson(cResposta)

  // Calcula ICMS esperado
  nICMSEsper := CT2->CT2_VLFRETE * oJson:GetJsonObject("icms") / 100
  nICMSDoc   := CT2->CT2_VICMS  // campo do ICMS no CTe

  nDifer := Abs(nICMSEsper - nICMSDoc)

  If nDifer > 0.05  // tolerância de R$ 0,05 para arredondamento
    MsgAlert("Divergência no CTe " + cNumCTe + "!" + CRLF + ;
             "ICMS no documento:  R$ " + Transform(nICMSDoc,   "@E 9,999.99") + CRLF + ;
             "ICMS esperado MCP:  R$ " + Transform(nICMSEsper, "@E 9,999.99") + CRLF + ;
             "Diferença:          R$ " + Transform(nDifer,     "@E 9,999.99"), ;
             "Auditoria Tributária")
  Else
    MsgInfo("CTe " + cNumCTe + " — ICMS correto (R$ " + Transform(nICMSDoc, "@E 9,999.99") + ")", ;
            "Auditoria OK")
  EndIf

Return
```

---

## 6. Integração com outros sistemas

### Qualquer sistema com HTTP (curl, Python, Java, C#)

O endpoint aceita qualquer cliente HTTP padrão.

**Python:**
```python
import requests

resp = requests.post("http://localhost:3001/calcular-carga", json={
    "valorFrete": 5000,
    "ufOrigem": "SP",
    "ufDestino": "AM",
    "ano": 2029
})
data = resp.json()
print(f"IBS: R$ {data['valorIBS']:.2f}")
print(f"CBS: R$ {data['valorCBS']:.2f}")
print(f"Total novo regime: R$ {data['totalNovoRegime']:.2f}")
```

**Java (HttpClient — Java 11+):**
```java
var client = HttpClient.newHttpClient();
var body = """
    {"valorFrete":5000,"ufOrigem":"SP","ufDestino":"AM","ano":2029}
    """;
var request = HttpRequest.newBuilder()
    .uri(URI.create("http://localhost:3001/calcular-carga"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();
var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

**C# (.NET HttpClient):**
```csharp
var client = new HttpClient();
var payload = new {
    valorFrete = 5000,
    ufOrigem = "SP",
    ufDestino = "AM",
    ano = 2029
};
var json = JsonSerializer.Serialize(payload);
var content = new StringContent(json, Encoding.UTF8, "application/json");
var response = await client.PostAsync("http://localhost:3001/calcular-carga", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);
```

**Postman / Insomnia:**
```
POST http://localhost:3001/calcular-carga
Content-Type: application/json

{
  "valorFrete": 5000,
  "ufOrigem": "SP",
  "ufDestino": "AM",
  "ano": 2029
}
```

---

## 7. Deploy em produção

### Opção A — Serviço Windows (recomendado para ambientes TOTVS)

Use o **node-windows** para registrar o servidor como serviço Windows:

```bash
npm install -g node-windows
```

Crie `install-service.js` na pasta `abordagem-1-rest-api`:
```javascript
const { Service } = require('node-windows');

const svc = new Service({
  name: 'MCP Frete Tributario',
  description: 'API REST para calculo tributario de frete - Reforma Tributaria',
  script: 'C:\\caminho\\para\\mcp-transportation\\integrations\\abordagem-1-rest-api\\dist\\server.js',
  env: [{ name: 'PORT', value: '3001' }]
});

svc.on('install', () => svc.start());
svc.install();
```

```bash
node install-service.js
# Serviço aparece no services.msc como "MCP Frete Tributario"
```

### Opção B — PM2 (Linux/Windows)

```bash
npm install -g pm2
pm2 start dist/server.js --name "mcp-frete" --env production
pm2 startup    # configura para iniciar com o SO
pm2 save       # salva a configuração
```

### Variáveis de ambiente para produção

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta do servidor HTTP |
| `DATA_DIR` | `../../data` | Caminho para os JSONs de dados |

```bash
# Windows (PowerShell)
$env:PORT = "3001"
$env:DATA_DIR = "C:\mcp-transportation\data"
node dist\server.js
```

---

## 8. Segurança e boas práticas

### Rede interna apenas

O servidor REST **não deve ser exposto à internet**. Coloque-o na mesma rede do servidor Protheus
e restrinja o acesso via firewall para a faixa de IPs do ambiente TOTVS.

### Adicionar autenticação básica (opcional)

Para ambientes que exigem autenticação, adicione um middleware em `src/server.ts`:

```typescript
// Middleware de autenticação básica
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  const expected = "Basic " + Buffer.from("totvs:senha123").toString("base64");
  if (auth !== expected) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  next();
});
```

No AdvPL, adicione o header na requisição:
```advpl
oHttp:addHeader("Authorization", "Basic " + Encode64("totvs:senha123"))
```

### CORS (se consumir de front-end web)

```typescript
import cors from "cors";
app.use(cors({ origin: "http://seu-frontend.totvs.com" }));
```

---

## 9. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `FWHTTPClient` retorna vazio | Servidor fora do ar | Verificar `http://localhost:3001/health` |
| `Connection refused` | Porta errada ou firewall | Verificar `PORT` e regras de firewall |
| `{ "error": "UF inválida" }` | UF com espaços ou lowercase | `AllTrim(cUF)` e `.toUpperCase()` no envio |
| `{ "error": "ano deve estar..." }` | CTe com data fora de 2026–2033 | Verificar `CT2->CT2_DTEMISS` |
| Servidor Node.js não inicia | `data/` não encontrado | Rodar `npm run build` na raiz do projeto |
| Timeout no AdvPL | Servidor lento ou sobrecarga | Aumentar `MV_MCPTOUT` para 15000 |

### Testar a API manualmente antes do AdvPL

Sempre teste com `curl` ou Postman antes de integrar ao AdvPL:

```bash
# Health check
curl http://localhost:3001/health

# Cálculo básico
curl -X POST http://localhost:3001/calcular-carga \
  -H "Content-Type: application/json" \
  -d "{\"valorFrete\":1000,\"ufOrigem\":\"SP\",\"ufDestino\":\"RJ\",\"ano\":2026}"

# Cronograma
curl http://localhost:3001/cronograma/2029
```

---

## 10. Roadmap e extensibilidade

### O que pode ser adicionado

| Feature | Como implementar | Complexidade |
|---|---|---|
| Alíquotas diferenciadas por NCM | Expandir `ncmRates` em `calcularCargaTributaria.ts` | Baixa |
| Banco de dados real (SQL Server) | Substituir `empresas.json` por query via `tedious` | Média |
| Autenticação JWT | Adicionar middleware `jsonwebtoken` no Express | Média |
| Cache de respostas | Adicionar `node-cache` para `/cronograma/:ano` | Baixa |
| Conectar ao Protheus via REST TOTVS | Usar a API REST do Protheus para buscar CTes reais | Alta |
| Webhook para notificar o Protheus | Adicionar endpoint `POST /webhook` no Protheus | Alta |

### Contribuindo

1. Fork: `https://github.com/prbretas/mcp-transportation`
2. Branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m "feat: descrição"`
4. PR: abra um Pull Request explicando o que foi adicionado

---

*Documentação criada por Philippe Bretas — julho de 2026*
*Projeto: mcp-frete-tributario v1.0.0*
*GitHub: https://github.com/prbretas/mcp-transportation*
