import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
  try {
    const pool = await getConnection();

    if (req.method === "GET") {
      const { codigo, action } = req.query;
      
      // Novo endpoint para saldo por local
      if (action === 'saldoLocal' && codigo) {
        const result = await pool.request()
          .input("CODIGO", sql.VarChar(10), codigo)
          .query(`
            SELECT 
              ARMAZEM,
              ENDERECO,
              QNT AS TAM_LOTE,
              COUNT(*) AS QNT_CAIXAS,
              SUM(SALDO) AS SALDO
            FROM [dbo].[KARDEX_2026_EMBALAGEM]
            WHERE [D_E_L_E_T_] = '' 
              AND CODIGO = @CODIGO 
              AND SALDO > 0
              AND KARDEX = 2026
            GROUP BY ARMAZEM, ENDERECO, QNT
            ORDER BY ARMAZEM, ENDERECO
          `);
        
        return res.status(200).json({ locais: result.recordset });
      }
      
      // Endpoint original de consulta
      const codigoQuery = String((req.query && req.query.codigo) || "").trim();
      if (!codigoQuery) return res.status(400).json({ message: "codigo é obrigatório" });

      const prod = await pool.request()
        .input("CODIGO", sql.VarChar(10), codigoQuery)
        .query("SELECT TOP 1 CODIGO, DESCRICAO FROM [dbo].[CAD_PROD] WHERE CODIGO = @CODIGO");

      const saldoRes = await pool.request()
        .input("CODIGO", sql.VarChar(10), codigoQuery)
        .query("SELECT ISNULL(SUM(SALDO),0) AS SALDO FROM [dbo].[KARDEX_2026_EMBALAGEM] WHERE CODIGO = @CODIGO AND D_E_L_E_T_ <> '*' AND KARDEX = 2026");

      const mov = await pool.request()
        .input("CODIGO", sql.VarChar(10), codigoQuery)
        .query(`
          SELECT TOP 50 
            ID, 
            CODIGO, 
            OPERACAO, 
            QNT, 
            USUARIO, 
            ENDERECO,
            ARMAZEM,
            convert(varchar, DT, 23) AS DT, 
            convert(varchar, HR, 8) AS HR, 
            MOTIVO, 
            ID_TB_RESUMO
          FROM [dbo].[KARDEX_2026]
          WHERE CODIGO = @CODIGO 
            AND D_E_L_E_T_ <> '*' 
            AND USUARIO <> 'BJULHAO'
            AND KARDEX = '2026'
          ORDER BY DT DESC, HR DESC
        `);

      return res.status(200).json({
        codigo: codigoQuery,
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

      const { codigo, tipo, quantidade, usuario, endereco, armazem, observacao } = body;
      if (!codigo || !quantidade || !usuario) {
        return res.status(400).json({ message: "Código, quantidade e usuário são obrigatórios." });
      }

      const operacao = tipo.toUpperCase() === "ENTRADA" ? "ENTRADA" : "SAIDA";
      const qntValue = operacao === "SAIDA" ? -quantidade : quantidade;

      const transaction = pool.transaction();
      try {
        await transaction.begin();

        await transaction.request()
          .input("CODIGO", sql.VarChar(10), codigo)
          .input("ENDERECO", sql.VarChar(100), endereco || "")
          .input("ARMAZEM", sql.VarChar(50), armazem || "")
          .input("QNT", sql.Float, qntValue)
          .input("USUARIO", sql.VarChar(50), usuario)
          .input("OBS", sql.NVarChar(sql.MAX), observacao || "")
          .input("OPERACAO", sql.VarChar(50), operacao)
          .input("DT", sql.Date, new Date())
          .input("HR", sql.Time, new Date())
          .query(`
            INSERT INTO [dbo].[KARDEX_2026_EMBALAGEM]
            ([CODIGO], [ENDERECO], [ARMAZEM], [QNT], [USUARIO], [OBS], [OPERACAO], [DT], [HR])
            VALUES (@CODIGO, @ENDERECO, @ARMAZEM, @QNT, @USUARIO, @OBS, @OPERACAO, @DT, @HR)
          `);

        await transaction.commit();
        return res.status(201).json({ message: "Movimento registrado com sucesso!" });
      } catch (err) {
        await transaction.rollback();
        console.error("Erro ao registrar movimento:", err);
        return res.status(500).json({ message: "Erro ao registrar movimento", error: err.message });
      }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Método não permitido" });
  } catch (err) {
    console.error("ERRO /api/inventory:", err);
    return res.status(500).json({ message: "Erro interno", error: err.message, stack: err.stack });
  }
}