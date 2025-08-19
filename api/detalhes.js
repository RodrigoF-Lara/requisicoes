// filepath: api/detalhes.js
import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: "ID da requisição é obrigatório" });
    }

    try {
        const pool = await getConnection();

        // Query 1: Busca o cabeçalho da requisição
        const headerResult = await pool.request()
            .input('idReq', sql.Int, id)
            .query("SELECT * FROM [dbo].[TB_REQUISICOES] WHERE ID_REQ = @idReq");

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({ message: "Requisição não encontrada" });
        }

        // Query 2: Busca todos os itens daquela requisição
        const itemsResult = await pool.request()
            .input('idReq', sql.Int, id)
            .query("SELECT * FROM [dbo].[TB_REQ_ITEM] WHERE ID_REQ = @idReq ORDER BY ID_REQ_ITEM");
        
        const headerData = headerResult.recordset[0];

        // --- CORREÇÃO APLICADA AQUI ---
        // Garante que STATUS e PRIORIDADE tenham um valor padrão caso sejam nulos no banco.
        // Isso evita o erro '.toLowerCase() of undefined' no servidor.
        const safeHeader = {
            ...headerData,
            STATUS: headerData.STATUS || 'PENDENTE',
            PRIORIDADE: headerData.PRIORIDADE || 'NORMAL'
        };

        // Monta um objeto de resposta com os dados seguros
        const responseData = {
            header: safeHeader,
            items: itemsResult.recordset
        };
        
        res.status(200).json(responseData);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/detalhes:", err);
        res.status(500).json({ message: "Erro no servidor ao buscar detalhes da requisição.", error: err.message });
    }
}