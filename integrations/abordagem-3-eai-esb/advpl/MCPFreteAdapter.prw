/*
 * MCPFreteAdapter.prw
 * Adapter EAI principal — chamado pelo ponto de entrada do TMS/GFE.
 *
 * Uso no ponto de entrada:
 *   If ExistBlock("MCPFreteAdapter")
 *     ExecBlock("MCPFreteAdapter", .F., .F.)
 *   EndIf
 *
 * Lê os dados do CTe atual, chama o servidor REST e grava
 * os campos customizados de IBS/CBS no registro.
 *
 * Pré-requisitos:
 *   - U_MCPFreteSetup() executado
 *   - U_MCPFreteCampos() executado
 *   - Servidor REST rodando (abordagem-1-rest-api)
 */

#Include "Protheus.ch"

// ---------------------------------------------------------------------------
// MCPFreteAdapter — Entry point chamado pelo TMS/GFE
// ---------------------------------------------------------------------------
User Function MCPFreteAdapter()
  Local cUrlBase  := SuperGetMV("MV_MCPURL",   .F., "http://localhost:3001")
  Local nTimeout  := Val(SuperGetMV("MV_MCPTOUT", .F., "10000"))
  Local cAtivo    := SuperGetMV("MV_MCPATIV",  .F., "S")

  // Verifica se a integração está ativa
  If cAtivo != "S"
    ConOut("[MCPFreteAdapter] Integração desativada (MV_MCPATIV=N).")
    Return
  EndIf

  // Lê os dados do CTe em contexto (alias CT2)
  Local nFrete   := CT2->CT2_VLFRETE   // Valor do frete
  Local cUFOrig  := CT2->CT2_DESTORI   // UF de origem
  Local cUFDest  := CT2->CT2_DESTDES   // UF de destino
  Local dEmissao := CT2->CT2_DTEMISS   // Data de emissão do CTe

  // Determina o ano da transição com base na data de emissão
  Local nAno := Year(dEmissao)

  // Valida o ano — apenas anos do período de transição
  If nAno < 2026 .Or. nAno > 2033
    ConOut("[MCPFreteAdapter] Ano " + cValToChar(nAno) + " fora do período de transição. Pulando.")
    Return
  EndIf

  // Monta payload
  Local cBody := MCPMontaPayload(nFrete, cUFOrig, cUFDest, nAno)

  // Chama o servidor REST
  Local cResposta := MCPChamarREST(cUrlBase, nTimeout, cBody)

  If Empty(cResposta)
    ConOut("[MCPFreteAdapter] Sem resposta do servidor REST. Campos não atualizados.")
    Return
  EndIf

  // Verifica erro na resposta
  If '"error"' $ cResposta
    ConOut("[MCPFreteAdapter] Erro na resposta: " + cResposta)
    Return
  EndIf

  // Grava os campos customizados no CTe
  MCPGravarCampos(cResposta)

Return

// ---------------------------------------------------------------------------
// MCPMontaPayload — Monta o JSON de requisição
// ---------------------------------------------------------------------------
Static Function MCPMontaPayload(nFrete, cUFOrig, cUFDest, nAno)
  Local cBody := ""

  cBody := "{"
  cBody += '"valorFrete":' + cValToChar(nFrete) + ","
  cBody += '"ufOrigem":"'  + AllTrim(cUFOrig) + '",'
  cBody += '"ufDestino":"' + AllTrim(cUFDest) + '",'
  cBody += '"ano":'        + cValToChar(nAno)
  cBody += "}"

Return cBody

// ---------------------------------------------------------------------------
// MCPChamarREST — Executa o POST no servidor REST
// ---------------------------------------------------------------------------
Static Function MCPChamarREST(cUrlBase, nTimeout, cBody)
  Local cUrl      := cUrlBase + "/calcular-carga"
  Local cResposta := ""
  Local oHttp

  oHttp := FWHTTPClient():New()
  oHttp:setURL(cUrl)
  oHttp:setTimeout(nTimeout)
  oHttp:addHeader("Content-Type", "application/json")
  oHttp:addHeader("Accept", "application/json")

  If oHttp:Post(cBody)
    cResposta := oHttp:getBody()
  Else
    ConOut("[MCPChamarREST] Falha HTTP: " + oHttp:getLastError())
  EndIf

Return cResposta

// ---------------------------------------------------------------------------
// MCPGravarCampos — Deserializa o JSON e grava nos campos customizados do CTe
// ---------------------------------------------------------------------------
Static Function MCPGravarCampos(cJson)
  Local oJson := JsonObject():New()

  If oJson:FromJson(cJson) != Nil
    ConOut("[MCPGravarCampos] JSON inválido: " + cJson)
    Return
  EndIf

  // Abre o registro em modo de edição e grava os campos
  // Nota: o alias CT2 já está posicionado pelo caller
  If CT2->(RLock())
    CT2->CT2_VIBS  := oJson:GetJsonObject("valorIBS")
    CT2->CT2_VCBS  := oJson:GetJsonObject("valorCBS")
    CT2->CT2_ALIBS := oJson:GetJsonObject("aliquotaNominal") / 2  // metade é IBS
    CT2->CT2_ALCBS := oJson:GetJsonObject("aliquotaNominal") / 2  // metade é CBS
    CT2->CT2_VNOVO := oJson:GetJsonObject("totalNovoRegime")
    CT2->CT2_VANT  := oJson:GetJsonObject("totalAntigoRegime")
    MsUnlock()
    ConOut("[MCPGravarCampos] Campos IBS/CBS gravados no CTe.")
  Else
    ConOut("[MCPGravarCampos] Não foi possível bloquear o registro CT2 para gravação.")
  EndIf

Return
