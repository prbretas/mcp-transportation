# Abordagem 3 — EAI / ESB (Integração Corporativa com Protheus)

> Integra o mcp-frete-tributario ao módulo EAI (Enterprise Application Integration)
> do Protheus usando o padrão REST/SOAP corporativo da TOTVS.

## O que é o EAI do Protheus?

O **EAI (Enterprise Application Integration)** é o barramento de integração nativo do Protheus.
Ele permite publicar e consumir serviços externos de forma padronizada, com:

- Controle de versão de mensagens
- Rastreabilidade de transações
- Retry automático em caso de falha
- Monitoramento via console do EAI

Na prática, você registra o serviço REST do mcp-frete-tributario como um **endpoint externo**
e cria um **adapter AdvPL** que o Protheus chama automaticamente em pontos específicos do TMS.

## Arquitetura

```
Protheus TMS (Gestão de Frete Embarcador)
    │
    │  Ponto de entrada: cálculo de CTe / tabela de frete
    ▼
[EAI Adapter — AdvPL]
    │  HTTP POST via EAIService
    ▼
[mcp-frete-tributario REST API — porta 3001]
    │  calcula IBS/CBS/ICMS
    ▼
[Retorna CargaTributaria JSON]
    │
    ▼
[EAI Adapter grava resultado em campos customizados do CTe]
```

## Pré-requisitos

- Protheus P12 12.1.2310 ou superior
- Módulo EAI habilitado no ambiente (TOTVS SmartLink ou EAI v3)
- Acesso ao Configurador para cadastrar o serviço externo
- Servidor REST da Abordagem 1 rodando (ou deployado em servidor)
- Permissão para criar tabelas/campos extras no SX (opcional)

## Estrutura de arquivos

```
abordagem-3-eai-esb/
├── README.md                        — este arquivo
├── docs/
│   ├── CONFIGURACAO-EAI.md          — passo a passo no Configurador
│   └── ARQUITETURA-DETALHADA.md     — diagrama e explicação técnica
├── advpl/
│   ├── MCPFreteAdapter.prw          — adapter principal (EAI)
│   ├── MCPFreteSetup.prw            — configuração inicial e cadastro
│   └── MCPFreteCampos.prw           — criação de campos customizados no CTe
└── exemplos/
    └── payload-exemplo.json         — exemplo de payload de integração
```

## Instalação

### 1. Subir o servidor REST

Siga as instruções da Abordagem 1 para colocar o servidor REST em funcionamento.
Em ambiente corporativo, recomenda-se deploiar em um servidor Windows separado
(ou como serviço Windows via `node-windows`).

### 2. Configurar no Protheus (Configurador)

Veja o passo a passo em `docs/CONFIGURACAO-EAI.md`.

Resumo:
1. Acesse **Configurador → Integrações → Serviços Externos**
2. Cadastre o endpoint `http://<servidor>:3001`
3. Configure os headers `Content-Type: application/json`
4. Teste a conexão com o endpoint `/health`

### 3. Compilar os fontes AdvPL

```
Compile no RPO:
  advpl/MCPFreteSetup.prw
  advpl/MCPFreteAdapter.prw
  advpl/MCPFreteCampos.prw
```

### 4. Executar o setup inicial

No console do Protheus:
```
U_MCPFreteSetup()
```

Isso cria os campos customizados e registra o serviço no EAI.

### 5. Ativar o ponto de entrada

Adicione a chamada ao adapter no ponto de entrada relevante do TMS:
- `MT140OK` — ao confirmar CTe
- `MT140GRV` — ao gravar tabela de frete

## Vantagens desta abordagem

- Integração nativa com o fluxo do TMS
- Rastreabilidade e log centralizado no EAI
- Retry automático em falhas de rede
- Os valores IBS/CBS ficam gravados no CTe para auditoria
- Compatível com SPED Fiscal e obrigações acessórias

## Limitações

- Exige configuração mais complexa no ambiente TOTVS
- Depende do módulo EAI habilitado (licença)
- Manutenção de dois sistemas (Node.js REST + Protheus)
- Necessita abertura de porta entre o servidor Protheus e o Node.js

## Quando escolher esta abordagem

Use a Abordagem 3 quando:
- O ambiente já tem EAI configurado para outras integrações
- É necessário gravar os valores de IBS/CBS no CTe para SPED
- O processo precisa de rastreabilidade e auditoria corporativa
- O volume de fretes é alto e a automação é necessária (> 500 CTe/dia)
