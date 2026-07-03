# Integrações — mcp-frete-tributario com TOTVS Frete Embarcador

Esta pasta contém tudo que um desenvolvedor precisa para conectar o mcp-frete-tributario
ao Protheus TMS, ao GFE ou a qualquer outro sistema.

## Documentação principal

| Documento | Para quem é | O que contém |
|---|---|---|
| **[GUIA-INTEGRACAO-TOTVS.md](./GUIA-INTEGRACAO-TOTVS.md)** | Devs TOTVS / equipe Protheus | Passo a passo completo, 4 cenários AdvPL, deploy como serviço Windows, segurança |
| **[API-REFERENCE.md](./API-REFERENCE.md)** | Qualquer dev integrando | Referência técnica de todos os endpoints, payloads, erros, exemplos em Python/Java/C# |

---

Esta pasta contém também três abordagens independentes de integração.
Cada uma tem sua pasta, código e documentação própria.

---

## Comparativo rápido

| Critério | Abordagem 1 (REST) | Abordagem 2 (Copiloto IA) | Abordagem 3 (EAI/ESB) |
|---|---|---|---|
| Complexidade | Média | Baixa | Alta |
| Tempo para implantar | 1–2 dias | 30 minutos | 1–2 semanas |
| Integração com Protheus | Direta via AdvPL | Nenhuma (apoio manual) | Nativa via EAI |
| Automação | Total | Nenhuma | Total |
| Requer LLM/IA | Não | Sim (Claude/Cursor) | Não |
| Rastreabilidade EAI | Não | Não | Sim |
| Grava valores no CTe | Sim (com AdvPL) | Não | Sim (automático) |
| Custo de infraestrutura | Baixo (Node.js) | Baixo (config MCP) | Médio (EAI licenciado) |

---

## Quando usar cada uma

### Abordagem 1 — REST API
**Use quando:** Você quer que o Protheus chame os cálculos diretamente, sem IA no meio.
Ideal para automação em pontos de entrada do TMS com código AdvPL.

→ `abordagem-1-rest-api/`

### Abordagem 2 — Copiloto IA
**Use quando:** Você quer um assistente de IA para apoiar analistas de frete
em decisões como montagem de tabela de frete, simulação de cenários e análise de contratos.
Funciona hoje, sem nenhuma configuração no Protheus.

→ `abordagem-2-copiloto-ia/`

### Abordagem 3 — EAI/ESB
**Use quando:** O ambiente já tem o módulo EAI do Protheus habilitado e você quer
que os valores de IBS/CBS sejam gravados automaticamente no CTe, com rastreabilidade
e retry gerenciados pelo barramento de integração.

→ `abordagem-3-eai-esb/`

---

## Recomendação para estudo

Se você está aprendendo, siga esta ordem:

1. **Comece pela Abordagem 2** — configure o MCP no Claude Desktop e experimente os prompts.
   Zero código, resultado imediato.

2. **Avance para a Abordagem 1** — suba o servidor REST e teste os endpoints com Postman/Insomnia.
   Depois adapte o código AdvPL para o seu ambiente Protheus de testes.

3. **Estude a Abordagem 3 por último** — leia a documentação e o código AdvPL como referência
   para quando precisar de uma integração corporativa completa.
