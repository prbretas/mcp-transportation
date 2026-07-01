# Requirements Document

## Introduction

O **mcp-frete-tributario** é um servidor MCP (Model Context Protocol) educacional/profissional desenvolvido em TypeScript que simula a tributação de frete no contexto da Reforma Tributária brasileira (Lei Complementar 214/2025 — IBS/CBS). O servidor expõe ferramentas (tools) que permitem a agentes de IA calcular cargas tributárias, consultar o cronograma de transição, simular impactos por rota e listar empresas cadastradas, tudo via transporte stdio — compatível com Claude Desktop, Cursor e demais clientes MCP.

O objetivo principal é educacional: demonstrar, em contexto de aula sobre agentes de IA, como integrar cálculos tributários reais ao ecossistema MCP, preparando o terreno para futura integração com o sistema SCTEC de gestão de empresas.

---

## Glossary

- **MCP_Server**: O servidor `mcp-frete-tributario` que implementa o Model Context Protocol via stdio transport.
- **IBS**: Imposto sobre Bens e Serviços — tributo subnacional criado pela Reforma Tributária (LC 214/2025), substituto do ICMS estadual e do ISS municipal.
- **CBS**: Contribuição sobre Bens e Serviços — tributo federal criado pela Reforma Tributária, substituto do PIS e da COFINS.
- **ICMS**: Imposto sobre Circulação de Mercadorias e Serviços — tributo estadual do regime antigo, vigente durante o período de transição.
- **PIS/COFINS**: Contribuições federais sobre receita do regime antigo, vigentes durante o período de transição.
- **Alíquota_Nominal**: Percentual total de tributo (IBS + CBS) incidente sobre o valor do frete em determinado ano, expresso em pontos percentuais (0–100).
- **Cronograma_Transicao**: Tabela oficial que define os percentuais de cada tributo (ICMS, ISS, PIS, COFINS, IBS, CBS) por ano de 2026 a 2033, conforme a Reforma Tributária, expressos em pontos percentuais (0–100).
- **NCM**: Nomenclatura Comum do Mercosul — código que classifica mercadorias; pode influenciar alíquotas específicas.
- **CNPJ**: Cadastro Nacional de Pessoa Jurídica — identificador de empresas brasileiras (14 dígitos numéricos).
- **UF**: Unidade Federativa — sigla de dois caracteres do estado brasileiro (ex.: SP, RJ, MG). Valores válidos: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO.
- **BrasilAPI**: API pública brasileira (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) que fornece dados cadastrais de CNPJ, incluindo razão social e UF.
- **ViaCEP**: API pública brasileira para consulta de endereços por CEP.
- **SCTEC**: Sistema de Gestão de Empresas client-side (LocalStorage + BrasilAPI + ViaCEP) com o qual o MCP poderá futuramente se integrar.
- **Banco_Simulado**: Repositório de dados mockados de empresas, armazenado em arquivo JSON local (`src/data/empresas.json`), com estrutura compatível com o SCTEC.
- **Tool**: Ferramenta exposta pelo MCP_Server e chamável por agentes de IA via protocolo MCP.
- **Carga_Tributaria**: Conjunto de valores calculados: `aliquotaNominal` (pontos percentuais), `valorIBS`, `valorCBS`, `totalNovoRegime`, `valorICMS`, `valorPIS`, `valorCOFINS`, `totalAntigoRegime` — todos os valores monetários em reais com precisão de duas casas decimais usando arredondamento half-up.

---

## Requirements

### Requisito 1: Cálculo da Carga Tributária de Frete

**User Story:** Como estudante ou profissional fiscal, quero calcular a carga tributária de um frete em qualquer ano da transição tributária, para que eu possa comparar o regime novo (IBS/CBS) com o regime antigo (ICMS+PIS/COFINS) e entender o impacto financeiro.

#### Critérios de Aceitação

