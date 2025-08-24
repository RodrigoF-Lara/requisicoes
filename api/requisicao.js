import { getConnection } from "./db.js";
import sql from "mssql";

// Função Principal que decide o que fazer
export default async function handler(req, res) {
    const { method } = req;
    
    try {
        switch (method) {
            case "GET":
                await handleGet(req, res);
                break;
            case "POST":
                await handlePost(req, res);
                break;
            case "PUT":
                await handlePut(req, res);
                break;
            default:
                res.setHeader("Allow", ["GET", "POST", "PUT"]);
                res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (err) {
        console.error("Erro geral no handler de /api/requisicao:", err);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
}

// --- LÓGICA PARA REQUISIÇÕES GET (BUSCAR DADOS) ---
async function handleGet(req, res) {
    const { id, idReqItemLog } = req.query;
    const pool = await getConnection();

    if (id) { // Busca os detalhes da requisição
        const headerResult = await pool.request().input('idReq', sql.Int, id).query("SELECT * FROM [dbo].[TB_REQUISICOES] WHERE ID_REQ = @idReq");
        if (headerResult.recordset.length === 0) return res.status(404).json({ message: "Requisição não encontrada" });
        
        const itemsResult = await pool.request().input('idReqItems', sql.Int, id)
            .query(`SELECT I.*, P.DESCRICAO AS DESCRICAO_PRODUTO FROM [dbo].[TB_REQ_ITEM] I LEFT JOIN [dbo].[CAD_PROD] P ON I.CODIGO = P.CODIGO WHERE I.ID_REQ = @idReqItems ORDER BY I.ID_REQ_ITEM`);
        
        return res.status(200).json({ header: headerResult.recordset[0], items: itemsResult.recordset });

    } else if (idReqItemLog) { // Busca o log de um item
        const result = await pool.request().input('ID_REQ_ITEM', sql.Int, idReqItemLog).query("SELECT STATUS_ANTERIOR, STATUS_NOVO, RESPONSAVEL, DT_ALTERACAO, CONVERT(varchar(8), HR_ALTERACAO, 108) as HR_ALTERACAO_FORMATADA FROM TB_REQ_ITEM_LOG WHERE ID_REQ_ITEM = @ID_REQ_ITEM ORDER BY DT_ALTERACAO DESC, HR_ALTERACAO DESC;");
        return res.status(200).json(result.recordset);

    } else { // Busca a lista completa
        // Substitua a linha da query pela versão abaixo, que inclui H.DT_NECESSIDADE
        const result = await pool.request().query("SELECT H.ID_REQ, H.DT_REQUISICAO, H.DT_NECESSIDADE, H.STATUS, H.PRIORIDADE, H.SOLICITANTE, (SELECT COUNT(*) FROM [dbo].[TB_REQ_ITEM] I WHERE I.ID_REQ = H.ID_REQ) AS TOTAL_ITENS FROM [dbo].[TB_REQUISICOES] H ORDER BY H.ID_REQ DESC;");
        return res.status(200).json(result.recordset);
    }
}

// --- LÓGICA PARA REQUISIÇÕES POST (CRIAR DADOS) ---
async function handlePost(req, res) {
    const { action } = req.body;
    const pool = await getConnection();

    if (action === 'createHeader') {
        const { dtNecessidade, prioridade, solicitante } = req.body;
        if (!dtNecessidade || !prioridade || !solicitante) return res.status(400).json({ message: "Todos os campos são obrigatórios" });
        
        const result = await pool.request()
            .input('SOLICITANTE', sql.NVarChar, solicitante).input('DT_REQUISICAO', sql.Date, new Date()).input('HR_REQUSICAO', sql.NVarChar, new Date().toLocaleTimeString())
            .input('STATUS', sql.NVarChar, 'Pendente').input('DT_NECESSIDADE', sql.Date, dtNecessidade).input('PRIORIDADE', sql.NVarChar, prioridade)
            .query("INSERT INTO [dbo].[TB_REQUISICOES] (SOLICITANTE, DT_REQUISICAO, HR_REQUSICAO, STATUS, DT_NECESSIDADE, PRIORIDADE) OUTPUT INSERTED.ID_REQ VALUES (@SOLICITANTE, @DT_REQUISICAO, @HR_REQUSICAO, @STATUS, @DT_NECESSIDADE, @PRIORIDADE);");
        
        return res.status(201).json({ idReq: result.recordset[0].ID_REQ });

    } else if (action === 'uploadItems') {
        const { data, idReq } = req.body;
        if (!Array.isArray(data) || !data.length || !idReq) return res.status(400).json({ message: "Dados inválidos ou ID_REQ ausente" });

        let idReqItem = 1;
        for (let row of data) {
            const codigo = row.CODIGO;
            const qntReq = parseFloat(row.QNT_REQ);
            if (!codigo || isNaN(qntReq)) continue;

            await pool.request()
                .input('ID_REQ', sql.Int, idReq).input('ID_REQ_ITEM', sql.Int, idReqItem++).input('CODIGO', sql.NVarChar, codigo)
                .input('QNT_REQ', sql.Float, qntReq).input('QNT_PAGA', sql.Float, 0).input('SALDO', sql.Float, qntReq).input('STATUS_ITEM', sql.NVarChar, 'Pendente')
                .query("INSERT INTO [dbo].[TB_REQ_ITEM] (ID_REQ, ID_REQ_ITEM, CODIGO, QNT_REQ, QNT_PAGA, SALDO, STATUS_ITEM) VALUES (@ID_REQ, @ID_REQ_ITEM, @CODIGO, @QNT_REQ, @QNT_PAGA, @SALDO, @STATUS_ITEM)");
        }
        return res.status(201).json({ message: "Itens inseridos com sucesso" });
    }
    
    return res.status(400).json({ message: "Ação POST inválida." });
}

// --- LÓGICA PARA REQUISIÇÕES PUT (ATUALIZAR DADOS) ---
async function handlePut(req, res) {
    const { action } = req.body;
    
    if (action === 'updateStatus') {
        const { idReqItem, idReq, novoStatus, statusAntigo, usuario } = req.body;
        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);

            // 1. Atualiza o item
            let queryUpdateItem = `UPDATE TB_REQ_ITEM SET STATUS_ITEM = @NOVO_STATUS_ITEM`;
            if (novoStatus === 'Finalizado') queryUpdateItem += `, QNT_PAGA = QNT_REQ, SALDO = 0`;
            else if (novoStatus === 'Pendente') queryUpdateItem += `, QNT_PAGA = 0, SALDO = QNT_REQ`;
            queryUpdateItem += ` WHERE ID_REQ_ITEM = @ID_REQ_ITEM AND ID_REQ = @ID_REQ;`;
            await request.input('NOVO_STATUS_ITEM', sql.NVarChar, novoStatus).input('ID_REQ_ITEM', sql.Int, idReqItem).input('ID_REQ', sql.Int, idReq).query(queryUpdateItem);

            // 2. Insere o log
            const dataHoraAtual = new Date();
            await request.input('STATUS_ANTERIOR_LOG', sql.NVarChar, statusAntigo).input('STATUS_NOVO_LOG', sql.NVarChar, novoStatus).input('RESPONSAVEL_LOG', sql.NVarChar, usuario).input('DT_ALTERACAO_LOG', sql.Date, dataHoraAtual).input('HR_ALTERACAO_LOG', sql.Time, dataHoraAtual)
                .query("INSERT INTO TB_REQ_ITEM_LOG (ID_REQ, ID_REQ_ITEM, STATUS_ANTERIOR, STATUS_NOVO, RESPONSAVEL, DT_ALTERACAO, HR_ALTERACAO) VALUES (@ID_REQ, @ID_REQ_ITEM, @STATUS_ANTERIOR_LOG, @STATUS_NOVO_LOG, @RESPONSAVEL_LOG, @DT_ALTERACAO_LOG, @HR_ALTERACAO_LOG)");

            // 3. Determina e atualiza o status do cabeçalho
            const checkStatusQuery = `SELECT STATUS_ITEM FROM TB_REQ_ITEM WHERE ID_REQ = @ID_REQ`;
            const allItemsResult = await request.query(checkStatusQuery);
            const allStatuses = allItemsResult.recordset.map(item => (item.STATUS_ITEM || 'Pendente').trim().toUpperCase());

            let novoStatusHeader;
            const todosFinalizados = allStatuses.length > 0 && allStatuses.every(s => s === 'FINALIZADO');
            const todosPendentes = allStatuses.length > 0 && allStatuses.every(s => s === 'PENDENTE');

            if (todosFinalizados) {
                novoStatusHeader = 'Concluído'; // <-- CORREÇÃO FINAL APLICADA AQUI
            } else if (todosPendentes) {
                novoStatusHeader = 'Pendente';
            } else {
                novoStatusHeader = 'Parcial';
            }
            
            await request.input('STATUS_HEADER', sql.NVarChar, novoStatusHeader).query("UPDATE TB_REQUISICOES SET STATUS = @STATUS_HEADER WHERE ID_REQ = @ID_REQ");

            await transaction.commit();
            return res.status(200).json({ message: `Item alterado para '${novoStatus}' com sucesso!` });
        } catch (err) {
            await transaction.rollback();
            console.error("Erro na transação de update de status:", err);
            return res.status(500).json({ message: "Erro interno do servidor ao atualizar o status." });
        }
    }
    return res.status(400).json({ message: "Ação PUT inválida." });
}