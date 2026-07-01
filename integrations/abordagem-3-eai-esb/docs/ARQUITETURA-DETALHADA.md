# Arquitetura Detalhada — Abordagem 3 (EAI/ESB)

## Visão geral do fluxo

```
┌──────────────────────────────────────────────────────────────────┐
│                    PROTHEUS TMS / GFE                            │
│                                                                  │
│  Usuário lança um CTe ou aprova tabela de frete                  │
│       │                                                          │
│       ▼                                                          │
│  [Ponto de Entrada — ex: MT140OK]                                │
│       │  ExecBlock("MCPFreteAdapter")                            │
│       ▼                                                          │
│  [MCPFreteAdapter.prw]                                           │
│    1. Lê campos do CTe (valor, UF orig, UF dest, data)           │
│    2. Determina o ano da transição (baseado na data do CTe)      │
│    3. Monta o payload JSON                                        │
│    4. Chama EAI_SendRequest("MCPFRETE", "/calcular-carga", body) │
│       │                                                          │
└───────│──────────────────────────────────────────────────────────┘
        │  HTTP POST (rede interna)
        ▼
┌──────────────────────────────────────────────────────────────────┐
│              mcp-frete-tributario REST API                       │
│              (Node.js — porta 3001)                              │
│                                                                  │
│  Recebe: { valorFrete, ufOrigem, ufDestino, ano }                │
│  Calcula: IBS, CBS, ICMS, PIS, COFINS                            │
│  Retorna: CargaTributaria JSON                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
        │  Resposta JSON
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PROTHEUS TMS / GFE                            │
│                                                                  │
│  [MCPFreteAdapter.prw — continuação]                             │
│    5. Deserializa o JSON de resposta                             │
│    6. Grava valores nos campos customizados do CTe:              │
│       CT2_VIBS, CT2_VCBS, CT2_VNOVO, CT2_VANT                   │
│    7. Registra transação no log do EAI                           │
│    8. Retorna controle ao ponto de entrada                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. MCPFreteAdapter.prw

Adapter principal. Chamado pelo ponto de entrada do TMS.

Responsabilidades:
- Ler os dados do CTe atual (via aliases de tabela)
- Determinar o ano correto da transição
- Montar e enviar a requisição HTTP
- Tratar erros (timeout, HTTP 4xx/5xx)
- Gravar o resultado nos campos customizados

### 2. MCPFreteSetup.prw

Executado uma vez durante a implantação.

Responsabilidades:
- Cadastrar o serviço `MCPFRETE` no EAI
- Verificar conectividade com o endpoint `/health`
- Registrar parâmetros no SX6 (MV_MCPURL, MV_MCPTOUT)

### 3. MCPFreteCampos.prw

Executado uma vez durante a implantação.

Responsabilidades:
- Criar os campos customizados na tabela CT2 (CTe)
- Criar índices necessários
- Atualizar o dicionário de dados (SX3)

## Modelo de dados dos campos customizados

```
CT2 (Conhecimento de Transporte Eletrônico)
├── CT2_FILIAL   — filial (padrão TOTVS)
├── CT2_NUM      — número do CTe
├── ...campos padrão...
├── CT2_VIBS     — Valor IBS (R$) calculado pelo MCP
├── CT2_VCBS     — Valor CBS (R$) calculado pelo MCP
├── CT2_ALIBS    — Alíquota IBS (%) do ano
├── CT2_ALCBS    — Alíquota CBS (%) do ano
├── CT2_VNOVO    — Total novo regime (IBS + CBS) em R$
└── CT2_VANT     — Total antigo regime (ICMS + PIS + COFINS) em R$
```

## Tratamento de erros no EAI

O EAI do Protheus gerencia automaticamente:

1. **Timeout** — se o servidor Node.js não responder em `MV_MCPTOUT` ms,
   o EAI registra o erro e pode reprocessar automaticamente.

2. **HTTP 4xx** — erro nos parâmetros enviados. O adapter loga o motivo
   e o CTe é processado sem os campos MCP (não bloqueia o fluxo).

3. **HTTP 5xx** — erro interno no servidor. O EAI coloca na fila de retry.

4. **Servidor fora do ar** — o adapter testa o `/health` antes da chamada.
   Se indisponível, loga aviso e continua sem calcular (non-blocking).

## Segurança

- Comunicação na rede interna (LAN) — sem exposição à internet
- Recomenda-se colocar o servidor Node.js na mesma VLAN do servidor Protheus
- Opcionalmente, adicionar autenticação Basic Auth no servidor Express
  (ver `src/server.ts` da Abordagem 1 — adicionar middleware de autenticação)

## Escalabilidade

Para ambientes com alto volume de CTe:

- Aumentar o `MV_MCPTOUT` para evitar falsos timeouts
- Considerar balanceamento de carga (2 instâncias Node.js em portas diferentes)
- Usar PM2 para gerenciar o processo Node.js em produção:
  ```bash
  npm install -g pm2
  pm2 start dist/server.js --name mcp-frete
  pm2 startup  # inicia automaticamente com o Windows/Linux
  ```
