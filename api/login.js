// filepath: api/login.js
import { getConnection } from "./db.js"; // <<< MUDANÇA AQUI
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    const { usuario, pw } = req.body;

    if (!usuario || !pw) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
    }

    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('F_UN', sql.NVarChar, usuario)
            .input('F_PW', sql.NVarChar, pw)
            .query('SELECT F_NAME, L_NAME FROM F_USER WHERE F_UN = @F_UN AND F_PW = @F_PW');

        if (result.recordset.length > 0) {
            res.status(200).json({ message: 'Login bem-sucedido', usuario: result.recordset[0] });
        } else {
            res.status(401).json({ message: 'Credenciais inválidas' });
        }
    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/login:", err);
        res.status(500).json({ message: 'Erro de servidor', error: err.message });
    }
}