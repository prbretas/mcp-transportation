# Prompts prontos — Copiloto IA para Frete Embarcador

> Cole estes prompts diretamente no Claude Desktop, Cursor ou Kiro
> com o mcp-frete-tributario configurado.

---

## 1. Simulação de impacto em tabela de frete

```
Tenho uma tabela de frete com as seguintes rotas e valores médios:
- SP → RJ: R$ 850
- SP → MG: R$ 1.200
- SP → AM: R$ 4.500
- SP → BA: R$ 2.100
- SP → RS: R$ 3.300

Para cada rota:
1. Calcule a carga tributária no regime atual (2026)
2. Calcule a carga tributária em 2029 (ponto médio da transição)
3. Calcule a carga tributária em 2033 (regime pleno IBS+CBS)
4. Mostre a diferença em R$ e em % para o embarcador

Organize em uma tabela comparativa.
```

---

## 2. Planejamento de repasse ao cliente

```
Sou analista de TMS na TOTVS. Meu cliente embarcador tem contratos
de frete de SP para as seguintes UFs, com os valores abaixo:

- SP → CE: R$ 1.800 (volume mensal: 45 fretes)
- SP → PA: R$ 3.200 (volume mensal: 12 fretes)
- SP → RO: R$ 2.900 (volume mensal: 8 fretes)

Calcule:
1. O custo tributário total mensal hoje (2026) por rota
2. O custo tributário total mensal em 2030 por rota
3. O aumento absoluto e percentual da carga tributária
4. Qual seria o novo valor de frete sugerido para manter
   a margem do transportador, considerando repasse integral do aumento
```

---

## 3. Auditoria de CTe — verificar alíquota

```
Recebi um CTe com os seguintes dados:
- Valor do frete: R$ 2.340,00
- UF origem: MG
- UF destino: SP
- Emissão: 2028
- ICMS destacado: R$ 187,20 (alíquota 8%)
- PIS: R$ 12,17
- COFINS: R$ 56,16

Verifique se os valores de ICMS, PIS e COFINS estão corretos
para o ano de 2028 conforme o cronograma da Reforma Tributária.
Indique se há divergência e qual seria o valor correto.
```

---

## 4. Cronograma completo para apresentação

```
Preciso preparar uma apresentação para o cliente sobre
a Reforma Tributária no setor de frete.

Gere:
1. O cronograma completo 2026-2033 em formato de tabela
2. Para cada ano, calcule o impacto em um frete padrão de R$ 1.000 SP→RJ
3. Destaque os anos de maior mudança
4. Escreva um parágrafo de conclusão explicando o impacto para transportadoras
   de carga em linguagem simples (sem jargão técnico tributário)
```

---

## 5. Comparativo entre rotas para decisão logística

```
Minha empresa está decidindo entre dois centros de distribuição:
- CD em SP (frete médio para clientes: R$ 2.500, destinos: RJ, MG, PR, SC)
- CD em MG (frete médio para clientes: R$ 2.800, destinos: RJ, SP, BA, GO)

Considerando a tributação de frete em 2028 e 2031:
1. Calcule o custo tributário total anual de cada CD
   (assumindo 200 fretes/mês para cada destino)
2. Qual CD tem menor carga tributária em 2028?
3. Essa vantagem se mantém em 2031?
4. Faça uma recomendação baseada nos dados
```

---

## 6. Verificar empresas cadastradas e simular frete

```
Liste as empresas cadastradas no banco de dados do sistema.
Em seguida, para as empresas de SP e RJ que encontrar,
simule o impacto tributário de um frete entre elas no ano de 2028,
usando o valor do último frete registrado de cada uma.
```

---

## 7. Análise ano a ano para um cliente específico

```
Meu cliente "Transportes Sul Ltda" (RS) faz fretes regulares para SP.
O valor médio dos fretes é R$ 1.850.

Faça uma análise completa:
1. Calcule a carga tributária para cada ano de 2026 a 2033
2. Mostre quanto o regime novo (IBS+CBS) representa vs o antigo (ICMS+PIS+COFINS)
3. Em qual ano os tributos se cruzam (novo supera o antigo)?
4. Qual é o aumento total de carga tributária de 2026 para 2033 em %?
5. Escreva um resumo executivo de 3 linhas para apresentar ao cliente
```

---

## Dicas de uso

- Você pode combinar os prompts acima com dados do seu CTe real (cole o XML ou os dados principais)
- Para análises mais longas, peça ao assistente para exportar em formato de tabela markdown e cole no Excel
- Use o prompt 3 (auditoria) para verificar documentos recebidos de transportadoras
- O assistente pode lembrar contexto dentro da mesma conversa — faça perguntas de follow-up
