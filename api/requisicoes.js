// filepath: api/requisicoes.js
import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    // Permite apenas o método GET
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // Query para buscar um resumo de cada requisição principal
        const result = await pool.request().query(`
            SELECT 
                H.ID_REQ, 
                H.DT_REQUISICAO, 
                H.STATUS,
                H.PRIORIDADE,
                H.SOLICITANTE,
                (SELECT COUNT(*) FROM TB_REQ_ITEM I WHERE I.ID_REQ = H.ID_REQ) AS TOTAL_ITENS
            FROM 
                TB_REQUISICOES H
            ORDER BY 
                H.ID_REQ DESC;
        `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("Erro ao consultar requisições:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
}