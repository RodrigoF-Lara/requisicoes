import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
  try {
    const pool = await getConnection();

    if (req.method === "GET") {
      const codigo = String((req.query && req.query.codigo) || "").trim();
      if (!codigo) return res.status(400).json({ message: "codigo é obrigatório" });

      const prod = await pool.request()
        .input("CODIGO", sql.NVarChar, codigo)
        .query("SELECT TOP 1 CODIGO, DESCRICAO FROM [dbo].[CAD_PROD] WHERE CODIGO = @CODIGO");

      const saldoRes = await pool.request()
        .input("CODIGO", sql.NVarChar, codigo)
        .query("SELECT ISNULL(SUM(SALDO),0) AS SALDO FROM [dbo].[KARDEX_2025_EMBALAGEM] WHERE CODIGO = @CODIGO AND D_E_L_E_T_ <> '*'");

      const mov = await pool.request()
        .input("CODIGO", sql.NVarChar, codigo)
        .query(`
          SELECT TOP 50 CODIGO, OPERACAO, QNT, USUARIO, convert(varchar, DT, 23) AS DT, convert(varchar, HR, 8) AS HH, MOTIVO
          FROM [dbo].[KARDEX_2025]
          WHERE CODIGO = @CODIGO AND D_E_L_E_T_ <> '*'
          ORDER BY DT DESC, HR DESC
        `);

      return res.status(200).json({
        codigo,
        descricao: (prod.recordset[0] && prod.recordset[0].DESCRICAO) || null,
        saldo: (saldoRes.recordset[0] && saldoRes.recordset[0].SALDO) || 0,
        movimentos: mov.recordset || []
      });
    }

    if (req.method === "POST") {
      const { codigo, tipo, quantidade, usuario, endereco, armazem, motivo } = req.body || {};
      if (!codigo || !tipo || !quantidade || !usuario) {
        return res.status(400).json({ message: "codigo, tipo, quantidade e usuario são obrigatórios" });
      }

      const operacao = (String(tipo).toUpperCase() === "ENTRADA") ? "ENTRADA" : "SAIDA";
      const qnt = Number(quantidade) * (operacao === "SAIDA" ? -1 : 1);

      await pool.request()
        .input("D_E_L_E_T_", sql.NVarChar, "")
        .input("APLICATIVO", sql.NVarChar, "WEB")
        .input("CODIGO", sql.NVarChar, codigo)
        .input("ENDERECO", sql.NVarChar, endereco || "")
        .input("ARMAZEM", sql.NVarChar, armazem || "")
        .input("QNT", sql.Int, qnt)
        .input("OPERACAO", sql.NVarChar, operacao)
        .input("USUARIO", sql.NVarChar, usuario)
        .input("DT", sql.Date, new Date())
        .input("HR", sql.VarChar, new Date().toTimeString().split(" ")[0])
        .input("MOTIVO", sql.NVarChar, motivo || "")
        .query(`
          INSERT INTO [dbo].[KARDEX_2025]
            ([D_E_L_E_T_],[APLICATIVO],[CODIGO],[ENDERECO],[ARMAZEM],[QNT],[OPERACAO],[USUARIO],[DT],[HR],[MOTIVO])
          VALUES
            (@D_E_L_E_T_, @APLICATIVO, @CODIGO, @ENDERECO, @ARMAZEM, @QNT, @OPERACAO, @USUARIO, @DT, @HR, @MOTIVO);
        `);

      if (operacao === "ENTRADA") {
        await pool.request()
          .input("CODIGO", sql.NVarChar, codigo)
          .input("ENDERECO", sql.NVarChar, endereco || "")
          .input("ARMAZEM", sql.NVarChar, armazem || "")
          .input("QNT", sql.Int, qnt)
          .input("USUARIO", sql.NVarChar, usuario)
          .input("DT", sql.Date, new Date())
          .input("HR", sql.VarChar, new Date().toTimeString().split(" ")[0])
          .input("MOTIVO", sql.NVarChar, motivo || "")
          .query(`
            INSERT INTO [dbo].[KARDEX_2025_EMBALAGEM]
              ([D_E_L_E_T_],[CODIGO],[ENDERECO],[ARMAZEM],[QNT],[USUARIO],[DT],[HR],[MOTIVO],[SALDO])
            VALUES
              ('', @CODIGO, @ENDERECO, @ARMAZEM, @QNT, @USUARIO, @DT, @HR, @MOTIVO, @QNT);
          `);
      }

      return res.status(200).json({ message: "Movimento registrado com sucesso." });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Método não permitido" });
  } catch (err) {
    console.error("ERRO /api/inventory:", err);
    return res.status(500).json({ message: "Erro interno", error: err.message });
  }
}
