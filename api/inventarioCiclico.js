import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    const { acao } = req.query;

    // GET: Gerar, Listar ou Abrir inventário
    if (req.method === "GET") {
        if (acao === 'gerarLista') {
            return await gerarListaInventario(req, res);
        } else if (acao === 'listar') {
            return await listarInventarios(req, res);
        } else if (acao === 'abrir') {
            return await abrirInventario(req, res);
        }
    }

    // POST: Salvar, Finalizar ou Salvar Contagem
    if (req.method === "POST") {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { acao } = body;
        if (acao === 'salvar') {
            return await salvarInventario(req, res);
        } else if (acao === 'finalizar') {
            return await finalizarInventario(req, res);
        } else if (acao === 'salvarContagem') {
            return await salvarContagemIndividual(req, res);
        }
    }

    return res.status(400).json({ message: "Ação não especificada ou inválida" });
}

// Gera uma nova lista de inventário com 3 blocos
async function gerarListaInventario(req, res) {
    try {
        const pool = await getConnection();
        const todosItens = [];
        
        // BUSCA AS CONFIGURAÇÕES SALVAS
        const configResult = await pool.request().query(`
            SELECT TOP 1 *
            FROM [dbo].[TB_CONFIG_INVENTARIO]
            ORDER BY ID_CONFIG DESC;
        `);

        if (configResult.recordset.length === 0) {
            return res.status(500).json({ 
                message: "Configurações de inventário não encontradas. Configure primeiro em Configurações." 
            });
        }

        const config = configResult.recordset[0];
        const BLOCO1_QTD = config.BLOCO1_QTD_ITENS;
        const BLOCO1_DIAS = config.BLOCO1_DIAS_MOVIMENTACAO;
        const BLOCO2_QTD = config.BLOCO2_QTD_ITENS;
        const BLOCO2_ACURACIDADE = config.BLOCO2_ACURACIDADE_MIN;
        const BLOCO3_QTD = config.BLOCO3_QTD_ITENS;

        console.log('📋 Configurações carregadas:', {
            BLOCO1_QTD,
            BLOCO1_DIAS,
            BLOCO2_QTD,
            BLOCO2_ACURACIDADE,
            BLOCO3_QTD
        });
        
        // BLOCO 1: Mais movimentados (usando configuração)
        try {
            const bloco1 = await pool.request()
                .input('DIAS', sql.Int, BLOCO1_DIAS)
                .input('QTD_ITENS', sql.Int, BLOCO1_QTD)
                .query(`
                WITH Movimentacoes AS (
                    SELECT 
                        k.CODIGO,
                        COUNT(*) AS TOTAL_MOVIMENTACOES,
                        SUM(ABS(k.QNT)) AS TOTAL_QUANTIDADE_MOVIMENTADA
                    FROM [dbo].[KARDEX_2025] k
                    WHERE 
                        k.DT >= DATEADD(DAY, -@DIAS, GETDATE())
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
                ),
                CustoUnitario AS (
                    SELECT 
                        np.PROD_COD_PROD AS CODIGO,
                        np.PROD_CUSTO_FISCAL_MEDIO_NOVO AS CUSTO_UNIT,
                        ROW_NUMBER() OVER (PARTITION BY np.PROD_COD_PROD ORDER BY nc.CAB_DT_EMISSAO DESC) AS RN
                    FROM [dbo].[NF_PRODUTOS] np
                    INNER JOIN [dbo].[NF_CABECALHO] nc ON np.PROD_ID_NF = nc.CAB_ID_NF
                    WHERE np.PROD_CUSTO_FISCAL_MEDIO_NOVO IS NOT NULL 
                        AND np.PROD_CUSTO_FISCAL_MEDIO_NOVO > 0
                )
                SELECT TOP (@QTD_ITENS)
                    m.CODIGO,
                    ISNULL(cp.DESCRICAO, 'SEM DESCRIÇÃO') AS DESCRICAO,
                    m.TOTAL_MOVIMENTACOES,
                    m.TOTAL_QUANTIDADE_MOVIMENTADA,
                    ISNULL(s.SALDO_ATUAL, 0) AS SALDO_ATUAL,
                    ISNULL(cu.CUSTO_UNIT, 0) AS CUSTO_UNITARIO,
                    ISNULL(s.SALDO_ATUAL, 0) * ISNULL(cu.CUSTO_UNIT, 0) AS VALOR_TOTAL_ESTOQUE,
                    'MOVIMENTACAO' AS BLOCO
                FROM Movimentacoes m
                LEFT JOIN [dbo].[CAD_PROD] cp ON m.CODIGO = cp.CODIGO
                LEFT JOIN SaldoAtual s ON m.CODIGO = s.CODIGO
                LEFT JOIN CustoUnitario cu ON m.CODIGO = cu.CODIGO AND cu.RN = 1
                ORDER BY m.TOTAL_MOVIMENTACOES DESC, m.TOTAL_QUANTIDADE_MOVIMENTADA DESC;
            `);
            console.log(`✅ Bloco 1 retornou ${bloco1.recordset.length} itens`);
            todosItens.push(...bloco1.recordset);
        } catch (err) {
            console.warn('Erro ao buscar bloco 1 (movimentação):', err.message);
        }

        const codigosBloco1 = todosItens.map(item => item.CODIGO);
        
        // BLOCO 2: Itens com acuracidade < 95% do último inventário FINALIZADO
        try {
            // Primeiro, vamos verificar qual é o último inventário finalizado
            const ultimoInv = await pool.request().query(`
                SELECT TOP 1 ID_INVENTARIO, STATUS, DT_CRIACAO
                FROM [dbo].[TB_INVENTARIO_CICLICO]
                WHERE STATUS = 'FINALIZADO'
                ORDER BY ID_INVENTARIO DESC;
            `);
            
            console.log('🔍 Último inventário FINALIZADO encontrado:', ultimoInv.recordset);
            
            if (ultimoInv.recordset.length === 0) {
                console.log('⚠️ Nenhum inventário FINALIZADO encontrado. Pulando Bloco 2.');
            } else {
                const idUltimoInventario = ultimoInv.recordset[0].ID_INVENTARIO;
                console.log(`📋 Buscando itens com acuracidade < ${BLOCO2_ACURACIDADE}% do inventário #${idUltimoInventario}`);
                
                const bloco2 = await pool.request()
                    .input('ID_INV', sql.Int, idUltimoInventario)
                    .input('ACURACIDADE_MIN', sql.Float, BLOCO2_ACURACIDADE)
                    .input('QTD_ITENS', sql.Int, BLOCO2_QTD)
                    .query(`
                    WITH ItensBaixaAcuracidade AS (
                        SELECT 
                            i.CODIGO,
                            i.DESCRICAO,
                            i.ACURACIDADE,
                            i.SALDO_SISTEMA
                        FROM [dbo].[TB_INVENTARIO_CICLICO_ITEM] i
                        WHERE i.ID_INVENTARIO = @ID_INV
                            AND i.ACURACIDADE < @ACURACIDADE_MIN
                            ${codigosBloco1.length > 0 ? `AND i.CODIGO NOT IN ('${codigosBloco1.join("','")}')` : ''}
                    ),
                    SaldoAtual AS (
                        SELECT 
                            CODIGO,
                            ISNULL(SUM(SALDO), 0) AS SALDO_ATUAL
                        FROM [dbo].[KARDEX_2025_EMBALAGEM]
                        WHERE D_E_L_E_T_ <> '*'
                        GROUP BY CODIGO
                    ),
                    CustoUnitario AS (
                        SELECT 
                            np.PROD_COD_PROD AS CODIGO,
                            np.PROD_CUSTO_FISCAL_MEDIO_NOVO AS CUSTO_UNIT,
                            ROW_NUMBER() OVER (PARTITION BY np.PROD_COD_PROD ORDER BY nc.CAB_DT_EMISSAO DESC) AS RN
                        FROM [dbo].[NF_PRODUTOS] np
                        INNER JOIN [dbo].[NF_CABECALHO] nc ON np.PROD_ID_NF = nc.CAB_ID_NF
                        WHERE np.PROD_CUSTO_FISCAL_MEDIO_NOVO IS NOT NULL 
                            AND np.PROD_CUSTO_FISCAL_MEDIO_NOVO > 0
                    )
                    SELECT TOP (@QTD_ITENS)
                        iba.CODIGO,
                        iba.DESCRICAO,
                        iba.ACURACIDADE AS ACURACIDADE_ANTERIOR,
                        ISNULL(s.SALDO_ATUAL, 0) AS SALDO_ATUAL,
                        ISNULL(cu.CUSTO_UNIT, 0) AS CUSTO_UNITARIO,
                        ISNULL(s.SALDO_ATUAL, 0) * ISNULL(cu.CUSTO_UNIT, 0) AS VALOR_TOTAL_ESTOQUE,
                        'BAIXA_ACURACIDADE' AS BLOCO
                    FROM ItensBaixaAcuracidade iba
                    LEFT JOIN SaldoAtual s ON iba.CODIGO = s.CODIGO
                    LEFT JOIN CustoUnitario cu ON iba.CODIGO = cu.CODIGO AND cu.RN = 1
                    ORDER BY iba.ACURACIDADE ASC;
                `);

                console.log(`✅ Bloco 2 retornou ${bloco2.recordset.length} itens`);
                todosItens.push(...bloco2.recordset);
            }
        } catch (err) {
            console.error('❌ Erro COMPLETO ao buscar bloco 2:', err);
        }

        const codigosBloco2 = todosItens.map(item => item.CODIGO);

        // BLOCO 3: Maior valor em estoque (usando configuração)
        try {
            const bloco3 = await pool.request()
                .input('QTD_ITENS', sql.Int, BLOCO3_QTD)
                .query(`
                WITH UltimaNFPorProduto AS (
                    SELECT 
                        np.PROD_COD_PROD AS CODIGO,
                        np.PROD_CUSTO_FISCAL_MEDIO_NOVO AS CUSTO_UNITARIO,
                        nc.CAB_DT_EMISSAO,
                        ROW_NUMBER() OVER (PARTITION BY np.PROD_COD_PROD ORDER BY nc.CAB_DT_EMISSAO DESC) AS RN
                    FROM [dbo].[NF_PRODUTOS] np
                    INNER JOIN [dbo].[NF_CABECALHO] nc ON np.PROD_ID_NF = nc.CAB_ID_NF
                    WHERE np.PROD_CUSTO_FISCAL_MEDIO_NOVO IS NOT NULL 
                        AND np.PROD_CUSTO_FISCAL_MEDIO_NOVO > 0
                ),
                CustoMaisRecente AS (
                    SELECT CODIGO, CUSTO_UNITARIO
                    FROM UltimaNFPorProduto
                    WHERE RN = 1
                ),
                SaldoAtual AS (
                    SELECT 
                        CODIGO,
                        ISNULL(SUM(SALDO), 0) AS SALDO_ATUAL
                    FROM [dbo].[KARDEX_2025_EMBALAGEM]
                    WHERE D_E_L_E_T_ <> '*'
                    GROUP BY CODIGO
                    HAVING ISNULL(SUM(SALDO), 0) > 0
                ),
                SaldoValorizado AS (
                    SELECT 
                        s.CODIGO,
                        s.SALDO_ATUAL,
                        ISNULL(c.CUSTO_UNITARIO, 0) AS CUSTO_UNITARIO,
                        s.SALDO_ATUAL * ISNULL(c.CUSTO_UNITARIO, 0) AS VALOR_TOTAL_ESTOQUE
                    FROM SaldoAtual s
                    LEFT JOIN CustoMaisRecente c ON s.CODIGO = c.CODIGO
                    WHERE c.CUSTO_UNITARIO IS NOT NULL
                        ${codigosBloco2.length > 0 ? `AND s.CODIGO NOT IN ('${codigosBloco2.join("','")}')` : ''}
                )
                SELECT TOP (@QTD_ITENS)
                    sv.CODIGO,
                    ISNULL(cp.DESCRICAO, 'SEM DESCRIÇÃO') AS DESCRICAO,
                    sv.SALDO_ATUAL,
                    sv.CUSTO_UNITARIO AS PRECO_UNITARIO,
                    sv.VALOR_TOTAL_ESTOQUE,
                    'MAIOR_VALOR' AS BLOCO
                FROM SaldoValorizado sv
                LEFT JOIN [dbo].[CAD_PROD] cp ON sv.CODIGO = cp.CODIGO
                ORDER BY sv.VALOR_TOTAL_ESTOQUE DESC;
            `);
            
            console.log(`✅ Bloco 3 retornou ${bloco3.recordset.length} itens`);
            todosItens.push(...bloco3.recordset);
        } catch (err) {
            console.error('❌ Erro ao buscar bloco 3:', err);
        }

        // Conta itens por bloco
        const blocosCont = {
            movimentacao: todosItens.filter(i => i.BLOCO === 'MOVIMENTACAO').length,
            baixaAcuracidade: todosItens.filter(i => i.BLOCO === 'BAIXA_ACURACIDADE').length,
            maiorValor: todosItens.filter(i => i.BLOCO === 'MAIOR_VALOR').length
        };

        if (todosItens.length === 0) {
            return res.status(400).json({ 
                message: "Nenhum item encontrado para inventário. Verifique se há dados no sistema." 
            });
        }

        // Calcula valor total geral
        const valorTotalGeral = todosItens.reduce((sum, item) => sum + (item.VALOR_TOTAL_ESTOQUE || 0), 0);

        console.log('📊 Resumo dos blocos:', blocosCont);
        console.log('💰 Valor total em estoque:', valorTotalGeral.toFixed(2));

        return res.status(200).json({
            itens: todosItens,
            dataGeracao: new Date().toISOString(),
            criterio: `Bloco 1: ${blocosCont.movimentacao} mais movimentados (${BLOCO1_DIAS} dias) | Bloco 2: ${blocosCont.baixaAcuracidade} com acuracidade < ${BLOCO2_ACURACIDADE}% | Bloco 3: ${blocosCont.maiorValor} maior valor`,
            blocos: blocosCont,
            valorTotalGeral: valorTotalGeral,
            configuracao: {
                bloco1Qtd: BLOCO1_QTD,
                bloco1Dias: BLOCO1_DIAS,
                bloco2Qtd: BLOCO2_QTD,
                bloco2Acuracidade: BLOCO2_ACURACIDADE,
                bloco3Qtd: BLOCO3_QTD
            }
        });

    } catch (err) {
        console.error("ERRO DETALHADO ao gerar lista:", err);
        return res.status(500).json({ 
            message: "Erro ao gerar lista de inventário", 
            error: err.message,
            stack: err.stack 
        });
    }
}

