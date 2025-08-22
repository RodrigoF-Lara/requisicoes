import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { idReqItem, idReq, novoStatus, usuario } = req.body;

    if (!idReqItem || !idReq || !novoStatus || !usuario) {
        return res.status(400).json({ message: "Todos os campos (ID Item, ID Requisição, Novo Status, Usuário) são obrigatórios." });
    }

    if (!['PAGO', 'PENDENTE'].includes(novoStatus)) {
        return res.status(400).json({ message: "Status inválido. Use 'PAGO' ou 'PENDENTE'." });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Atualiza o item específico
        const itemRequest = new sql.Request(transaction);
        let queryUpdateItem = `
            UPDATE TB_REQ_ITEM
            SET STATUS_ITEM = @NOVO_STATUS
        `;

        if (novoStatus === 'PAGO') {
            queryUpdateItem += `, QNT_PAGA = QNT_REQ, SALDO = 0`;
        } else if (novoStatus === 'PENDENTE') {
            queryUpdateItem += `, QNT_PAGA = 0, SALDO = QNT_REQ`;
        }
        
        queryUpdateItem += ` WHERE ID_REQ_ITEM = @ID_REQ_ITEM;`;

        await itemRequest
            .input('ID_REQ_ITEM', sql.Int, idReqItem)
            .input('NOVO_STATUS', sql.NVarChar, novoStatus)
            .query(queryUpdateItem);

        // 2. Verifica se todos os itens da requisição estão 'PAGO' para atualizar o cabeçalho
        const checkStatusRequest = new sql.Request(transaction);
        const allItemsResult = await checkStatusRequest
            .input('ID_REQ', sql.Int, idReq)
            .query("SELECT COUNT(*) as total, SUM(CASE WHEN STATUS_ITEM = 'PAGO' THEN 1 ELSE 0 END) as pagos FROM TB_REQ_ITEM WHERE ID_REQ = @ID_REQ");

        const { total, pagos } = allItemsResult.recordset[0];
        const novoStatusHeader = (total === pagos) ? 'CONCLUIDO' : 'PARCIAL';

        const updateHeaderRequest = new sql.Request(transaction);
        await updateHeaderRequest
            .input('ID_REQ', sql.Int, idReq)
            .input('STATUS', sql.NVarChar, novoStatusHeader)
            .query("UPDATE TB_REQUISICOES SET STATUS = @STATUS WHERE ID_REQ = @ID_REQ");

        await transaction.commit();
        res.status(200).json({ message: `Item marcado como ${novoStatus} com sucesso!` });

    } catch (err) {
        await transaction.rollback();
        console.error("Erro na transação ao atualizar status do item:", err);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar o status." });
    }
}