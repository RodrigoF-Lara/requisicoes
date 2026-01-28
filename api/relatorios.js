import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    const { acao } = req.query;

    if (req.method === "GET") {
        if (acao === 'baixaPorPeriodo') {
            return await relatorioBaixaPorPeriodo(req, res);
        }
    }

    return res.status(400).json({ message: "Ação não reconhecida" });
}

async function relatorioBaixaPorPeriodo(req, res) {
    try {
        const { dataInicio, dataFim } = req.query;

        if (!dataInicio || !dataFim) {
            return res.status(400).json({ 
                message: "Data de início e fim são obrigatórias" 
            });
        }

        const pool = await getConnection();
        
        const result = await pool.request()
            .input('DATA_INICIO', sql.Date, dataInicio)
            .input('DATA_FIM', sql.Date, dataFim)
            .query(`
                SELECT 
                    k.CODIGO,
                    ISNULL(cp.DESCRICAO, 'SEM DESCRIÇÃO') AS DESCRICAO,
                    SUM(ABS(k.QNT)) AS TOTAL_SAIDAS,
                    COUNT(*) AS QUANTIDADE_MOVIMENTACOES,
                    MIN(k.DT) AS PRIMEIRA_BAIXA,
                    MAX(k.DT) AS ULTIMA_BAIXA
                FROM [dbo].[KARDEX_2026] k
                LEFT JOIN [dbo].[CAD_PROD] cp ON k.CODIGO = cp.CODIGO
                WHERE k.D_E_L_E_T_ <> '*'
                    AND k.OPERACAO = 'SAIDA'
                    AND k.DT >= @DATA_INICIO
                    AND k.DT <= @DATA_FIM
                GROUP BY k.CODIGO, cp.DESCRICAO
                ORDER BY TOTAL_SAIDAS DESC
            `);

        const totalSaidas = result.recordset.reduce((acc, item) => acc + item.TOTAL_SAIDAS, 0);
        const totalProdutos = result.recordset.length;
        const totalMovimentacoes = result.recordset.reduce((acc, item) => acc + item.QUANTIDADE_MOVIMENTACOES, 0);

        return res.status(200).json({
            dados: result.recordset,
            totalizadores: {
                totalSaidas,
                totalProdutos,
                totalMovimentacoes,
                periodo: {
                    inicio: dataInicio,
                    fim: dataFim
                }
            }
        });

    } catch (err) {
        console.error("Erro ao gerar relatório de baixa:", err);
        return res.status(500).json({ 
            message: "Erro ao gerar relatório", 
            error: err.message 
        });
    }
}