// Salva um novo inventário
async function salvarInventario(req, res) {
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { inventario, usuario } = body;
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Calcula valor total geral
        const valorTotalGeral = inventario.itens.reduce((sum, item) => sum + (item.VALOR_TOTAL_ESTOQUE || 0), 0);

        // Insere o cabeçalho do inventário
        const headerResult = await transaction.request()
            .input('DT_GERACAO', sql.DateTime, new Date(inventario.dataGeracao))
            .input('CRITERIO', sql.NVarChar, inventario.criterio)
            .input('STATUS', sql.NVarChar, 'EM_ANDAMENTO')
            .input('TOTAL_ITENS', sql.Int, inventario.itens.length)
            .input('VALOR_TOTAL_GERAL', sql.Float, valorTotalGeral)
            .input('USUARIO_CRIACAO', sql.NVarChar, usuario)
            .query(`
                INSERT INTO [dbo].[TB_INVENTARIO_CICLICO] 
                (DT_GERACAO, CRITERIO, STATUS, TOTAL_ITENS, VALOR_TOTAL_GERAL, USUARIO_CRIACAO, DT_CRIACAO)
                OUTPUT INSERTED.ID_INVENTARIO
                VALUES (@DT_GERACAO, @CRITERIO, @STATUS, @TOTAL_ITENS, @VALOR_TOTAL_GERAL, @USUARIO_CRIACAO, GETDATE());
            `);

        const idInventario = headerResult.recordset[0].ID_INVENTARIO;

        // Insere os itens do inventário
        for (const item of inventario.itens) {
            await transaction.request()
                .input('ID_INVENTARIO', sql.Int, idInventario)
                .input('CODIGO', sql.NVarChar, item.CODIGO)
                .input('DESCRICAO', sql.NVarChar, item.DESCRICAO)
                .input('SALDO_SISTEMA', sql.Float, item.SALDO_ATUAL || 0)
                .input('CONTAGEM_FISICA', sql.Float, item.CONTAGEM_FISICA || 0)
                .input('TOTAL_MOVIMENTACOES', sql.Int, item.TOTAL_MOVIMENTACOES || 0)
                .input('BLOCO', sql.NVarChar, item.BLOCO || 'MOVIMENTACAO')
                .query(`
                    INSERT INTO [dbo].[TB_INVENTARIO_CICLICO_ITEM]
                    (ID_INVENTARIO, CODIGO, DESCRICAO, SALDO_SISTEMA, CONTAGEM_FISICA, TOTAL_MOVIMENTACOES, BLOCO)
                    VALUES (@ID_INVENTARIO, @CODIGO, @DESCRICAO, @SALDO_SISTEMA, @CONTAGEM_FISICA, @TOTAL_MOVIMENTACOES, @BLOCO);
                `);
        }

        await transaction.commit();

        return res.status(200).json({ 
            message: "Inventário salvo com sucesso",
            idInventario: idInventario
        });

    } catch (err) {
        console.error("ERRO ao salvar inventário:", err);
        return res.status(500).json({ 
            message: "Erro ao salvar inventário", 
            error: err.message 
        });
    }
}

