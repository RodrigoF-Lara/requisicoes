// filepath: api/statusNF.js
import { getConnection, closeConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // A query foi atualizada para formatar a coluna de hora (HH) diretamente no banco de dados.
        // Isso evita problemas de formatação de data/hora no JavaScript.
        const result = await pool.request().query(`
            WITH RankedLogs AS (
                SELECT 
                    [NF],
                    [CODIGO],
                    [USUARIO],
                    [DT],
                    [HH],
                    [PROCESSO],
                    ROW_NUMBER() OVER(PARTITION BY [NF], [CODIGO] ORDER BY [DT] DESC, [HH] DESC) as rn
                FROM 
                    [dbo].[TB_LOG_NF]
            )
            SELECT 
                NF,
                CODIGO,
                USUARIO,
                DT,
                CONVERT(varchar(8), HH, 108) as HH, -- Converte a hora para o formato 'hh:mm:ss'
                PROCESSO
            FROM 
                RankedLogs
            WHERE 
                rn = 1
            ORDER BY
                DT DESC, HH DESC;
        `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/statusNF:", err);
        res.status(500).json({ message: "Erro no servidor ao buscar status da NF", error: err.message });
    } finally {
        await closeConnection();
    }
}
