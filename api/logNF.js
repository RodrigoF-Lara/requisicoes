// filepath: api/logNF.js
import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { nf, codigo } = req.query;

    if (!nf || !codigo) {
        return res.status(400).json({ message: "Os parâmetros 'nf' e 'codigo' são obrigatórios." });
    }

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('NF', sql.NVarChar, nf)
            .input('CODIGO', sql.NVarChar, codigo)
            .query(`
                SELECT 
                    USUARIO,
                    DT,
                    CONVERT(varchar(8), HH, 108) as HH,
                    PROCESSO
                FROM 
                    [dbo].[TB_LOG_NF]
                WHERE 
                    NF = @NF AND CODIGO = @CODIGO
                ORDER BY 
                    DT DESC, HH DESC;
            `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/logNF:", err);
        res.status(500).json({ message: "Erro interno do servidor ao buscar o log." });
    }
}