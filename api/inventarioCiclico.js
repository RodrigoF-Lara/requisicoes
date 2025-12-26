import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { acao } = req.query;

    if (acao === 'gerarLista') {
        try {
            const pool = await getConnection();
            
            // Busca os 10 itens mais movimentados nos últimos 7 dias
            const result = await pool.request()
                .query(`
                    WITH Movimentacoes AS (
                        SELECT 
                            k.CODIGO,
                            COUNT(*) AS TOTAL_MOVIMENTACOES,
                            SUM(ABS(k.QNT)) AS TOTAL_QUANTIDADE_MOVIMENTADA
                        FROM [dbo].[KARDEX_2025] k
                        WHERE 
                            k.DT >= DATEADD(DAY, -7, GETDATE())
                            AND k.D_E_L_E_T_ <> '*'
                        GROUP BY k.CODIGO
                    ),
                    SaldoAtual AS (
                        SELECT 
                            CODIGO,
                            ISNULL(SUM(SALDO), 0) AS SALDO_ATUAL
                        FROM [dbo].[KARDEX_2025_EMBALAGEM]
                        WHERE D_E_L_E_T_ <> '*'
                        GROUP BY CODIGO
                    )
                    SELECT TOP 10
                        m.CODIGO,
                        cp.DESCRICAO,
                        m.TOTAL_MOVIMENTACOES,
                        m.TOTAL_QUANTIDADE_MOVIMENTADA,
                        ISNULL(s.SALDO_ATUAL, 0) AS SALDO_ATUAL
                    FROM Movimentacoes m
                    LEFT JOIN [dbo].[CAD_PROD] cp ON m.CODIGO = cp.CODIGO
                    LEFT JOIN SaldoAtual s ON m.CODIGO = s.CODIGO
                    ORDER BY m.TOTAL_MOVIMENTACOES DESC, m.TOTAL_QUANTIDADE_MOVIMENTADA DESC;
                `);

            return res.status(200).json({
                itens: result.recordset,
                dataGeracao: new Date().toISOString(),
                criterio: 'TOP 10 mais movimentados nos últimos 7 dias'
            });

        } catch (err) {
            console.error("ERRO NO ENDPOINT /api/inventarioCiclico:", err);
            return res.status(500).json({ 
                message: "Erro ao gerar lista de inventário", 
                error: err.message 
            });
        }
    }

    return res.status(400).json({ message: "Ação não especificada ou inválida" });
}
