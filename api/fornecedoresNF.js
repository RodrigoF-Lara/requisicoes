import { getConnection } from "./db.js";
import sql from "mssql";

// GET /api/fornecedoresNF?q=XXXX   → autocomplete por código ou razão social
// GET /api/fornecedoresNF?cod=XXXX → busca exata pelo código

export default async function handler(req, res) {
    if (req.method !== "GET")
        return res.status(405).json({ message: "Método não permitido." });

    const { q, cod } = req.query;

    try {
        const pool = await getConnection();

        if (cod) {
            const result = await pool.request()
                .input("COD", sql.VarChar(20), cod)
                .query(`
                    SELECT COD_FORNECEDOR, RAZAO_SOCIAL
                    FROM [dbo].[CAD_FORNECEDOR]
                    WHERE COD_FORNECEDOR = @COD
                `);

            if (result.recordset.length === 0)
                return res.status(404).json({ message: "Fornecedor não encontrado." });

            return res.status(200).json(result.recordset[0]);
        }

        if (q) {
            const result = await pool.request()
                .input("Q", sql.VarChar(100), `%${q}%`)
                .query(`
                    SELECT TOP 20 COD_FORNECEDOR, RAZAO_SOCIAL
                    FROM [dbo].[CAD_FORNECEDOR]
                    WHERE COD_FORNECEDOR LIKE @Q OR RAZAO_SOCIAL LIKE @Q
                    ORDER BY RAZAO_SOCIAL
                `);
            return res.status(200).json(result.recordset);
        }

        return res.status(400).json({ message: "Informe 'q' ou 'cod'." });

    } catch (err) {
        console.error("ERRO /api/fornecedoresNF:", err);
        return res.status(500).json({ message: "Erro interno do servidor.", error: err.message });
    }
}
