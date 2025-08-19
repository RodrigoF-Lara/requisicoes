import { getConnection, closeConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { dtNecessidade, prioridade, solicitante } = req.body;

    if (!dtNecessidade || !prioridade || !solicitante) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('SOLICITANTE', sql.NVarChar, solicitante)
            .input('DT_REQUISICAO', sql.Date, new Date())
            .input('HR_REQUSICAO', sql.NVarChar, new Date().toLocaleTimeString())
            .input('STATUS', sql.NVarChar, 'PENDENTE')
            .input('DT_NECESSIDADE', sql.Date, dtNecessidade)
            .input('PRIORIDADE', sql.NVarChar, prioridade)
            .query(`
                INSERT INTO [dbo].[TB_REQUISICOES]
                (SOLICITANTE, DT_REQUISICAO, HR_REQUSICAO, STATUS, DT_NECESSIDADE, PRIORIDADE)
                OUTPUT INSERTED.ID_REQ
                VALUES (@SOLICITANTE, @DT_REQUISICAO, @HR_REQUSICAO, @STATUS, @DT_NECESSIDADE, @PRIORIDADE);
            `);

        const idReq = result.recordset[0].ID_REQ;
        res.status(200).json({ message: "Requisição criada com sucesso!", idReq: idReq });

    } catch (err) {
        console.error("Erro SQL:", err);
        res.status(500).json({ message: "Erro ao criar requisição", error: err.message });
    } finally {
       
    }
}