1. WHEN a tool `calcular_carga_tributaria_frete` é invocada com `valorFrete` (número positivo em reais), `ufOrigem` (sigla de UF válida), `ufDestino` (sigla de UF válida) e `ano` (inteiro entre 2026 e 2033), THE MCP_Server SHALL retornar a Carga_Tributaria contendo: `aliquotaNominal` (IBS% + CBS% do ano em pontos percentuais), `valorIBS` (valorFrete × ibs% / 100, arredondado half-up para 2 casas), `valorCBS` (valorFrete × cbs% / 100, arredondado half-up para 2 casas) e `totalNovoRegime` (valorIBS + valorCBS, arredondado half-up para 2 casas).
2. WHEN a tool `calcular_carga_tributaria_frete` é invocada, THE MCP_Server SHALL calcular o comparativo com o regime antigo retornando `valorICMS` (valorFrete × icms% / 100), `valorPIS` (valorFrete × pis% / 100), `valorCOFINS` (valorFrete × cofins% / 100) e `totalAntigoRegime` (valorICMS + valorPIS + valorCOFINS) — todos arredondados half-up para 2 casas decimais — com base nas alíquotas do `ano` no Cronograma_Transicao; o campo ISS não é incluído no `totalAntigoRegime` pois não incide sobre transporte interestadual de cargas.
3. WHERE o parâmetro `ncm` é fornecido, THE MCP_Server SHALL verificar se existe uma alíquota diferenciada para o NCM informado; IF não existir regra específica para o NCM, THEN THE MCP_Server SHALL utilizar as alíquotas padrão do Cronograma_Transicao para o `ano` informado, sem retornar erro.
4. IF `valorFrete` for menor ou igual a zero, THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"valorFrete deve ser um número positivo"`.
5. IF `ano` estiver fora do intervalo de 2026 a 2033 ou não for um inteiro, THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"ano deve estar entre 2026 e 2033"`.
6. IF `ufOrigem` ou `ufDestino` não corresponderem a uma sigla de UF brasileira válida (lista das 27 UFs), THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"UF inválida: {uf}"`, substituindo `{uf}` pela sigla inválida recebida.
7. THE MCP_Server SHALL retornar todos os valores monetários da Carga_Tributaria com exatamente duas casas decimais usando arredondamento half-up (ex.: R$ 1234,555 → 1234.56).

---

### Requisito 2: Consulta ao Cronograma de Transição

**User Story:** Como estudante ou profissional fiscal, quero consultar os percentuais de cada tributo para um determinado ano da transição, para que eu possa entender como a Reforma Tributária impacta progressivamente a tributação ao longo do tempo.

#### Critérios de Aceitação

1. WHEN a tool `consultar_cronograma_transicao` é invocada com `ano` (inteiro entre 2026 e 2033), THE MCP_Server SHALL retornar os percentuais vigentes naquele ano para os tributos: `icms`, `iss`, `pis`, `cofins`, `ibs` e `cbs`, todos expressos em pontos percentuais (0–100) com até duas casas decimais.
2. THE MCP_Server SHALL armazenar o Cronograma_Transicao em arquivo JSON local (`src/data/cronograma-reforma.json`) com a estrutura `{ "ano": number, "icms": number, "iss": number, "pis": number, "cofins": number, "ibs": number, "cbs": number }[]`, contendo exatamente 8 entradas (uma por ano de 2026 a 2033).
3. WHEN a tool `consultar_cronograma_transicao` é invocada com sucesso, THE MCP_Server SHALL retornar também os campos calculados: `totalNovoRegime` (ibs + cbs, com duas casas decimais) e `totalAntigoRegime` (icms + iss + pis + cofins, com duas casas decimais) para o ano solicitado.
4. IF `ano` estiver fora do intervalo de 2026 a 2033 ou não for um inteiro, THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"ano deve estar entre 2026 e 2033"`.
5. THE MCP_Server SHALL pré-carregar o Cronograma_Transicao na inicialização a partir do arquivo JSON local, sem necessidade de chamadas externas a APIs; a tool `consultar_cronograma_transicao` SHALL responder em menos de 50ms para qualquer `ano` válido.

