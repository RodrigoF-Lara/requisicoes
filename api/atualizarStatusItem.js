import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { idReqItem, idReq, novoStatus, statusAntigo, usuario } = req.body;
    const statusValidos = ['Pendente', 'Em separação', 'Separado', 'Aguarda coleta', 'Finalizado'];

    if (!idReqItem || !idReq || !novoStatus || !statusAntigo || !usuario) {
        return res.status(400).json({ message: "Todos os campos (ID Item, ID Requisição, Status Novo, Status Antigo, Usuário) são obrigatórios." });
    }
    if (!statusValidos.includes(novoStatus)) {
        return res.status(400).json({ message: `Status inválido.` });
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        // --- USAREMOS UM ÚNICO OBJETO DE REQUEST PARA TODA A TRANSAÇÃO ---
        const request = new sql.Request(transaction);

        // --- TAREFA 1: ATUALIZAR O STATUS ATUAL DO ITEM ---
        let queryUpdateItem = `UPDATE TB_REQ_ITEM SET STATUS_ITEM = @NOVO_STATUS_ITEM`;
        if (novoStatus === 'Finalizado') {
            queryUpdateItem += `, QNT_PAGA = QNT_REQ, SALDO = 0`;
        } else if (novoStatus === 'Pendente') {
            queryUpdateItem += `, QNT_PAGA = 0, SALDO = QNT_REQ`;
        }
        queryUpdateItem += ` WHERE ID_REQ_ITEM = @ID_REQ_ITEM AND ID_REQ = @ID_REQ;`;

        await request
            .input('NOVO_STATUS_ITEM', sql.NVarChar, novoStatus)
            .input('ID_REQ_ITEM', sql.Int, idReqItem)
            .input('ID_REQ', sql.Int, idReq)
            .query(queryUpdateItem);

        // --- TAREFA 2: INSERIR O REGISTRO DE LOG ---
        const dataHoraAtual = new Date();
        await request
            .input('STATUS_ANTERIOR_LOG', sql.NVarChar, statusAntigo)
            .input('STATUS_NOVO_LOG', sql.NVarChar, novoStatus)
            .input('RESPONSAVEL_LOG', sql.NVarChar, usuario)
            .input('DT_ALTERACAO_LOG', sql.Date, dataHoraAtual)
            .input('HR_ALTERACAO_LOG', sql.Time, dataHoraAtual)
            .query(`
                INSERT INTO TB_REQ_ITEM_LOG 
                (ID_REQ, ID_REQ_ITEM, STATUS_ANTERIOR, STATUS_NOVO, RESPONSAVEL, DT_ALTERACAO, HR_ALTERACAO)
                VALUES 
                (@ID_REQ, @ID_REQ_ITEM, @STATUS_ANTERIOR_LOG, @STATUS_NOVO_LOG, @RESPONSAVEL_LOG, @DT_ALTERACAO_LOG, @HR_ALTERACAO_LOG)
            `);
        
        // --- TAREFA 3: ATUALIZAR O STATUS DO CABEÇALHO ---
        const allItemsResult = await request.query("SELECT COUNT(*) as total, SUM(CASE WHEN STATUS_ITEM = 'Finalizado' THEN 1 ELSE 0 END) as finalizados FROM TB_REQ_ITEM WHERE ID_REQ = @ID_REQ");
        const { total, finalizados } = allItemsResult.recordset[0];
        let novoStatusHeader = 'PARCIAL';

        if (total === finalizados) {
            novoStatusHeader = 'CONCLUIDO';
        } else {
            const pendentesResult = await request.query("SELECT COUNT(*) as total, SUM(CASE WHEN STATUS_ITEM = 'Pendente' THEN 1 ELSE 0 END) as pendentes FROM TB_REQ_ITEM WHERE ID_REQ = @ID_REQ");
            if (pendentesResult.recordset[0].total === pendentesResult.recordset[0].pendentes) {
                novoStatusHeader = 'PENDENTE';
            }
        }
        await request.input('STATUS_HEADER', sql.NVarChar, novoStatusHeader).query("UPDATE TB_REQUISICOES SET STATUS = @STATUS_HEADER WHERE ID_REQ = @ID_REQ");

        await transaction.commit();
        res.status(200).json({ message: `Item alterado para '${novoStatus}' com sucesso!` });

    } catch (err) {
        await transaction.rollback();
        console.error("Erro na transação ao atualizar status do item:", err);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar o status." });
    }
}