# Configuração do EAI no Protheus

## Passo 1 — Verificar se o EAI está habilitado

No Configurador do Protheus:
- Acesse **Ambiente → Configurações → Parâmetros**
- Verifique o parâmetro `MV_EAIREST` — deve estar com valor `1`
- Verifique `MV_EAIURL` — URL base do EAI (ex: `http://localhost:8080/totvs.ems2FWS`)

Se o EAI não estiver habilitado, acione o administrador TOTVS do ambiente.

---

## Passo 2 — Cadastrar o serviço externo

### Via Configurador (interface)

1. Acesse **Integrações → EAI → Serviços Externos**
2. Clique em **Novo**
3. Preencha:

| Campo | Valor |
|-------|-------|
| Código do serviço | `MCPFRETE` |
| Descrição | `MCP Frete Tributario REST API` |
| URL base | `http://localhost:3001` (ou IP do servidor) |
| Timeout | `10000` (10 segundos) |
| Ativo | `Sim` |

4. Adicione os headers padrão:
   - `Content-Type: application/json`
   - `Accept: application/json`

5. Salve e clique em **Testar Conexão** — deve retornar status 200 do `/health`

### Via AdvPL (programático)

Execute `U_MCPFreteSetup()` após compilar os fontes.
O setup cria o registro automaticamente via `ExecBlock`.

---

## Passo 3 — Criar campos customizados no CTe (SD1/SF2)

> Estes campos armazenam os valores IBS/CBS calculados para auditoria.

Execute `U_MCPFreteCampos()` para criar automaticamente:

| Tabela | Campo | Tipo | Descrição |
|--------|-------|------|-----------|
| CT2 | CT2_VIBS | Numérico | Valor IBS calculado |
| CT2 | CT2_VCBS | Numérico | Valor CBS calculado |
| CT2 | CT2_ALIBS | Numérico | Alíquota IBS (%) |
| CT2 | CT2_ALCBS | Numérico | Alíquota CBS (%) |
| CT2 | CT2_VNOVO | Numérico | Total novo regime |
| CT2 | CT2_VANT | Numérico | Total antigo regime |

> **Atenção:** Criação de campos no SX requer permissão de DBA e backup prévio.

---

## Passo 4 — Configurar ponto de entrada no TMS

O ponto de entrada recomendado depende do módulo:

### Gestão de Frete Embarcador (GFE)

- **GFE080GRV** — ao gravar lançamento de frete
- **GFE100OK** — ao aprovar cálculo de frete

### TMS Protheus (TM)

- **MT140OK** — ao confirmar CTe
- **TM500OK** — ao gravar tabela de frete

Adicione no fonte do ponto de entrada:

```advpl
// Dentro do ponto de entrada (ex: MT140OK)
If ExistBlock("MCPFreteAdapter")
  ExecBlock("MCPFreteAdapter", .F., .F.)
EndIf
```

---

## Passo 5 — Monitorar no console do EAI

1. Acesse **Integrações → EAI → Monitor de Mensagens**
2. Filtre por serviço `MCPFRETE`
3. Verifique status das transações (OK / ERRO / PENDENTE)
4. Em caso de erro, use o botão **Reprocessar** para retry manual

---

## Troubleshooting

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| Timeout na chamada | Servidor Node.js fora do ar | Verificar `http://localhost:3001/health` |
| Erro 400 | Parâmetros inválidos | Verificar logs do Node.js |
| Campo CT2_VIBS não encontrado | Setup não executado | Rodar `U_MCPFreteCampos()` |
| EAI não disponível | Módulo não licenciado | Contato com suporte TOTVS |
