/**
 * Configuração central do servidor REST.
 * Altere PORT para mudar a porta padrão ou use a variável de ambiente PORT.
 */

export const PORT = process.env["PORT"] ?? "3001";

/**
 * Caminhos para os arquivos de dados do mcp-frete-tributario.
 * Estes apontam para os arquivos na raiz do projeto pai (após npm run build lá).
 *
 * Ajuste DATA_DIR se a estrutura de pastas mudar.
 */
export const DATA_DIR = process.env["DATA_DIR"] ?? "../../data";
