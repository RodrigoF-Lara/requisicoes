import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { idReqItem, idReq, novoStatus, usuario } = req.body;

    // Nova lista de status válidos
    const statusValidos = ['Pendente', 'Em separação', 'Separado', 'Aguarda coleta', 'Finalizado'];

    if (!idReqItem || !idReq || !novoStatus || !usuario) {
        return res.status(400).json({ message: "Todos os campos (ID Item, ID Requisição, Novo Status, Usuário) são obrigatórios." });
    }

    if (!statusValidos.includes(novoStatus)) {
        return res.status(400).json({ message: `Status inválido. Use um dos seguintes: ${statusValidos.join(', ')}.` });
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

        // Lógica atualizada: Apenas o status 'Finalizado' altera as quantidades
        if (novoStatus === 'Finalizado') {
            queryUpdateItem += `, QNT_PAGA = QNT_REQ, SALDO = 0`;
        } else if (novoStatus === 'Pendente') {
            // Se retornar para pendente, reseta as quantidades
            queryUpdateItem += `, QNT_PAGA = 0, SALDO = QNT_REQ`;
        }
        
        queryUpdateItem += ` WHERE ID_REQ_ITEM = @ID_REQ_ITEM;`;

        await itemRequest
            .input('ID_REQ_ITEM', sql.Int, idReqItem)
            .input('NOVO_STATUS', sql.NVarChar, novoStatus)
            .query(queryUpdateItem);

        // 2. Verifica se todos os itens da requisição estão 'Finalizado' para atualizar o cabeçalho
        const checkStatusRequest = new sql.Request(transaction);
        const allItemsResult = await checkStatusRequest
            .input('ID_REQ', sql.Int, idReq)
            .query("SELECT COUNT(*) as total, SUM(CASE WHEN STATUS_ITEM = 'Finalizado' THEN 1 ELSE 0 END) as finalizados FROM TB_REQ_ITEM WHERE ID_REQ = @ID_REQ");

        const { total, finalizados } = allItemsResult.recordset[0];
        let novoStatusHeader = 'PARCIAL';
        if (total === finalizados) {
            novoStatusHeader = 'CONCLUIDO';
        } else if (finalizados === 0) {
            // Se nenhum item foi finalizado, verifica se todos são pendentes
            const pendentesResult = await new sql.Request(transaction)
                .input('ID_REQ', sql.Int, idReq)
                .query("SELECT COUNT(*) as total, SUM(CASE WHEN STATUS_ITEM = 'Pendente' THEN 1 ELSE 0 END) as pendentes FROM TB_REQ_ITEM WHERE ID_REQ = @ID_REQ");
            if (pendentesResult.recordset[0].total === pendentesResult.recordset[0].pendentes) {
                novoStatusHeader = 'PENDENTE';
            }
        }

        const updateHeaderRequest = new sql.Request(transaction);
        await updateHeaderRequest
            .input('ID_REQ', sql.Int, idReq)
            .input('STATUS', sql.NVarChar, novoStatusHeader)
            .query("UPDATE TB_REQUISICOES SET STATUS = @STATUS WHERE ID_REQ = @ID_REQ");

        await transaction.commit();
        res.status(200).json({ message: `Item alterado para '${novoStatus}' com sucesso!` });

    } catch (err) {
        await transaction.rollback();
        console.error("Erro na transação ao atualizar status do item:", err);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar o status." });
    }
}