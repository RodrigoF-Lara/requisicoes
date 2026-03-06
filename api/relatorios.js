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
        } else if (acao === 'consumoMedio') {
            return await gerarRelatorioConsumo(req, res);
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
        
        // Converte strings para Date corretamente SEM subtrair dias
        const dataInicioObj = new Date(dataInicio + 'T00:00:00Z');
        const dataFimObj = new Date(dataFim + 'T00:00:00Z');
        
        // Apenas adiciona 1 dia ao dataFim para incluir todo o último dia (até 23:59:59)
        const dataFimAjustada = new Date(dataFimObj);
        dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
        
        console.log('📅 Data Início (recebida):', dataInicio);
        console.log('📅 Data Fim (recebida):', dataFim);
        console.log('📅 Data Início (processada):', dataInicioObj.toISOString());
        console.log('📅 Data Fim Ajustada (processada):', dataFimAjustada.toISOString());
        
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

async function gerarRelatorioConsumo(req, res) {
    try {
        const { periodo, fornecedor } = req.query;

        if (!periodo) {
            return res.status(400).json({ 
                message: "Período é obrigatório (formato: YYYY-MM)" 
            });
        }

        // Extrai ano e mês
        const [ano, mes] = periodo.split('-');
        
        if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
            return res.status(400).json({ 
                message: "Período inválido (use formato YYYY-MM)" 
            });
        }

        console.log('📊 Gerando relatório de consumo para:', { ano, mes });

        const pool = await getConnection();
        
        // Debug: Verificar quais colunas de fornecedor têm dados
        const debugQuery = `
            SELECT TOP 5
                nc.CAB_ID_NF,
                nc.CAB_NUM_FORN,
                nc.CAB_RAZAO,
                nc.CAB_NUM_NF,
                nc.CAB_DT_EMISSAO
            FROM [dbo].[NF_CABECALHO] nc
            WHERE nc.CAB_RAZAO IS NOT NULL
            ORDER BY nc.CAB_DT_EMISSAO DESC
        `;
        
        const debugResult = await pool.request().query(debugQuery);
        console.log('🔍 DEBUG - Amostra de fornecedores em NF_CABECALHO:', debugResult.recordset);
        
        // Query para buscar saldo atual, preço da última NF e fornecedor
        let query = `
            WITH SaldoAtual AS (
                SELECT 
                    CODIGO,
                    ISNULL(SUM(SALDO), 0) AS SALDO_ATUAL
                FROM [dbo].[KARDEX_2026_EMBALAGEM]
                WHERE D_E_L_E_T_ <> '*'
                GROUP BY CODIGO
                HAVING ISNULL(SUM(SALDO), 0) > 0
            ),
            UltimaNFPorProduto AS (
                SELECT 
                    np.PROD_COD_PROD AS CODIGO,
                    np.PROD_CUSTO_FISCAL_MEDIO_NOVO AS PRECO_UNITARIO,
                    nc.CAB_NUM_FORN AS COD_FORNECEDOR,
                    nc.CAB_DT_EMISSAO,
                    ROW_NUMBER() OVER (PARTITION BY np.PROD_COD_PROD ORDER BY nc.CAB_DT_EMISSAO DESC) AS RN
                FROM [dbo].[NF_PRODUTOS] np
                INNER JOIN [dbo].[NF_CABECALHO] nc ON np.PROD_ID_NF = nc.CAB_ID_NF
                WHERE np.PROD_CUSTO_FISCAL_MEDIO_NOVO IS NOT NULL 
                    AND np.PROD_CUSTO_FISCAL_MEDIO_NOVO > 0
            ),
            UltimaFornecedor AS (
                SELECT 
                    unf.CODIGO,
                    unf.PRECO_UNITARIO,
                    unf.COD_FORNECEDOR,
                    ISNULL(cf.RAZAO_SOCIAL, 'NÃO INFORMADO') AS FORNECEDOR,
                    unf.CAB_DT_EMISSAO
                FROM UltimaNFPorProduto unf
                LEFT JOIN [dbo].[CAD_FORNECEDOR] cf ON unf.COD_FORNECEDOR = cf.COD_FORNECEDOR
                WHERE unf.RN = 1
            )
            SELECT 
                sa.CODIGO,
                sa.SALDO_ATUAL,
                ISNULL(cp.DESCRICAO, 'SEM DESCRIÇÃO') AS DESCRICAO,
                ISNULL(uf.PRECO_UNITARIO, 0) AS PRECO_UNITARIO,
                ISNULL(sa.SALDO_ATUAL, 0) * ISNULL(uf.PRECO_UNITARIO, 0) AS VALOR_TOTAL_ESTOQUE,
                ISNULL(uf.FORNECEDOR, 'NÃO INFORMADO') AS FORNECEDOR,
                uf.CAB_DT_EMISSAO
            FROM SaldoAtual sa
            LEFT JOIN [dbo].[CAD_PROD] cp ON sa.CODIGO = cp.CODIGO
            LEFT JOIN UltimaFornecedor uf ON sa.CODIGO = uf.CODIGO
            WHERE ISNULL(uf.PRECO_UNITARIO, 0) > 0
        `;

        // Adiciona filtro de fornecedor se especificado
        if (fornecedor && fornecedor.trim()) {
            query += ` AND uf.FORNECEDOR LIKE '%' + @FORNECEDOR + '%'`;
        }

        query += ` ORDER BY VALOR_TOTAL_ESTOQUE DESC`;

        const request = pool.request();
        
        if (fornecedor && fornecedor.trim()) {
            request.input('FORNECEDOR', sql.NVarChar, fornecedor);
        }

        const result = await request.query(query);

        console.log('📦 Produtos encontrados:', result.recordset.length);
        if (result.recordset.length > 0) {
            console.log('🔍 DEBUG - Primeiros registros:', result.recordset.slice(0, 3));
        }

        if (result.recordset.length === 0) {
            return res.status(200).json({
                dados: [],
                totalizadores: {
                    totalItens: 0,
                    valorTotalEstoque: 0,
                    totalFornecedores: 0
                }
            });
        }

        // Calcula totalizadores
        const totalValor = result.recordset.reduce((acc, item) => {
            return acc + ((item.SALDO_ATUAL || 0) * (item.PRECO_UNITARIO || 0));
        }, 0);

        const fornecedoresUnicos = new Set(
            result.recordset
                .map(item => item.FORNECEDOR)
                .filter(f => f && f !== 'NÃO INFORMADO')
        );

        const totalizadores = {
            totalItens: result.recordset.length,
            valorTotalEstoque: totalValor,
            totalFornecedores: fornecedoresUnicos.size
        };

        console.log('💰 Totais calculados:', totalizadores);

        return res.status(200).json({
            dados: result.recordset,
            totalizadores: totalizadores
        });

    } catch (error) {
        console.error('❌ Erro ao gerar relatório de consumo:', error);
        return res.status(500).json({ 
            message: `Erro ao gerar relatório: ${error.message}` 
        });
    }
}
