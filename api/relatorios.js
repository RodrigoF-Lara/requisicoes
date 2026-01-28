import { getConnection } from "./db.js";
import sql from "mssql";

// Habilitar CORS
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

export default async function handler(req, res) {
    setCorsHeaders(res);

    // Tratamento de OPTIONS para preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { acao } = req.query;

    if (req.method === "GET") {
        if (acao === 'baixaPorPeriodo') {
            return await relatorioBaixaPorPeriodo(req, res);
        }
        return res.status(400).json({ message: "Ação não reconhecida" });
    }

    return res.status(405).json({ message: "Método não permitido" });
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
        
        // Converte strings para Date corretamente
        const dataInicioObj = new Date(dataInicio + 'T00:00:00Z');
        const dataFimObj = new Date(dataFim + 'T00:00:00Z');
        
        // Adiciona um dia ao dataFim para incluir todo o dia (23:59:59)
        const dataFimAjustada = new Date(dataFimObj);
        dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
        
        // Primeiro, vamos verificar se há dados na tabela
        const verificacao = await pool.request()
            .input('DATA_INICIO', sql.Date, dataInicioObj)
            .input('DATA_FIM', sql.Date, dataFimAjustada)
            .query(`
                SELECT COUNT(*) as TOTAL
                FROM [dbo].[KARDEX_2026] k
                WHERE k.D_E_L_E_T_ <> '*'
                    AND k.OPERACAO = 'SAÍDA'
                    AND k.USUARIO <> 'BEATRIZ JULHAO'
                    AND k.DT >= @DATA_INICIO
                    AND k.DT < @DATA_FIM
            `);

        console.log('📊 Total de registros encontrados:', verificacao.recordset[0].TOTAL);
        
        const result = await pool.request()
            .input('DATA_INICIO', sql.Date, dataInicioObj)
            .input('DATA_FIM', sql.Date, dataFimAjustada)
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
                    AND k.OPERACAO = 'SAÍDA'
                    AND k.USUARIO <> 'BEATRIZ JULHAO'
                    AND k.DT >= @DATA_INICIO
                    AND k.DT < @DATA_FIM
                GROUP BY k.CODIGO, cp.DESCRICAO
                ORDER BY TOTAL_SAIDAS DESC
            `);

        console.log('📦 Produtos agrupados:', result.recordset.length);

        const totalSaidas = result.recordset.reduce((acc, item) => acc + item.TOTAL_SAIDAS, 0);
        const totalProdutos = result.recordset.length;
        const totalMovimentacoes = result.recordset.reduce((acc, item) => acc + item.QUANTIDADE_MOVIMENTACOES, 0);

        console.log('💰 Total de saídas:', totalSaidas);

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
            },
            debug: {
                totalRegistros: verificacao.recordset[0].TOTAL,
                dataInicioRecebida: dataInicio,
                dataFimRecebida: dataFim,
                dataInicioProcessada: dataInicioObj.toISOString(),
                dataFimProcessada: dataFimAjustada.toISOString()
            }
        });

    } catch (err) {
        console.error("❌ Erro ao gerar relatório de baixa:", err);
        return res.status(500).json({ 
            message: "Erro ao gerar relatório", 
            error: err.message,
            stack: err.stack
        });
    }
}
