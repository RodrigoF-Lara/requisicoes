// filepath: /api/atualizarStatusNF.js
import { getConnection, closeConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { nf, codigo, processo, usuario } = req.body;

    if (!nf || !codigo || !processo || !usuario) {
        return res.status(400).json({ message: "Todos os campos (nf, codigo, processo, usuario) são obrigatórios." });
    }

    try {
        const pool = await getConnection();
        
        // Insere um novo registro de log com os dados recebidos e a data/hora atual.
        await pool.request()
            .input('NF', sql.NVarChar, nf)
            .input('CODIGO', sql.NVarChar, codigo)
            .input('USUARIO', sql.NVarChar, usuario)
            .input('DT', sql.Date, new Date())
            .input('HH', sql.NVarChar, new Date().toLocaleTimeString('pt-BR', { hour12: false }))
            .input('PROCESSO', sql.NVarChar, processo)
            .query(`
                INSERT INTO [dbo].[TB_LOG_NF] 
                ([NF], [CODIGO], [USUARIO], [DT], [HH], [PROCESSO])
                VALUES 
                (@NF, @CODIGO, @USUARIO, @DT, @HH, @PROCESSO);
            `);

        res.status(200).json({ message: `Status da NF ${nf} / Produto ${codigo} atualizado para "${processo}" com sucesso!` });

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/atualizarStatusNF:", err);
        res.status(500).json({ message: "Erro ao inserir novo log de NF", error: err.message });
    } finally {
        await closeConnection();
    }
}