// filepath: api/requisicoes.js
import { getConnection } from "./db.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    let pool; // Variável para armazenar a conexão
    try {
        // Obtém uma nova conexão
        pool = await getConnection();
        
        // Usaremos a query mais simples que sabemos que funciona
        const result = await pool.request().query(`
            SELECT 
                ID_REQ, 
                DT_REQUISICAO, 
                STATUS,
                PRIORIDADE,
                SOLICITANTE,
                0 AS TOTAL_ITENS
            FROM 
                [dbo].[TB_REQUISICOES]
            ORDER BY 
                ID_REQ DESC;
        `);
        
        // Envia a resposta de sucesso
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/requisicoes:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    } finally {
        // Bloco FINALLY: Este código SEMPRE será executado, havendo erro ou não.
        // É crucial para garantir que a conexão seja fechada.
        if (pool) {
            pool.close();
        }
    }
}