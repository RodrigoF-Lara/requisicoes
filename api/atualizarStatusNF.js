import { getConnection } from "../db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { nf, codigo, processo, usuario, id_nf, id_nf_prod, qnt } = req.body || {};

    if (!nf || !codigo || !processo || !usuario) {
        return res.status(400).json({ message: "Parâmetros obrigatórios: nf, codigo, processo, usuario" });
    }

    let pool;
    try {
        pool = await getConnection();
        const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

        // Formata data e hora em BRT
        const dt = nowBRT.toISOString().split("T")[0]; // YYYY-MM-DD
        const hh = nowBRT.toTimeString().split(" ")[0]; // HH:MM:SS

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
            .input("QNT", sql.Int, qnt !== undefined && qnt !== null ? Number(qnt) : 0)
            .query(`
                INSERT INTO [dbo].[TB_LOG_NF]
                  ([ID_NF],[ID_NF_PROD],[NF],[CODIGO],[USUARIO],[DT],[HH],[PROCESSO],[APP],[QNT])
                VALUES
                  (@ID_NF,@ID_NF_PROD,@NF,@CODIGO,@USUARIO,@DT,@HH,@PROCESSO,@APP,@QNT);
            `);

        return res.status(200).json({ message: "Processo atualizado com sucesso." });
    } catch (err) {
        console.error("ERRO /api/atualizarStatusNF:", err);
        return res.status(500).json({ message: "Erro interno ao atualizar processo.", error: err.message });
    }
}