// Lista todos os inventários
async function listarInventarios(req, res) {
    try {
        const pool = await getConnection();
        
        const result = await pool.request().query(`
            SELECT 
                ID_INVENTARIO,
                DT_GERACAO,
                CRITERIO,
                STATUS,
                TOTAL_ITENS,
                ACURACIDADE,
                VALOR_TOTAL_GERAL,
                USUARIO_CRIACAO,
                DT_CRIACAO,
                USUARIO_FINALIZACAO,
                DT_FINALIZACAO
            FROM [dbo].[TB_INVENTARIO_CICLICO]
            ORDER BY ID_INVENTARIO DESC;
        `);

        return res.status(200).json({ inventarios: result.recordset });

    } catch (err) {
        console.error("ERRO ao listar inventários:", err);
        return res.status(500).json({ 
            message: "Erro ao listar inventários", 
            error: err.message 
        });
    }
}

// Abre um inventário específico
async function abrirInventario(req, res) {
    try {
        const { id } = req.query;
        const pool = await getConnection();

        // Busca o cabeçalho
        const headerResult = await pool.request()
            .input('ID_INVENTARIO', sql.Int, id)
            .query(`
                SELECT * FROM [dbo].[TB_INVENTARIO_CICLICO]
                WHERE ID_INVENTARIO = @ID_INVENTARIO;
            `);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ message: "Inventário não encontrado" });
        }

        const header = headerResult.recordset[0];

        // Busca os itens
        const itemsResult = await pool.request()
            .input('ID_INVENTARIO', sql.Int, id)
            .query(`
                SELECT * FROM [dbo].[TB_INVENTARIO_CICLICO_ITEM]
                WHERE ID_INVENTARIO = @ID_INVENTARIO
                ORDER BY CODIGO;
            `);

        // Monta o objeto inventário
        const inventario = {
            id: header.ID_INVENTARIO,
            status: header.STATUS,
            dataGeracao: header.DT_GERACAO,
            criterio: header.CRITERIO,
            acuracidade: header.ACURACIDADE,
            valorTotalGeral: header.VALOR_TOTAL_GERAL || 0,
            itens: itemsResult.recordset.map(item => ({
                CODIGO: item.CODIGO,
                DESCRICAO: item.DESCRICAO,
                SALDO_ATUAL: item.SALDO_SISTEMA,
                CONTAGEM_FISICA: item.CONTAGEM_FISICA,
                TOTAL_MOVIMENTACOES: item.TOTAL_MOVIMENTACOES,
                USUARIO_CONTAGEM: item.USUARIO_CONTAGEM,
                DT_CONTAGEM: item.DT_CONTAGEM,
                BLOCO: item.BLOCO,
                CUSTO_UNITARIO: item.CUSTO_UNITARIO || 0,
                VALOR_TOTAL_ESTOQUE: item.VALOR_TOTAL_ESTOQUE || 0
            }))
        };

        return res.status(200).json({ inventario });

    } catch (err) {
        console.error("ERRO ao abrir inventário:", err);
        return res.status(500).json({ 
            message: "Erro ao abrir inventário", 
            error: err.message 
        });
    }
}

