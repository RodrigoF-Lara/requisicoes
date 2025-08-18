// filepath: api/statusNF.js
import { getConnection } from "./db.js";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // ESTA QUERY FAZ O INNER JOIN PARA BUSCAR A DESCRIÇÃO
        const result = await pool.request().query(`
            WITH RankedLogs AS (
                SELECT 
                    log.[NF],
                    log.[CODIGO],
                    log.[USUARIO],
                    log.[DT],
                    log.[HH],
                    log.[PROCESSO],
                    log.[ID_NF],
                    log.[ID_NF_PROD],
                    ROW_NUMBER() OVER(PARTITION BY log.[NF], log.[CODIGO] ORDER BY log.[DT] DESC, log.[HH] DESC) as rn
                FROM 
                    [dbo].[TB_LOG_NF] log
            )
            SELECT 
                rl.NF,
                rl.CODIGO,
                cp.DESCRICAO, -- Campo da tabela CAD_PROD
                rl.USUARIO,
                rl.DT,
                CONVERT(varchar(8), rl.HH, 108) as HH,
                rl.PROCESSO,
                rl.ID_NF,
                rl.ID_NF_PROD
            FROM 
                RankedLogs rl
            INNER JOIN 
                [dbo].[CAD_PROD] cp ON rl.CODIGO = cp.CODIGO -- Junção das tabelas
            WHERE 
                rl.rn = 1
            ORDER BY
                rl.DT DESC, rl.HH DESC;
        `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/statusNF:", err);
        res.status(500).json({ message: "Erro interno do servidor ao buscar status.", error: err.message });
    }
}