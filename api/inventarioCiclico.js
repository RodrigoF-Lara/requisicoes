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

    // POST: Salvar ou Finalizar inventário
    if (req.method === "POST") {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { acao } = body;
        if (acao === 'salvar') {
            return await salvarInventario(req, res);
        } else if (acao === 'finalizar') {
            return await finalizarInventario(req, res);
        }
    }

    return res.status(400).json({ message: "Ação não especificada ou inválida" });
}

// Gera uma nova lista de inventário
async function gerarListaInventario(req, res) {
    try {
        const pool = await getConnection();
        
        // Busca os 10 itens mais movimentados nos últimos 21 dias
        const result = await pool.request().query(`
            WITH Movimentacoes AS (
                SELECT 
                    k.CODIGO,
                    COUNT(*) AS TOTAL_MOVIMENTACOES,
                    SUM(ABS(k.QNT)) AS TOTAL_QUANTIDADE_MOVIMENTADA
                FROM [dbo].[KARDEX_2025] k
                WHERE 
                    k.DT >= DATEADD(DAY, -21, GETDATE())
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
            criterio: 'TOP 10 mais movimentados nos últimos 21 dias'
        });

    } catch (err) {
        console.error("ERRO ao gerar lista:", err);
        return res.status(500).json({ 
            message: "Erro ao gerar lista de inventário", 
            error: err.message 
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

        // Insere o cabeçalho do inventário
        const headerResult = await transaction.request()
            .input('DT_GERACAO', sql.DateTime, new Date(inventario.dataGeracao))
            .input('CRITERIO', sql.NVarChar, inventario.criterio)
            .input('STATUS', sql.NVarChar, 'EM_ANDAMENTO')
            .input('TOTAL_ITENS', sql.Int, inventario.itens.length)
            .input('USUARIO_CRIACAO', sql.NVarChar, usuario)
            .query(`
                INSERT INTO [dbo].[TB_INVENTARIO_CICLICO] 
                (DT_GERACAO, CRITERIO, STATUS, TOTAL_ITENS, USUARIO_CRIACAO, DT_CRIACAO)
                OUTPUT INSERTED.ID_INVENTARIO
                VALUES (@DT_GERACAO, @CRITERIO, @STATUS, @TOTAL_ITENS, @USUARIO_CRIACAO, GETDATE());
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
                .query(`
                    INSERT INTO [dbo].[TB_INVENTARIO_CICLICO_ITEM]
                    (ID_INVENTARIO, CODIGO, DESCRICAO, SALDO_SISTEMA, CONTAGEM_FISICA, TOTAL_MOVIMENTACOES)
                    VALUES (@ID_INVENTARIO, @CODIGO, @DESCRICAO, @SALDO_SISTEMA, @CONTAGEM_FISICA, @TOTAL_MOVIMENTACOES);
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
            itens: itemsResult.recordset.map(item => ({
                CODIGO: item.CODIGO,
                DESCRICAO: item.DESCRICAO,
                SALDO_ATUAL: item.SALDO_SISTEMA,
                CONTAGEM_FISICA: item.CONTAGEM_FISICA,
                TOTAL_MOVIMENTACOES: item.TOTAL_MOVIMENTACOES
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
