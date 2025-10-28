import { getConnection, closeConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { nf, codigo, processo, usuario, id_nf, id_nf_prod } = req.body || {};

    if (!nf || !codigo || !processo || !usuario) {
        return res.status(400).json({ message: "Parâmetros obrigatórios: nf, codigo, processo, usuario" });
    }

    try {
        const pool = await getConnection();
        const now = new Date();

        // Formata data e hora
        const dt = now.toISOString().split("T")[0]; // YYYY-MM-DD
        const hh = now.toTimeString().split(" ")[0]; // HH:MM:SS

        await pool.request()
            .input("ID_NF", sql.Int, id_nf ? Number(id_nf) : null)
            .input("ID_NF_PROD", sql.Int, id_nf_prod ? Number(id_nf_prod) : null)
            .input("NF", sql.NVarChar, nf.toString())
            .input("CODIGO", sql.NVarChar, codigo.toString())
            .input("USUARIO", sql.NVarChar, usuario.toString())
            .input("DT", sql.Date, dt)
            .input("HH", sql.NVarChar, hh)
            .input("PROCESSO", sql.NVarChar, processo.toString())
            .input("APP", sql.NVarChar, "KARDEX WEB")
            .query(`
                INSERT INTO [dbo].[TB_LOG_NF]
                  ([ID_NF],[ID_NF_PROD],[NF],[CODIGO],[USUARIO],[DT],[HH],[PROCESSO],[APP])
                VALUES
                  (@ID_NF,@ID_NF_PROD,@NF,@CODIGO,@USUARIO,@DT,@HH,@PROCESSO,@APP);
            `);

        return res.status(200).json({ message: "Processo atualizado com sucesso." });
    } catch (err) {
        console.error("ERRO /api/atualizarStatusNF:", err);
        return res.status(500).json({ message: "Erro interno ao atualizar processo.", error: err.message });
    } finally {
        await closeConnection();
    }
}