---

### Requisito 3: Simulação de Impacto por Rota com CNPJ

**User Story:** Como usuário do sistema, quero informar apenas os CNPJs de origem e destino e o valor do frete, para que o sistema resolva automaticamente as UFs correspondentes e calcule a carga tributária sem que eu precise conhecer os estados envolvidos.

#### Critérios de Aceitação

1. WHEN a tool `simular_impacto_rota` é invocada com `cnpjOrigem` (CNPJ válido), `cnpjDestino` (CNPJ válido) e `valorFrete` (número positivo em reais), THE MCP_Server SHALL consultar a BrasilAPI (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) para resolver a UF de cada CNPJ, com timeout de 5000ms por requisição.
2. WHEN a BrasilAPI retorna os dados de um CNPJ com sucesso, THE MCP_Server SHALL extrair a UF do campo `uf` da resposta e calcular a Carga_Tributaria usando o `ano` corrente do calendário (ex.: se a chamada ocorrer em 2026, usa `ano = 2026`); IF o ano corrente estiver fora de 2026–2033, THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"Simulação indisponível: ano corrente fora do período de transição (2026–2033)"`.
3. WHEN a tool `simular_impacto_rota` é invocada com sucesso, THE MCP_Server SHALL retornar: a Carga_Tributaria completa, os campos `ufOrigem` e `ufDestino` (UFs resolvidas), `razaoSocialOrigem` e `razaoSocialDestino` (do campo `razao_social` da BrasilAPI) e `anoCorrente` (inteiro do ano utilizado no cálculo).
4. IF a BrasilAPI retornar status HTTP ≥ 400 ou não responder em 5000ms para qualquer CNPJ, THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"Não foi possível consultar o CNPJ {cnpj}: {motivo}"`, substituindo `{cnpj}` pelo CNPJ problemático e `{motivo}` pelo código HTTP ou "timeout".
5. IF `cnpjOrigem` ou `cnpjDestino` não possuírem exatamente 14 dígitos numéricos (aceita formato com máscara XX.XXX.XXX/XXXX-XX, removendo pontuação antes da validação), THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"CNPJ inválido: {cnpj}"` sem consultar a BrasilAPI.
6. IF `valorFrete` for menor ou igual a zero, THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"valorFrete deve ser um número positivo"` sem consultar a BrasilAPI.
7. THE MCP_Server SHALL realizar as duas consultas à BrasilAPI (origem e destino) com `Promise.all`, de forma que o tempo total de espera seja o máximo das duas latências individuais e não a soma delas.

---

### Requisito 4: Listagem de Empresas Cadastradas

**User Story:** Como usuário do sistema, quero visualizar a lista de empresas cadastradas no banco simulado, para que eu possa identificar empresas disponíveis para usar nas simulações de rota e comparar com o formato do sistema SCTEC.

#### Critérios de Aceitação

1. WHEN a tool `listar_empresas_cadastradas` é invocada sem parâmetros de entrada, THE MCP_Server SHALL retornar a lista completa de empresas do Banco_Simulado na forma de um array JSON.
2. THE MCP_Server SHALL armazenar o Banco_Simulado em `src/data/empresas.json` com cada empresa contendo exatamente os campos: `razaoSocial` (string não vazia), `cnpj` (string com exatamente 14 dígitos numéricos), `uf` (sigla de UF válida) e `valorUltimoFrete` (número ≥ 0 em reais); o arquivo SHALL conter pelo menos 5 empresas de UFs distintas para uso nos testes.
3. WHEN a tool `listar_empresas_cadastradas` é invocada, THE MCP_Server SHALL retornar o campo `totalEmpresas` (inteiro igual ao comprimento do array retornado) junto à lista.
4. IF o arquivo `src/data/empresas.json` não for encontrado, não for um JSON válido, ou qualquer empresa estiver faltando um campo obrigatório, THEN THE MCP_Server SHALL retornar `isError: true` com mensagem `"Banco de dados de empresas indisponível"`.
5. THE MCP_Server SHALL responder à tool `listar_empresas_cadastradas` em menos de 50ms, independentemente do número de empresas no Banco_Simulado.
6. WHEN o Banco_Simulado estiver vazio (array de comprimento zero), THE MCP_Server SHALL retornar `totalEmpresas: 0` e um array vazio sem retornar erro.

