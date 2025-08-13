// filepath: api/consulta.js
import { getConnection } from "./db.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // A query completa, que agora deve funcionar
        const result = await pool.request().query(`
            SELECT 
                H.ID_REQ, 
                H.DT_REQUISICAO, 
                H.STATUS,
                H.PRIORIDADE,
                H.SOLICITANTE,
                (SELECT COUNT(*) FROM [dbo].[TB_REQ_ITEM] I WHERE I.ID_REQ = H.ID_REQ) AS TOTAL_ITENS
            FROM 
                [dbo].[TB_REQUISICOES] H
            ORDER BY 
                H.ID_REQ DESC;
        `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/consulta:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
}