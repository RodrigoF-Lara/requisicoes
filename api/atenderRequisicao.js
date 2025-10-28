// filepath: api/atenderRequisicao.js
import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { idReqItem, idReq, quantidadeAtendida, usuario } = req.body;

    if (!idReqItem || !idReq || quantidadeAtendida === undefined || !usuario) {
        return res.status(400).json({ message: "Todos os campos (ID do Item, ID da Requisição, Quantidade, Usuário) são obrigatórios." });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Atualiza o item específico
        const itemRequest = new sql.Request(transaction);
        await itemRequest
            .input('ID_REQ_ITEM', sql.Int, idReqItem)
            .input('QNT_PAGA', sql.Decimal(10, 2), quantidadeAtendida)
            .query(`
                UPDATE TB_REQ_ITEM
                SET 
                    QNT_PAGA = @QNT_PAGA,
                    SALDO = QNT_REQ - @QNT_PAGA,
                    STATUS_ITEM = CASE 
                                    WHEN (QNT_REQ - @QNT_PAGA) <= 0 THEN 'PAGO'
                                    ELSE 'PARCIAL'
                                END
                WHERE ID_REQ_ITEM = @ID_REQ_ITEM;
            `);

        // 2. Verifica o status de todos os outros itens da mesma requisição
        const checkStatusRequest = new sql.Request(transaction);
        const allItemsResult = await checkStatusRequest
            .input('ID_REQ', sql.Int, idReq)
            .query("SELECT COUNT(*) as total, SUM(CASE WHEN STATUS_ITEM = 'PAGO' THEN 1 ELSE 0 END) as pagos FROM TB_REQ_ITEM WHERE ID_REQ = @ID_REQ");

        const { total, pagos } = allItemsResult.recordset[0];

        // 3. Se todos os itens estiverem pagos, atualiza o cabeçalho da requisição
        if (total === pagos) {
            const updateHeaderRequest = new sql.Request(transaction);
            await updateHeaderRequest
                .input('ID_REQ', sql.Int, idReq)
                .input('STATUS', sql.NVarChar, 'CONCLUIDO')
                .query("UPDATE TB_REQUISICOES SET STATUS = @STATUS WHERE ID_REQ = @ID_REQ");
        }

        await transaction.commit();
        res.status(200).json({ message: "Item atualizado com sucesso!" });

    } catch (err) {
        await transaction.rollback();
        console.error("Erro na transação de atendimento:", err);
        res.status(500).json({ message: "Erro no servidor ao tentar atender o item.", error: err.message });
    }
}