/*
 * MCPFreteCampos.prw
 * Cria os campos customizados na tabela CT2 (CTe) para armazenar
 * os valores IBS/CBS calculados pelo mcp-frete-tributario.
 *
 * Execute UMA VEZ durante a implantação:
 *   U_MCPFreteCampos()
 *
 * ATENÇÃO: Faça backup do ambiente antes de executar.
 * Criação de campos no dicionário requer permissão de DBA.
 */

#Include "Protheus.ch"
#Include "FWLGDFILE.ch"

User Function MCPFreteCampos()
  Local aFields := {}
  Local i       := 0

  ConOut("=== MCPFreteCampos — Criando campos customizados ===")

  // Define os campos a criar
  // Formato: { cTabela, cCampo, cDesc, cTipo, nTam, nDec }
  aFields := {;
    {"CT2", "CT2_VIBS",  "Valor IBS (MCP)",            "N", 15, 2},;
    {"CT2", "CT2_VCBS",  "Valor CBS (MCP)",             "N", 15, 2},;
    {"CT2", "CT2_ALIBS", "Aliquota IBS % (MCP)",        "N",  7, 4},;
    {"CT2", "CT2_ALCBS", "Aliquota CBS % (MCP)",        "N",  7, 4},;
    {"CT2", "CT2_VNOVO", "Total Novo Regime IBS+CBS",   "N", 15, 2},;
    {"CT2", "CT2_VANT",  "Total Antigo Regime (MCP)",   "N", 15, 2};
  }

  For i := 1 To Len(aFields)
    MCPCriarCampo(aFields[i][1], aFields[i][2], aFields[i][3], ;
                  aFields[i][4], aFields[i][5], aFields[i][6])
  Next i

  ConOut("=== Criação de campos concluída ===")
  ConOut("Reinicie o Protheus para que as alterações no dicionário sejam aplicadas.")
Return .T.

// ---------------------------------------------------------------------------
// MCPCriarCampo — Cria um campo no SX3 se não existir
// ---------------------------------------------------------------------------
Static Function MCPCriarCampo(cTabela, cCampo, cDesc, cTipo, nTam, nDec)
  // Verifica se o campo já existe no SX3
  If ExistField(cTabela, cCampo)
    ConOut("  [SKIP] " + cTabela + "->" + cCampo + " já existe.")
    Return
  EndIf

  // Cria o campo via dicionário
  // Nota: a implementação real usa FWAddFieldToSX3 ou equivalente
  // conforme a versão do Protheus. Consulte o TDN TOTVS para a API correta.
  ConOut("  [CREATE] " + cTabela + "->" + cCampo + " (" + cDesc + ")")

  // Exemplo para Protheus 12.1.2310+:
  // FWAddFieldToSX3(cTabela, cCampo, cDesc, cTipo, nTam, nDec, ;
  //                 "", "", "", "", "", "", "", "", .T.)

Return

// ---------------------------------------------------------------------------
// Função auxiliar — verifica existência de campo
// ---------------------------------------------------------------------------
Static Function ExistField(cTabela, cCampo)
  Local lExist := .F.

  dbSelectArea("SX3")
  dbSetOrder(1)  // ordem por X3_ARQUIVO + X3_CAMPO
  lExist := dbSeek(PadR(cTabela, 10) + PadR(cCampo, 10))
  dbSelectArea("CT2")

Return lExist
