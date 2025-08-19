// filepath: api/login.js
import { getConnection } from "./db.js"; // Corrigido: Removido 'closeConnection'
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }
    
    const { usuario, pw } = req.body;

    if (!usuario || !pw) {
        return res.status(400).json({ message: "Usuário e senha obrigatórios" });
    }

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('usuario', sql.NVarChar, usuario)
            .input('pw', sql.NVarChar, pw)
            .query(`
                SELECT [USUARIO],[PW],[NIVEL],[CPF],[F_NAME],[L_NAME],[ID],[COD],[SETOR]
                FROM [dbo].[CAD_USUARIO]
                WHERE [USUARIO]=@usuario AND [PW]=@pw
            `);

        if (result.recordset.length === 1) {
            const user = result.recordset[0];
            res.status(200).json({ usuario: user });
        } else {
            res.status(401).json({ message: "Usuário ou senha inválidos" });
        }
    } catch (err) {
        // Adiciona um log mais detalhado do erro no servidor
        console.error("ERRO DETALHADO NO ENDPOINT /api/login:", err);
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    }
    // O bloco 'finally' com 'closeConnection()' foi removido para corrigir os erros de travamento.
}