---

### Requisito 5: Inicialização e Transporte do Servidor MCP

**User Story:** Como desenvolvedor ou estudante, quero iniciar o servidor MCP via linha de comando e integrá-lo ao Claude Desktop ou Cursor, para que eu possa invocar as ferramentas tributárias diretamente a partir de um agente de IA.

#### Critérios de Aceitação

1. THE MCP_Server SHALL implementar o transporte stdio do Model Context Protocol usando `StdioServerTransport` do `@modelcontextprotocol/sdk`, permitindo comunicação via stdin/stdout do processo Node.js.
2. THE MCP_Server SHALL registrar exatamente as quatro Tools (`calcular_carga_tributaria_frete`, `consultar_cronograma_transicao`, `simular_impacto_rota`, `listar_empresas_cadastradas`) com seus respectivos schemas de entrada definidos e validados via `zod`.
3. WHEN o MCP_Server é iniciado via `node dist/index.js`, THE MCP_Server SHALL carregar o Cronograma_Transicao e o Banco_Simulado dos arquivos JSON locais antes de aceitar qualquer chamada de tool; o servidor SHALL estar pronto para receber chamadas em menos de 2000ms após o início do processo.
4. IF qualquer arquivo JSON de dados essenciais (Cronograma_Transicao ou Banco_Simulado) não for encontrado, não for JSON válido ou estiver com schema incorreto na inicialização, THEN THE MCP_Server SHALL encerrar o processo com código de saída `1` e registrar uma mensagem descritiva no stderr identificando qual arquivo falhou e o motivo.
5. WHEN uma tool recebe parâmetros de entrada com tipos ou valores inválidos, THE MCP_Server SHALL retornar uma resposta com `isError: true` e uma mensagem descrevendo o erro de validação, sem encerrar o processo do servidor.
6. THE MCP_Server SHALL ser compilável via `npx tsc` e executável via `node dist/index.js` sem variáveis de ambiente obrigatórias além do PATH do Node.js.

---

### Requisito 6: Qualidade e Estrutura do Código

**User Story:** Como desenvolvedor estudante, quero que o código do servidor MCP seja bem estruturado e tipado, para que eu possa aprender boas práticas de desenvolvimento TypeScript enquanto estudo sobre agentes de IA e Reforma Tributária.

#### Critérios de Aceitação

1. THE MCP_Server SHALL ser implementado em TypeScript com `strict: true` habilitado no `tsconfig.json`; o comando `npx tsc --noEmit` SHALL concluir sem erros ou warnings.
2. THE MCP_Server SHALL organizar o código nos módulos: `src/tools/` (uma implementação por tool), `src/data/` (arquivos JSON de dados), `src/services/` (integrações externas: BrasilAPI), e `src/index.ts` (bootstrap e registro das tools).
3. WHEN qualquer tool lança uma exceção em runtime, THE MCP_Server SHALL capturar a exceção no handler da tool, retornar `{ isError: true, content: [{ type: "text", text: mensagem }] }` e continuar em execução — o processo do servidor NÃO SHALL encerrar devido a erros em tools individuais.
4. THE MCP_Server SHALL utilizar exclusivamente a biblioteca `@modelcontextprotocol/sdk` para toda a implementação do protocolo MCP (registro de tools, transport, resposta), sem reimplementar nenhuma camada de comunicação MCP.
5. THE MCP_Server SHALL utilizar a biblioteca `zod` para definir e validar todos os schemas de entrada das Tools; nenhuma tool SHALL aceitar entrada sem validação `zod` prévia.
