// filepath: api/detalhes.js
import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    // Pega o ID da requisição que vem na URL (ex: /api/detalhes?id=123)
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

        // Monta um objeto de resposta com o cabeçalho e os itens
        const responseData = {
            header: headerResult.recordset[0],
            items: itemsResult.recordset
        };
        
        res.status(200).json(responseData);

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/detalhes:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
}