// Finaliza um inventário e calcula acuracidade
async function finalizarInventario(req, res) {
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { idInventario, itens, usuario } = body;
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Atualiza as contagens físicas dos itens
        for (const item of itens) {
            await transaction.request()
                .input('ID_INVENTARIO', sql.Int, idInventario)
                .input('CODIGO', sql.NVarChar, item.CODIGO)
                .input('CONTAGEM_FISICA', sql.Float, item.CONTAGEM_FISICA || 0)
                .query(`
                    UPDATE [dbo].[TB_INVENTARIO_CICLICO_ITEM]
                    SET CONTAGEM_FISICA = @CONTAGEM_FISICA,
                        DIFERENCA = @CONTAGEM_FISICA - SALDO_SISTEMA,
                        ACURACIDADE = CASE 
                            WHEN SALDO_SISTEMA = 0 AND @CONTAGEM_FISICA = 0 THEN 100
                            WHEN SALDO_SISTEMA = 0 OR @CONTAGEM_FISICA = 0 THEN 0
                            ELSE (CAST(CASE WHEN @CONTAGEM_FISICA < SALDO_SISTEMA THEN @CONTAGEM_FISICA ELSE SALDO_SISTEMA END AS FLOAT) / 
                                  CAST(CASE WHEN @CONTAGEM_FISICA > SALDO_SISTEMA THEN @CONTAGEM_FISICA ELSE SALDO_SISTEMA END AS FLOAT)) * 100
                        END
                    WHERE ID_INVENTARIO = @ID_INVENTARIO AND CODIGO = @CODIGO;
                `);
        }

        // Calcula a acuracidade geral
        const acuracidadeResult = await transaction.request()
            .input('ID_INVENTARIO', sql.Int, idInventario)
            .query(`
                SELECT 
                    AVG(ACURACIDADE) AS ACURACIDADE_GERAL,
                    COUNT(*) AS TOTAL_ITENS,
                    SUM(CASE WHEN DIFERENCA = 0 THEN 1 ELSE 0 END) AS ITENS_CORRETOS,
                    SUM(CASE WHEN DIFERENCA <> 0 THEN 1 ELSE 0 END) AS ITENS_DIVERGENTES
                FROM [dbo].[TB_INVENTARIO_CICLICO_ITEM]
                WHERE ID_INVENTARIO = @ID_INVENTARIO;
            `);

        const stats = acuracidadeResult.recordset[0];

        // Atualiza o cabeçalho do inventário
        await transaction.request()
            .input('ID_INVENTARIO', sql.Int, idInventario)
            .input('STATUS', sql.NVarChar, 'FINALIZADO')
            .input('ACURACIDADE', sql.Float, stats.ACURACIDADE_GERAL)
            .input('USUARIO_FINALIZACAO', sql.NVarChar, usuario)
            .query(`
                UPDATE [dbo].[TB_INVENTARIO_CICLICO]
                SET STATUS = @STATUS,
                    ACURACIDADE = @ACURACIDADE,
                    USUARIO_FINALIZACAO = @USUARIO_FINALIZACAO,
                    DT_FINALIZACAO = GETDATE()
                WHERE ID_INVENTARIO = @ID_INVENTARIO;
            `);

        await transaction.commit();

        return res.status(200).json({ 
            message: "Inventário finalizado com sucesso",
            acuracidadeGeral: stats.ACURACIDADE_GERAL,
            totalItens: stats.TOTAL_ITENS,
            itensCorretos: stats.ITENS_CORRETOS,
            itensDivergentes: stats.ITENS_DIVERGENTES
        });

    } catch (err) {
        console.error("ERRO ao finalizar inventário:", err);
        return res.status(500).json({ 
            message: "Erro ao finalizar inventário", 
            error: err.message 
        });
    }
}

