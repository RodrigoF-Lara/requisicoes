import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method === "GET") {
        return await obterConfiguracao(req, res);
    }

    if (req.method === "POST") {
        return await atualizarConfiguracao(req, res);
    }

    return res.status(405).json({ message: "Método não permitido" });
}

async function obterConfiguracao(req, res) {
    try {
        const pool = await getConnection();
        
        const result = await pool.request().query(`
            SELECT TOP 1 *
            FROM [dbo].[TB_CONFIG_INVENTARIO]
            ORDER BY ID_CONFIG DESC;
        `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "Configuração não encontrada" });
        }

        return res.status(200).json({ config: result.recordset[0] });

    } catch (err) {
        console.error("Erro ao obter configuração:", err);
        return res.status(500).json({ 
            message: "Erro ao obter configuração", 
            error: err.message 
        });
    }
}

async function atualizarConfiguracao(req, res) {
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { 
            bloco1QtdItens, 
            bloco1DiasMovimentacao, 
            bloco2QtdItens, 
            bloco2AcuracidadeMin, 
            bloco3QtdItens,
            bloco4QtdItens,
            bloco5QtdItens,
            bloco5InventariosAtras,
            usuario 
        } = body;

        const pool = await getConnection();

        await pool.request()
            .input('BLOCO1_QTD', sql.Int, bloco1QtdItens)
            .input('BLOCO1_DIAS', sql.Int, bloco1DiasMovimentacao)
            .input('BLOCO2_QTD', sql.Int, bloco2QtdItens)
            .input('BLOCO2_ACUR', sql.Float, bloco2AcuracidadeMin)
            .input('BLOCO3_QTD', sql.Int, bloco3QtdItens)
            .input('BLOCO4_QTD', sql.Int, bloco4QtdItens)
            .input('BLOCO5_QTD', sql.Int, bloco5QtdItens)
            .input('BLOCO5_INV', sql.Int, bloco5InventariosAtras)
            .input('USUARIO', sql.NVarChar, usuario)
            .query(`
                UPDATE [dbo].[TB_CONFIG_INVENTARIO]
                SET 
                    BLOCO1_QTD_ITENS = @BLOCO1_QTD,
                    BLOCO1_DIAS_MOVIMENTACAO = @BLOCO1_DIAS,
                    BLOCO2_QTD_ITENS = @BLOCO2_QTD,
                    BLOCO2_ACURACIDADE_MIN = @BLOCO2_ACUR,
                    BLOCO3_QTD_ITENS = @BLOCO3_QTD,
                    BLOCO4_QTD_ITENS = @BLOCO4_QTD,
                    BLOCO5_QTD_ITENS = @BLOCO5_QTD,
                    BLOCO5_INVENTARIOS_ATRAS = @BLOCO5_INV,
                    USUARIO_ALTERACAO = @USUARIO,
                    DT_ALTERACAO = GETDATE()
                WHERE ID_CONFIG = (SELECT TOP 1 ID_CONFIG FROM [dbo].[TB_CONFIG_INVENTARIO] ORDER BY ID_CONFIG DESC);
            `);

        return res.status(200).json({ 
            message: "Configuração atualizada com sucesso" 
        });

    } catch (err) {
        console.error("Erro ao atualizar configuração:", err);
        return res.status(500).json({ 
            message: "Erro ao atualizar configuração", 
            error: err.message 
        });
    }
}
