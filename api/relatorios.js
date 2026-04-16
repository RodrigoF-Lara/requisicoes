import { getConnection, sql } from "../db.js";

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
        } else if (acao === 'movimentacoesProduto') {
            return await movimentacoesProduto(req, res);
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
                -- WHERE k.D_E_L_E_T_ <> '*'
                WHERE k.OPERACAO = 'SAÍDA'
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
                -- WHERE k.D_E_L_E_T_ <> '*'
                WHERE k.OPERACAO = 'SAÍDA'
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
        
        // Query para buscar saldo atual, preço da última NF e fornecedor
        // Data de corte: apenas movimentações a partir de Abril/2026
        const DATA_CORTE = '2026-04-01';

        let query = `
            WITH SaldoAtual AS (
                SELECT 
                    CODIGO,
                    ISNULL(SUM(SALDO), 0) AS SALDO_ATUAL
                FROM [dbo].[KARDEX_2026_EMBALAGEM]
                WHERE D_E_L_E_T_ <> '*'
                    AND KARDEX = 2026
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
            ),
            ConsumoMedio AS (
                SELECT 
                    k.CODIGO,
                    -- Consumo 1 mês: saídas nos últimos 30 dias (a partir de abr/2026)
                    ISNULL(SUM(CASE WHEN k.DT >= DATEADD(DAY, -30, GETDATE()) AND k.DT >= '${DATA_CORTE}' THEN ABS(k.QNT) ELSE 0 END) / 30.0, 0) AS CONSUMO_1MES,
                    -- Consumo bimestral: saídas nos últimos 60 dias (a partir de abr/2026)
                    ISNULL(SUM(CASE WHEN k.DT >= DATEADD(DAY, -60, GETDATE()) AND k.DT >= '${DATA_CORTE}' THEN ABS(k.QNT) ELSE 0 END) / 60.0 * 2, 0) AS CONSUMO_BIMESTRAL,
                    -- Consumo semestral: saídas nos últimos 180 dias (a partir de abr/2026)
                    ISNULL(SUM(CASE WHEN k.DT >= DATEADD(DAY, -180, GETDATE()) AND k.DT >= '${DATA_CORTE}' THEN ABS(k.QNT) ELSE 0 END) / 180.0 * 6, 0) AS CONSUMO_SEMESTRAL,
                    -- Consumo anual: saídas nos últimos 365 dias (a partir de abr/2026)
                    ISNULL(SUM(CASE WHEN k.DT >= DATEADD(DAY, -365, GETDATE()) AND k.DT >= '${DATA_CORTE}' THEN ABS(k.QNT) ELSE 0 END) / 365.0 * 12, 0) AS CONSUMO_ANUAL
                FROM [dbo].[KARDEX_2026] k
                WHERE k.OPERACAO = 'SAÍDA'
                    AND k.USUARIO <> 'BEATRIZ JULHAO'
                    AND k.DT >= '${DATA_CORTE}'
                GROUP BY k.CODIGO
            )
            SELECT 
                sa.CODIGO,
                sa.SALDO_ATUAL,
                ISNULL(cp.DESCRICAO, 'SEM DESCRIÇÃO') AS DESCRICAO,
                ISNULL(uf.PRECO_UNITARIO, 0) AS PRECO_UNITARIO,
                ISNULL(sa.SALDO_ATUAL, 0) * ISNULL(uf.PRECO_UNITARIO, 0) AS VALOR_TOTAL_ESTOQUE,
                ISNULL(uf.FORNECEDOR, 'NÃO INFORMADO') AS FORNECEDOR,
                ISNULL(cm.CONSUMO_1MES, 0) AS CONSUMO_MEDIO_1MES,
                ISNULL(cm.CONSUMO_BIMESTRAL, 0) AS CONSUMO_MEDIO_BIMESTRAL,
                ISNULL(cm.CONSUMO_SEMESTRAL, 0) AS CONSUMO_MEDIO_SEMESTRAL,
                ISNULL(cm.CONSUMO_ANUAL, 0) AS CONSUMO_MEDIO_ANUAL,
                uf.CAB_DT_EMISSAO
            FROM SaldoAtual sa
            LEFT JOIN [dbo].[CAD_PROD] cp ON sa.CODIGO = cp.CODIGO
            LEFT JOIN UltimaFornecedor uf ON sa.CODIGO = uf.CODIGO
            LEFT JOIN ConsumoMedio cm ON sa.CODIGO = cm.CODIGO
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

async function movimentacoesProduto(req, res) {
    try {
        const { codigo, janela } = req.query;
        if (!codigo) return res.status(400).json({ message: 'Código é obrigatório' });

        const janelaDias = parseInt(janela) || 30;
        const DATA_CORTE = '2026-04-01';

        const pool = await getConnection();
        const result = await pool.request()
            .input('CODIGO', sql.VarChar(20), codigo)
            .input('JANELA', sql.Int, janelaDias)
            .query(`
                SELECT
                    ID,
                    DT,
                    CONVERT(VARCHAR(8), HR, 108) AS HR,
                    OPERACAO,
                    QNT,
                    USUARIO,
                    MOTIVO
                FROM [dbo].[KARDEX_2026]
                WHERE CODIGO = @CODIGO
                    AND OPERACAO = 'SAÍDA'
                    AND USUARIO <> 'BEATRIZ JULHAO'
                    AND DT >= '2026-04-01'
                    AND DT >= DATEADD(DAY, -@JANELA, GETDATE())
                ORDER BY DT DESC, HR DESC
            `);

        const totalSaidas = result.recordset.reduce((acc, m) => acc + Math.abs(m.QNT || 0), 0);

        return res.status(200).json({
            movimentacoes: result.recordset,
            totalSaidas
        });
    } catch (error) {
        console.error('❌ Erro ao buscar movimentações:', error);
        return res.status(500).json({ message: `Erro: ${error.message}` });
    }
}