// Salva contagem individual com usuário e data/hora
async function salvarContagemIndividual(req, res) {
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { idInventario, codigo, contagemFisica, usuario } = body;
        const pool = await getConnection();

        await pool.request()
            .input('ID_INVENTARIO', sql.Int, idInventario)
            .input('CODIGO', sql.NVarChar, codigo)
            .input('CONTAGEM_FISICA', sql.Float, contagemFisica)
            .input('USUARIO_CONTAGEM', sql.NVarChar, usuario)
            .input('DT_CONTAGEM', sql.DateTime, new Date())
            .query(`
                UPDATE [dbo].[TB_INVENTARIO_CICLICO_ITEM]
                SET CONTAGEM_FISICA = @CONTAGEM_FISICA,
                    USUARIO_CONTAGEM = @USUARIO_CONTAGEM,
                    DT_CONTAGEM = @DT_CONTAGEM
                WHERE ID_INVENTARIO = @ID_INVENTARIO AND CODIGO = @CODIGO;
            `);

        return res.status(200).json({ 
            message: "Contagem salva com sucesso",
            usuario: usuario,
            dataContagem: new Date().toISOString()
        });

    } catch (err) {
        console.error("ERRO ao salvar contagem individual:", err);
        return res.status(500).json({ 
            message: "Erro ao salvar contagem", 
            error: err.message 
        });
    }
}
