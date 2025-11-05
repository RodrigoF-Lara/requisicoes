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
          SELECT TOP 50 ID, CODIGO, OPERACAO, QNT, USUARIO, convert(varchar, DT, 23) AS DT, convert(varchar, HR, 8) AS HR, MOTIVO, ID_TB_RESUMO
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
      // parse seguro do body
      let body = {};
      try {
        if (req.body && typeof req.body === "string") body = JSON.parse(req.body);
        else body = req.body || {};
      } catch (parseErr) {
        console.error("Invalid JSON body:", parseErr);
        return res.status(400).json({ message: "Invalid JSON in request body" });
      }

      const { codigo, tipo, quantidade, usuario, endereco, armazem, motivo } = body;
      if (!codigo || !tipo || !quantidade || !usuario) {
        return res.status(400).json({ message: "codigo, tipo, quantidade e usuario são obrigatórios" });
      }

      const operacao = (String(tipo).toUpperCase() === "ENTRADA") ? "ENTRADA" : "SAIDA";
      const qntValue = Number(quantidade) * (operacao === "SAIDA" ? -1 : 1);

      const transaction = pool.transaction();
      try {
        await transaction.begin();
        const txReq = transaction.request();

        const now = new Date();
        const dtParam = now;
        const hrParam = now.toTimeString().split(" ")[0];
        const KARDEX_CONST = 2025;

        let resumoId = null;

        // Para ENTRADA: primeiro insere em KARDEX_2025_EMBALAGEM e recupera o ID gerado
        if (operacao === "ENTRADA") {
          const insertEmbResult = await txReq
            .input("CODIGO2", sql.NVarChar, codigo)
            .input("ENDERECO2", sql.NVarChar, endereco || "")
            .input("ARMAZEM2", sql.NVarChar, armazem || "")
            .input("QNT2", sql.Int, Number(quantidade))
            .input("USUARIO2", sql.NVarChar, usuario)
            .input("DT2", sql.DateTime, dtParam)
            .input("HR2", sql.VarChar, hrParam)
            .input("MOTIVO2", sql.NVarChar, motivo || "")
            .input("KARDEX2", sql.Int, KARDEX_CONST)
            .query(`
              INSERT INTO [dbo].[KARDEX_2025_EMBALAGEM]
                ([D_E_L_E_T_],[CODIGO],[ENDERECO],[ARMAZEM],[QNT],[USUARIO],[DT],[HR],[MOTIVO],[KARDEX])
              OUTPUT INSERTED.ID AS NEWID
              VALUES
                ('', @CODIGO2, @ENDERECO2, @ARMAZEM2, @QNT2, @USUARIO2, @DT2, @HR2, @MOTIVO2, @KARDEX2);
            `);

          if (insertEmbResult && insertEmbResult.recordset && insertEmbResult.recordset[0]) {
            resumoId = insertEmbResult.recordset[0].NEWID;
          } else {
            throw new Error("Falha ao obter ID inserido em KARDEX_2025_EMBALAGEM");
          }
        }

        // Em seguida insere em KARDEX_2025 — se houver resumoId passa em ID_TB_RESUMO
        const insertKardexReq = txReq
          .input("D_E_L_E_T_", sql.NVarChar, "")
          .input("APLICATIVO", sql.NVarChar, "WEB")
          .input("CODIGO", sql.NVarChar, codigo)
          .input("ENDERECO", sql.NVarChar, endereco || "")
          .input("ARMAZEM", sql.NVarChar, armazem || "")
          .input("QNT", sql.Int, qntValue)
          .input("OPERACAO", sql.NVarChar, operacao)
          .input("USUARIO", sql.NVarChar, usuario)
          .input("DT", sql.DateTime, dtParam)
          .input("HR", sql.VarChar, hrParam)
          .input("MOTIVO", sql.NVarChar, motivo || "")
          .input("KARDEX", sql.Int, KARDEX_CONST);

        if (resumoId !== null) insertKardexReq.input("ID_TB_RESUMO", sql.Int, resumoId);
        else insertKardexReq.input("ID_TB_RESUMO", sql.Int, null);

        const columns = `[D_E_L_E_T_],[APLICATIVO],[CODIGO],[ENDERECO],[ARMAZEM],[QNT],[OPERACAO],[USUARIO],[DT],[HR],[MOTIVO],[KARDEX],[ID_TB_RESUMO]`;
        const values = `(@D_E_L_E_T_, @APLICATIVO, @CODIGO, @ENDERECO, @ARMAZEM, @QNT, @OPERACAO, @USUARIO, @DT, @HR, @MOTIVO, @KARDEX, @ID_TB_RESUMO)`;

        await insertKardexReq.query(`
          INSERT INTO [dbo].[KARDEX_2025]
            (${columns})
          VALUES
            (${values});
        `);

        await transaction.commit();
        return res.status(200).json({ message: "Movimento registrado com sucesso.", resumoId });
      } catch (txErr) {
        try { await transaction.rollback(); } catch (r) { console.error("Rollback falhou:", r); }
        console.error("TRANSACTION ERROR /api/inventory:", txErr);
        return res.status(500).json({ message: "Erro interno durante registro (transação)", error: txErr.message, stack: txErr.stack });
      }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Método não permitido" });
  } catch (err) {
    console.error("ERRO /api/inventory:", err);
    return res.status(500).json({ message: "Erro interno", error: err.message, stack: err.stack });
  }
}