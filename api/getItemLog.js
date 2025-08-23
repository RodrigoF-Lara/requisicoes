import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { idReqItem } = req.query;

    if (!idReqItem) {
        return res.status(400).json({ message: "O ID do item da requisição é obrigatório." });
    }

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('ID_REQ_ITEM', sql.Int, idReqItem)
            .query(`
                SELECT 
                    STATUS_ANTERIOR,
                    STATUS_NOVO,
                    RESPONSAVEL,
                    DT_ALTERACAO,
                    CONVERT(varchar(8), HR_ALTERACAO, 108) as HR_ALTERACAO_FORMATADA
                FROM 
                    TB_REQ_ITEM_LOG
                WHERE 
                    ID_REQ_ITEM = @ID_REQ_ITEM
                ORDER BY 
                    DT_ALTERACAO DESC, HR_ALTERACAO DESC;
            `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("Erro no endpoint /api/getItemLog:", err);
        res.status(500).json({ message: "Erro interno do servidor ao buscar o histórico do item." });
    }
}