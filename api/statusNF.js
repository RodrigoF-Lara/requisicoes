// filepath: api/statusNF.js
import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const tipoProduto = req.query.tipoProduto || 'EMBALAGEM';

    try {
        const pool = await getConnection();
        
        let tipoWhereCondition = "cp.TIPO = @tipoProduto";
        if (tipoProduto === 'OUTROS') {
            tipoWhereCondition = "cp.TIPO <> 'EMBALAGEM'";
        }
        
        const result = await pool.request()
            .input('tipoProduto', sql.VarChar, tipoProduto)
            .query(`
                WITH RankedLogs AS (
                    SELECT 
                        log.[NF], log.[CODIGO], log.[USUARIO], log.[DT],
                        log.[HH], log.[PROCESSO], log.[ID_NF], log.[ID_NF_PROD],
                        log.[QNT], -- <<< CAMPO ADICIONADO AQUI
                        ROW_NUMBER() OVER(PARTITION BY log.[NF], log.[CODIGO] ORDER BY log.[DT] DESC, log.[HH] DESC) as rn
                    FROM [dbo].[TB_LOG_NF] log
                )
                SELECT 
                    rl.NF, rl.CODIGO, cp.DESCRICAO, rl.USUARIO, rl.DT,
                    CONVERT(varchar(8), rl.HH, 108) as HH,
                    rl.PROCESSO, rl.ID_NF, rl.ID_NF_PROD,
                    rl.QNT -- <<< CAMPO ADICIONADO AQUI
                FROM RankedLogs rl
                INNER JOIN [dbo].[CAD_PROD] cp ON rl.CODIGO = cp.CODIGO
                WHERE rl.rn = 1 AND (${tipoWhereCondition})
                ORDER BY rl.DT DESC, rl.HH DESC;
            `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/statusNF:", err);
        res.status(500).json({ message: "Erro interno do servidor ao buscar status.", error: err.message });
    }
}