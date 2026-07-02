# Posts LinkedIn — mcp-frete-tributario

> 3 opções de post. Escolha o estilo que mais combina com você.
> Dica: adicione uma screenshot do terminal rodando o servidor ou do Claude Desktop respondendo uma simulação de frete — posts com imagem têm muito mais alcance.

---

## POST 1 — Técnico e direto (para devs e analistas de sistemas)

---

🚛 **Criei meu primeiro servidor MCP do zero — e escolhi um problema real para resolver.**

Estou estudando agentes de IA e decidi não fazer um projeto genérico.
Escolhi um problema que vivo no trabalho: **a tributação de frete na Reforma Tributária brasileira.**

O resultado foi o **mcp-frete-tributario** — um servidor MCP em TypeScript que expõe 4 ferramentas para qualquer agente de IA:

→ Calcular a carga tributária de um frete (IBS, CBS, ICMS, PIS, COFINS)
→ Consultar o cronograma de transição 2026–2033
→ Simular o impacto por CNPJ de origem e destino (integrado com BrasilAPI)
→ Listar empresas cadastradas no banco simulado

**O que aprendi na prática:**

✅ Como funciona o transporte stdio do protocolo MCP
✅ Por que validar entrada com Zod (LLMs passam números como strings — isso é real)
✅ Como escrever funções puras e testáveis com injeção de dependência
✅ Property-based testing com fast-check para validar invariantes matemáticas

**Stack:** Node.js · TypeScript · MCP SDK · Zod · Vitest · fast-check · BrasilAPI

Além disso, desenhei 3 formas de integrar isso no TOTVS Frete Embarcador:
— REST API direto para consumo via AdvPL (FWHTTPClient)
— Copiloto IA para analistas (Claude Desktop + prompts prontos)
— Adapter EAI/ESB para gravação automática nos campos do CTe

O código está aberto no GitHub 👇
🔗 github.com/prbretas/mcp-transportation

Se você trabalha com TMS, Protheus ou está estudando agentes de IA, vai curtir dar uma olhada.

#MCP #AgentesIA #TypeScript #TOTVS #ReformaTributaria #NodeJS #Protheus #TMS #DesenvolvimentoDeSoftware

---

---

## POST 2 — Narrativo e acessível (para um público mais amplo)

---

**Hoje quero compartilhar algo que estou construindo nas minhas horas de estudo.** 🧵

Trabalho com sistemas de gestão de frete há anos.
E quando ouço falar em IA, agentes, MCP — eu não quero só entender o conceito.
**Quero saber se isso resolve algum problema real do meu trabalho.**

Então coloquei à prova.

---

A Reforma Tributária (LC 214/2025) vai mudar completamente como o frete é tributado no Brasil.
ICMS, PIS e COFINS vão sendo substituídos por IBS e CBS entre 2026 e 2033.

Para quem trabalha com TMS e tabelas de frete — isso é uma dor de cabeça enorme.
Cada ano tem alíquotas diferentes. Calcular o impacto por rota manualmente é inviável.

---

**Aí entrou o MCP.**

MCP (Model Context Protocol) é um padrão aberto que permite que assistentes de IA usem ferramentas criadas por você.
É como uma API — mas projetada para agentes de IA chamarem.

Criei um servidor MCP em TypeScript que sabe:
📊 Qual é a carga tributária de qualquer frete em qualquer ano da transição
🗺️ Qual o impacto de uma rota específica, só com o CNPJ de origem e destino
📋 Como está o cronograma completo de 2026 a 2033

---

**O resultado prático:**

Em vez de abrir uma planilha, o analista de frete simplesmente pergunta ao assistente:

*"Qual o impacto tributário nos fretes de SP para AM em 2029 com valor médio de R$ 3.500?"*

E recebe uma análise completa em segundos, com comparativo entre regime antigo e novo.

---

Ainda estou aprendendo — mas esse primeiro projeto me convenceu de que **agentes de IA têm um papel real no dia a dia de quem trabalha com logística e sistemas ERP.**

Código aberto aqui 👇
🔗 github.com/prbretas/mcp-transportation

Se você também está estudando esse caminho, me conta nos comentários. Adoro trocar ideia sobre isso.

#AgentesIA #MCP #TOTVS #Logistica #ReformaTributaria #TMS #DesenvolvimentoDeSoftware #Aprendizado

---

---

## POST 3 — Curiosidade + gancho (para gerar engajamento)

---

**Pergunta rápida para quem trabalha com frete no Brasil:** 🤔

Você sabe quanto vai mudar a carga tributária de um frete de SP para AM entre 2026 e 2033?

Spoiler: em 2026 o novo regime (IBS+CBS) representa R$ 2,00 sobre R$ 1.000 de frete.
Em 2033? R$ 280,00.

Isso é o cronograma da Reforma Tributária. E é exatamente o tipo de cálculo que eu ensinei uma IA a fazer.

---

Estou estudando **agentes de IA e MCP (Model Context Protocol)** e decidi criar um projeto que conecta dois mundos que conheço bem:

**desenvolvimento de software + gestão de frete no Protheus TOTVS.**

O projeto se chama **mcp-frete-tributario**.

É um servidor MCP em TypeScript que expõe ferramentas de cálculo tributário para qualquer assistente de IA (Claude, Cursor, Kiro).

Com ele configurado, você pode perguntar ao seu assistente:
👉 "Quanto de IBS e CBS um frete de R$ 5.000 de MG para PA vai pagar em 2030?"
👉 "Em qual ano o novo regime passa a ser mais caro que o atual para a rota SP→RS?"
👉 "Me dê o cronograma completo em tabela para apresentar ao cliente"

E ele responde — porque tem as ferramentas para calcular.

---

O que mais me surpreendeu no processo:

🔹 O protocolo MCP é muito mais simples do que parece
🔹 A parte mais difícil não foi o código — foi definir exatamente o que cada ferramenta deve fazer
🔹 Property-based testing me salvou de bugs de arredondamento que testes manuais nunca pegariam

Ainda tem muito espaço para evoluir — integração nativa com EAI do Protheus, alíquotas por NCM, simulação de CD...

Mas o aprendizado já valeu muito.

Código aberto 👇
🔗 github.com/prbretas/mcp-transportation

Curte aí se você acha que IA tem um papel real no futuro dos sistemas de gestão. 👍

#MCP #AgentesIA #TypeScript #TOTVS #Protheus #Logistica #ReformaTributaria #TMS #Inovacao

---

---

## Dicas para maximizar o alcance

- **Imagem/vídeo:** Tire um print do terminal rodando `npm start` + Claude Desktop respondendo uma simulação. Vídeo curto (30s) de você digitando uma pergunta e a IA calculando converte muito bem.
- **Horário:** Terça a quinta entre 8h–10h ou 18h–20h costumam ter melhor alcance no LinkedIn BR.
- **Primeiro comentário:** Logo após postar, adicione um comentário com o link do GitHub e uma frase extra — isso aumenta o engajamento inicial.
- **Tag alguém:** Se tiver colegas que trabalham com Protheus/TMS, marque nos comentários pedindo opinião.
