// filepath: api/requisicoes.js
import { getConnection } from "./db.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // VERSÃO DE TESTE: A sub-consulta que conta os itens foi REMOVIDA.
        // O campo TOTAL_ITENS terá um valor fixo de 0 por enquanto.
        const result = await pool.request().query(`
            SELECT 
                H.ID_REQ, 
                H.DT_REQUISICAO, 
                H.STATUS,
                H.PRIORIDADE,
                H.SOLICITANTE,
                0 AS TOTAL_ITENS 
            FROM 
                [dbo].[TB_REQUISICOES] H
            ORDER BY 
                H.ID_REQ DESC;
        `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NA VERSÃO SIMPLIFICADA:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
}