/*
 * ConsultaTributacao.prw
 * Funções AdvPL para consumir a REST API do mcp-frete-tributario no Protheus.
 *
 * Pré-requisitos:
 *   - Servidor REST da Abordagem 1 rodando (npm start)
 *   - URL configurada em cBaseUrl abaixo
 *   - Protheus com suporte a FWHTTPClient (P12 12.1.2310+)
 *
 * Funções disponíveis:
 *   MCP_CalcCarga(nFrete, cUFOrig, cUFDest, nAno) -> cJSON
 *   MCP_ConsultaCronograma(nAno)                  -> cJSON
 *   MCP_SimularRota(cCNPJOrig, cCNPJDest, nFrete) -> cJSON
 *   MCP_ListarEmpresas()                          -> cJSON
 */

#Include "Protheus.ch"
#Include "FWMVCDef.ch"

// ---------------------------------------------------------------------------
// Configuração — ajuste a URL conforme seu ambiente
// ---------------------------------------------------------------------------
#Define MCP_BASE_URL  "http://localhost:3001"
#Define MCP_TIMEOUT   10000  // 10 segundos

// ---------------------------------------------------------------------------
// MCP_CalcCarga
// Calcula a carga tributária de um frete para um ano específico.
//
// Parâmetros:
//   nFrete  (Numérico) — valor do frete em BRL
//   cUFOrig (Caracter) — UF de origem (ex: "SP")
//   cUFDest (Caracter) — UF de destino (ex: "RJ")
//   nAno    (Numérico) — ano de 2026 a 2033
//
// Retorno:
//   cJSON (Caracter) — JSON com os campos da CargaTributaria ou {"error":"..."}
//
// Exemplo de uso:
//   Local cResp := MCP_CalcCarga(5000, "SP", "RJ", 2029)
//   // parse o JSON e use os campos para compor a nota fiscal
// ---------------------------------------------------------------------------
Function MCP_CalcCarga(nFrete, cUFOrig, cUFDest, nAno)
  Local cUrl    := MCP_BASE_URL + "/calcular-carga"
  Local cBody   := ""
  Local cResposta := ""
  Local oHttp

  // Monta o body JSON
  cBody := '{'
  cBody += '"valorFrete":' + cValToChar(nFrete) + ','
  cBody += '"ufOrigem":"'  + cUFOrig + '",'
  cBody += '"ufDestino":"' + cUFDest + '",'
  cBody += '"ano":'        + cValToChar(nAno)
  cBody += '}'

  oHttp := FWHTTPClient():New()
  oHttp:setURL(cUrl)
  oHttp:setTimeout(MCP_TIMEOUT)
  oHttp:addHeader("Content-Type", "application/json")
  oHttp:addHeader("Accept", "application/json")

  If oHttp:Post(cBody)
    cResposta := oHttp:getBody()
  Else
    cResposta := '{"error":"Falha na conexão com o servidor MCP REST"}'
  EndIf

Return cResposta

// ---------------------------------------------------------------------------
// MCP_ConsultaCronograma
// Retorna as alíquotas de todos os tributos para um ano da transição.
//
// Parâmetros:
//   nAno (Numérico) — ano de 2026 a 2033
//
// Retorno:
//   cJSON com campos: ano, icms, iss, pis, cofins, ibs, cbs,
//                     totalNovoRegime, totalAntigoRegime
// ---------------------------------------------------------------------------
Function MCP_ConsultaCronograma(nAno)
  Local cUrl    := MCP_BASE_URL + "/cronograma/" + cValToChar(nAno)
  Local cResposta := ""
  Local oHttp

  oHttp := FWHTTPClient():New()
  oHttp:setURL(cUrl)
  oHttp:setTimeout(MCP_TIMEOUT)
  oHttp:addHeader("Accept", "application/json")

  If oHttp:Get()
    cResposta := oHttp:getBody()
  Else
    cResposta := '{"error":"Falha na conexão com o servidor MCP REST"}'
  EndIf

Return cResposta

// ---------------------------------------------------------------------------
// MCP_SimularRota
// Simula o impacto tributário de uma rota usando os CNPJs de origem e destino.
// As UFs são resolvidas automaticamente via BrasilAPI no servidor Node.
//
// Parâmetros:
//   cCNPJOrig (Caracter) — CNPJ da empresa de origem (14 dígitos)
//   cCNPJDest (Caracter) — CNPJ da empresa de destino (14 dígitos)
//   nFrete    (Numérico) — valor do frete em BRL
//
// Retorno:
//   cJSON com ufOrigem, ufDestino, razões sociais e todos os campos de carga
// ---------------------------------------------------------------------------
Function MCP_SimularRota(cCNPJOrig, cCNPJDest, nFrete)
  Local cUrl    := MCP_BASE_URL + "/simular-rota"
  Local cBody   := ""
  Local cResposta := ""
  Local oHttp

  cBody := '{'
  cBody += '"cnpjOrigem":"'  + cCNPJOrig + '",'
  cBody += '"cnpjDestino":"' + cCNPJDest + '",'
  cBody += '"valorFrete":'   + cValToChar(nFrete)
  cBody += '}'

  oHttp := FWHTTPClient():New()
  oHttp:setURL(cUrl)
  oHttp:setTimeout(MCP_TIMEOUT)
  oHttp:addHeader("Content-Type", "application/json")
  oHttp:addHeader("Accept", "application/json")

  If oHttp:Post(cBody)
    cResposta := oHttp:getBody()
  Else
    cResposta := '{"error":"Falha na conexão com o servidor MCP REST"}'
  EndIf

Return cResposta

// ---------------------------------------------------------------------------
// MCP_ListarEmpresas
// Lista todas as empresas do banco simulado.
//
// Retorno:
//   cJSON com array "empresas" e "totalEmpresas"
// ---------------------------------------------------------------------------
Function MCP_ListarEmpresas()
  Local cUrl    := MCP_BASE_URL + "/empresas"
  Local cResposta := ""
  Local oHttp

  oHttp := FWHTTPClient():New()
  oHttp:setURL(cUrl)
  oHttp:setTimeout(MCP_TIMEOUT)
  oHttp:addHeader("Accept", "application/json")

  If oHttp:Get()
    cResposta := oHttp:getBody()
  Else
    cResposta := '{"error":"Falha na conexão com o servidor MCP REST"}'
  EndIf

Return cResposta

// ---------------------------------------------------------------------------
// Exemplo de uso em um ponto de entrada AdvPL
// Descomente e adapte para testar no console do Protheus
// ---------------------------------------------------------------------------
/*
User Function TesteMCP()
  Local cResp  := ""
  Local oJson  := Nil
  Local nIBS   := 0
  Local nICMS  := 0

  // 1. Calcula carga tributária para um CTe de R$ 5.000 SP->RJ em 2029
  cResp := MCP_CalcCarga(5000, "SP", "RJ", 2029)
  ConOut("Resposta carga: " + cResp)

  // 2. Parse do JSON (Protheus 12.1.2310+ com suporte a JsonObject)
  oJson := JsonObject():New()
  oJson:FromJson(cResp)

  nIBS  := oJson:GetJsonObject("valorIBS")
  nICMS := oJson:GetJsonObject("valorICMS")

  ConOut("IBS:  R$ " + Transform(nIBS,  "@E 9,999.99"))
  ConOut("ICMS: R$ " + Transform(nICMS, "@E 9,999.99"))

  // 3. Consulta cronograma completo de 2030
  cResp := MCP_ConsultaCronograma(2030)
  ConOut("Cronograma 2030: " + cResp)

Return
*/
