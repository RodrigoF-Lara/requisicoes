// filepath: api/consulta.js
import { getConnection } from "./db.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // Usando a query MAIS SIMPLES POSSÍVEL que sabemos que funciona a partir dos seus testes.
        const result = await pool.request().query(`
            SELECT 
                ID_REQ, 
                DT_REQUISICAO, 
                STATUS,
                PRIORIDADE,
                SOLICITANTE
            FROM 
                [dbo].[TB_REQUISICOES]
            ORDER BY 
                ID_REQ DESC;
        `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/consulta:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
}