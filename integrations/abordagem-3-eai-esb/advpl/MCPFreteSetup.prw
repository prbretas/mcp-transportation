/*
 * MCPFreteSetup.prw
 * Setup inicial da integração EAI com o mcp-frete-tributario.
 *
 * Execute UMA VEZ durante a implantação:
 *   U_MCPFreteSetup()
 *
 * O que faz:
 *   1. Cria parâmetros no SX6 (MV_MCPURL, MV_MCPTOUT)
 *   2. Testa a conectividade com o servidor REST
 *   3. Exibe relatório de status
 */

#Include "Protheus.ch"

// ---------------------------------------------------------------------------
// U_MCPFreteSetup — Ponto de entrada do setup
// ---------------------------------------------------------------------------
User Function MCPFreteSetup()
  Local lOk    := .T.
  Local cUrl   := ""
  Local cMsg   := ""

  ConOut("=== MCP Frete Tributario — Setup EAI ===")

  // 1. Cria ou atualiza parâmetros no SX6
  lOk := MCPSetupParams()
  If !lOk
    ConOut("[ERRO] Falha ao criar parâmetros SX6.")
    Return .F.
  EndIf
  ConOut("[OK] Parâmetros SX6 criados.")

  // 2. Testa a conexão com o servidor REST
  cUrl := SuperGetMV("MV_MCPURL", .F., "http://localhost:3001")
  cMsg := MCPTestarConexao(cUrl)
  If !Empty(cMsg)
    ConOut("[OK] Servidor REST respondeu: " + cMsg)
  Else
    ConOut("[AVISO] Servidor REST não respondeu. Verifique se está rodando.")
    ConOut("        npm start na pasta abordagem-1-rest-api")
  EndIf

  ConOut("=== Setup concluído ===")
Return .T.

// ---------------------------------------------------------------------------
// MCPSetupParams — Cria os parâmetros no SX6
// ---------------------------------------------------------------------------
Static Function MCPSetupParams()
  // MV_MCPURL — URL base do servidor REST
  If !ExistSX6("MV_MCPURL")
    PutSX6("MV_MCPURL", ;
           "URL do servidor MCP Frete Tributario", ;
           "http://localhost:3001", ;
           "C", 100)
  EndIf

  // MV_MCPTOUT — Timeout em milissegundos
  If !ExistSX6("MV_MCPTOUT")
    PutSX6("MV_MCPTOUT", ;
           "Timeout REST mcp-frete-tributario (ms)", ;
           "10000", ;
           "N", 6)
  EndIf

  // MV_MCPATIV — Ativo (S/N)
  If !ExistSX6("MV_MCPATIV")
    PutSX6("MV_MCPATIV", ;
           "Ativa integracao MCP Frete Tributario", ;
           "S", ;
           "C", 1)
  EndIf

Return .T.

// ---------------------------------------------------------------------------
// MCPTestarConexao — GET /health e retorna o body
// ---------------------------------------------------------------------------
Static Function MCPTestarConexao(cUrlBase)
  Local cUrl      := cUrlBase + "/health"
  Local cResposta := ""
  Local oHttp

  oHttp := FWHTTPClient():New()
  oHttp:setURL(cUrl)
  oHttp:setTimeout(5000)
  oHttp:addHeader("Accept", "application/json")

  If oHttp:Get()
    cResposta := oHttp:getBody()
  EndIf

Return cResposta

// ---------------------------------------------------------------------------
// Helpers (stubs — implementação real depende da versão do Protheus)
// ---------------------------------------------------------------------------
Static Function ExistSX6(cParam)
  // Verifica se o parâmetro já existe no SX6
  // Stub — substitua pela verificação real do seu ambiente
  Return AllTrimExist(cParam) // placeholder
Static Function PutSX6(cParam, cDesc, cDef, cTipo, nTam)
  // Cria o parâmetro no SX6
  // Stub — use FWParameterSXB ou equivalente no seu Protheus
  ConOut("  Criando parâmetro: " + cParam + " = " + cDef)
Return
