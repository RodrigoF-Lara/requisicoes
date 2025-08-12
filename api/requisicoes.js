// filepath: api/requisicoes.js

import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    // Permite apenas o método GET
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    try {
        const pool = await getConnection();
        
        // CORREÇÃO: Adicionado o prefixo [dbo]. nas tabelas
        const result = await pool.request().query(`
            SELECT * FROM [dbo].[TB_REQUISICOES]
        `);
        
        res.status(200).json(result.recordset);

    } catch (err) {
        console.error("Erro ao consultar requisições:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
}