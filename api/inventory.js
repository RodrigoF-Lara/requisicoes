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
            AND KARDEX = 2026
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
      if (!codigo || !tipo || quantidade == null || !usuario) {
        return res.status(400).json({ message: "Campos obrigatórios: código, tipo, quantidade, usuário." });
      }

      const operacao = tipo.toUpperCase() === "ENTRADA" ? "ENTRADA" : "SAIDA";
      const qntValue = operacao === "SAIDA" ? -quantidade : quantidade;

      const transaction = pool.transaction();
      try {
        await transaction.begin();

        // 1. Inserir em KARDEX_2026_EMBALAGEM e obter o ID
        const embResult = await transaction
          .request()
        .input("D_E_L_E_T_", sql.VarChar, "")
        .input("CODIGO", sql.VarChar, codigo)
        .input("ENDERECO", sql.VarChar, endereco || "")
        .input("ARMAZEM", sql.VarChar, armazem || "")
        .input("QNT", sql.Float, quantidade)
        .input("USUARIO", sql.VarChar, usuario)
        .input("DT", sql.Date, new Date())
        .input("HR", sql.VarChar, new Date().toTimeString().split(" ")[0])
        .input("MOTIVO", sql.VarChar, "NOVO") // Corrigido
        .input("OBS", sql.VarChar, observacao || "")
        .input("QNT_SAIDA", sql.Float, 0) // Corrigido
        .input("USUARIO_SAIDA", sql.VarChar, "") // Corrigido
        .input("DT_SAIDA", sql.VarChar, "") // Corrigido
        .input("HR_SAIDA", sql.VarChar, "") // Corrigido
        .input("KARDEX", sql.Int, 2026)
        .query(`
            INSERT INTO [dbo].[KARDEX_2026_EMBALAGEM] 
            ([D_E_L_E_T_], [CODIGO], [ENDERECO], [ARMAZEM], [QNT], [USUARIO], [DT], [HR], [MOTIVO], [OBS], [QNT_SAIDA], [USUARIO_SAIDA], [DT_SAIDA], [HR_SAIDA], [KARDEX])
            OUTPUT INSERTED.ID
            VALUES (@D_E_L_E_T_, @CODIGO, @ENDERECO, @ARMAZEM, @QNT, @USUARIO, @DT, @HR, @MOTIVO, @OBS, @QNT_SAIDA, @USUARIO_SAIDA, @DT_SAIDA, @HR_SAIDA, @KARDEX);
        if (!ultimoId) {
          throw new Error("Falha ao obter o ID da inserção em EMBALAGEM.");
        }

        // 2. Inserir em KARDEX_2026
        await transaction
          .request()
        .input("D_E_L_E_T_", sql.VarChar, "")
        .input("APLICATIVO", sql.VarChar, "SGC-WEB")
        .input("ID_TB_RESUMO", sql.Int, ultimoId)
        .input("CODIGO", sql.VarChar, codigo)
        .input("ENDERECO", sql.VarChar, endereco || "")
        .input("ARMAZEM", sql.VarChar, armazem || "")
        .input("QNT", sql.Float, quantidade)
        .input("OPERACAO", sql.VarChar, "ENTRADA")
        .input("USUARIO", sql.VarChar, usuario)
        .input("DT", sql.Date, new Date())
        .input("HR", sql.VarChar, new Date().toTimeString().split(" ")[0])
        .input("MOTIVO", sql.VarChar, "NOVO") // Corrigido
        .input("OBS", sql.VarChar, observacao || "")
        .input("KARDEX", sql.Int, 2026)
        .input("CAIXA", sql.VarChar, "") // Corrigido
        .query(`
            INSERT INTO [dbo].[KARDEX_2026] 
            ([D_E_L_E_T_], [APLICATIVO], [ID_TB_RESUMO], [CODIGO], [ENDERECO], [ARMAZEM], [QNT], [OPERACAO], [USUARIO], [DT], [HR], [MOTIVO], [OBS], [KARDEX], [CAIXA])
            VALUES (@D_E_L_E_T_, @APLICATIVO, @ID_TB_RESUMO, @CODIGO, @ENDERECO, @ARMAZEM, @QNT, @OPERACAO, @USUARIO, @DT, @HR, @MOTIVO, @OBS, @KARDEX, @CAIXA);
        return res.status(201).json({ message: "Movimento registrado com sucesso!" });
      } catch (err) {
        await transaction.rollback();
        console.error("Erro ao registrar movimento:", err);
        return res
          .status(500)
          .json({ message: "Erro ao registrar movimento", error: err.message });
      }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("ERRO /api/inventory:", err);
    return res.status(500).json({ message: "Erro interno", error: err.message, stack: err.stack });
  }
}