# Abordagem 2 — Copiloto de IA (MCP direto no assistente)

> Usa o mcp-frete-tributario como ferramenta de um assistente de IA (Claude, Cursor, Kiro).
> O analista de frete conversa com o assistente e obtém simulações tributárias sem precisar de código.

## Como funciona

```
Analista de frete
    │  "Qual o impacto tributário na rota SP→AM 
    │   para fretes acima de R$ 3.000 em 2029?"
    ▼
[Claude Desktop / Cursor / Kiro com MCP configurado]
    ├─ chama consultar_cronograma_transicao({ ano: 2029 })
    ├─ chama calcular_carga_tributaria_frete({ valorFrete: 3000, ... })
    └─ retorna análise comparativa com linguagem natural
```

**Não há integração técnica com o Protheus** — o analista usa o assistente de IA como apoio à decisão antes de parametrizar a tabela de frete no TMS.

## Pré-requisitos

- Node.js >= 20
- Projeto mcp-frete-tributario compilado (`npm run build` na raiz)
- Um dos clientes MCP instalados:
  - [Claude Desktop](https://claude.ai/download)
  - [Cursor](https://cursor.sh)
  - [Kiro (VS Code)](https://kiro.dev)

## Configuração

### Claude Desktop

Edite o arquivo de configuração do Claude Desktop:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "frete-tributario": {
      "command": "node",
      "args": ["C:\\Users\\philippe.bretas\\Documents\\KIRO REP\\MCP-TRANSPORTATION\\dist\\index.js"]
    }
  }
}
```

### Kiro / Cursor

Edite `.kiro/settings/mcp.json` no workspace:

```json
{
  "mcpServers": {
    "frete-tributario": {
      "command": "node",
      "args": ["C:\\Users\\philippe.bretas\\Documents\\KIRO REP\\MCP-TRANSPORTATION\\dist\\index.js"],
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

## Exemplos de prompts para o analista

Veja o arquivo `prompts/exemplos-protheus.md` para uma coleção de prompts prontos para uso no dia a dia do TMS.

### Simulação de impacto em tabela de frete

```
Tenho uma tabela de frete com as seguintes rotas:
- SP → RJ: R$ 850
- SP → MG: R$ 1.200
- SP → AM: R$ 4.500

Para cada rota, calcule a carga tributária em 2026 e em 2029,
mostrando quanto o embarcador vai pagar a mais no novo regime.
```

### Planejamento de repasse ao cliente

```
Meu cliente tem fretes de SP para BA com valor médio de R$ 2.800.
Considerando a Reforma Tributária, em qual ano o custo tributário
do novo regime (IBS+CBS) supera o custo do regime atual (ICMS+PIS+COFINS)?
```

### Análise de cronograma

```
Mostre o cronograma completo de transição tributária de 2026 a 2033
em formato de tabela, destacando os anos de maior variação percentual.
```

## Vantagens desta abordagem

- **Zero código adicional** — o MCP já está pronto, só configura o cliente
- **Linguagem natural** — o analista não precisa saber programar
- **Análise contextual** — o assistente raciocina sobre múltiplos cenários
- **Flexível** — você pode combinar dados do MCP com informações coladas no chat
- **Imediato** — funciona hoje, sem aguardar integração com Protheus

## Limitações

- Não automatiza processos — é apoio à decisão, não automação
- Requer acesso à internet (para usar Claude Desktop)
- Os cálculos ficam no assistente, não são gravados no Protheus automaticamente
- `simular_impacto_rota` requer aprovação manual (faz chamadas HTTP externas)

## Casos de uso no dia a dia do TMS

| Cenário | Como usar |
|---------|-----------|
| Renovação de contrato com transportadora | Perguntar ao assistente o impacto por ano da transição |
| Montagem de tabela de frete 2027/2028 | Simular múltiplas rotas e exportar para Excel |
| Explicação para cliente embarcador | Pedir ao assistente uma explicação em linguagem simples |
| Auditoria de CTe — verificar alíquota correta | Calcular pelo MCP e comparar com o documento |
