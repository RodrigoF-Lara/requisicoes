// filepath: api/requisicoes.js
import { getConnection } from "./db.js";

export default async function handler(req, res) {
    // Log 1: Confirma que a função foi acionada
    console.log("LOG: A função /api/requisicoes foi chamada.");

    if (req.method !== "GET") {
        console.log(`LOG: Método ${req.method} não permitido, encerrando.`);
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        console.log("LOG: Tentando obter conexão com o banco de dados...");
        const pool = await getConnection();
        console.log("LOG: Conexão com o banco de dados obtida.");

        const query = `
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
        `;

        // Log 2: Mostra a query exata que será executada
        console.log("LOG: Executando a seguinte query SQL:", query);

        const result = await pool.request().query(query);
        
        console.log(`LOG: Query executada com sucesso. ${result.recordset.length} registros encontrados.`);
        res.status(200).json(result.recordset);

    } catch (err) {
        // Log 3: Captura e exibe o erro completo no servidor
        console.error("ERRO COMPLETO NO CATCH:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
}