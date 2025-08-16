// filepath: /api/statusNF.js
import { getConnection, closeConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // Esta query usa uma Common Table Expression (CTE) com ROW_NUMBER()
        // para encontrar o último registro de cada combinação de NF e CODIGO,
        // ordenando pela data e hora de forma decrescente.
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
                HH,
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
        // Embora não seja estritamente necessário em ambientes serverless, é uma boa prática.
        await closeConnection();
    }
}