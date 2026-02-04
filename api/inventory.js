import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
  try {
    const pool = await getConnection();

    if (req.method === "GET") {
      const { codigo, action } = req.query;
      
      // Ação para buscar saldo agrupado por local
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

      // Nova ação para buscar saldo individual por lote
      if (action === 'saldoPorLote' && codigo) {
        const result = await pool.request()
          .input("CODIGO", sql.VarChar(10), codigo)
          .query(`
            SELECT 
              ID,
              ARMAZEM,
              ENDERECO,
              QNT AS TAM_LOTE,
              SALDO
            FROM [dbo].[KARDEX_2026_EMBALAGEM]
            WHERE [D_E_L_E_T_] = '' 
              AND CODIGO = @CODIGO 
              AND SALDO > 0
              AND KARDEX = 2026
            ORDER BY ID DESC
          `);
        return res.status(200).json({ lotes: result.recordset });
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
        movimentos: mov.recordset,
      });
    }

    if (req.method === "POST") {
      const {
        codigo,
        tipo,
        quantidade,
        usuario,
        endereco,
        armazem,
        observacao,
        idTbResumo, // ID do lote para a saída
      } = req.body;
      
      if (!codigo || !tipo || !quantidade || !usuario) {
        return res.status(400).json({ message: "Dados insuficientes para registrar movimento." });
      }

      const operacao = tipo.toUpperCase();
      const transaction = pool.transaction();
      let responseData = { message: "Movimento registrado com sucesso!" };
      
      try {
        await transaction.begin();

        if (operacao === 'ENTRADA') {
          // Lógica de ENTRADA
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
            .input("MOTIVO", sql.VarChar, "NOVO")
            .input("OBS", sql.VarChar, observacao || "")
            .input("QNT_SAIDA", sql.Float, 0)
            .input("USUARIO_SAIDA", sql.VarChar, "")
            .input("DT_SAIDA", sql.VarChar, "")
            .input("HR_SAIDA", sql.VarChar, "")
            .input("KARDEX", sql.Int, 2026)
            .query(`
              INSERT INTO [dbo].[KARDEX_2026_EMBALAGEM] 
              ([D_E_L_E_T_], [CODIGO], [ENDERECO], [ARMAZEM], [QNT], [USUARIO], [DT], [HR], [MOTIVO], [OBS], [QNT_SAIDA], [USUARIO_SAIDA], [DT_SAIDA], [HR_SAIDA], [KARDEX])
              OUTPUT INSERTED.ID
              VALUES (@D_E_L_E_T_, @CODIGO, @ENDERECO, @ARMAZEM, @QNT, @USUARIO, @DT, @HR, @MOTIVO, @OBS, @QNT_SAIDA, @USUARIO_SAIDA, @DT_SAIDA, @HR_SAIDA, @KARDEX);
            `);

          const ultimoId = embResult.recordset[0]?.ID;
          if (!ultimoId) {
            throw new Error("Falha ao obter o ID da inserção em EMBALAGEM.");
          }

          // Inserir em KARDEX_2026
          await transaction
            .request()
            .input("D_E_L_E_T_", sql.VarChar, "")
            .input("APLICATIVO", sql.VarChar, "SGC-WEB")
            .input("ID_TB_RESUMO", sql.Int, ultimoId)
            .input("CODIGO_log", sql.VarChar, codigo)
            .input("ENDERECO_log", sql.VarChar, endereco || "")
            .input("ARMAZEM_log", sql.VarChar, armazem || "")
            .input("QNT_log", sql.Float, quantidade)
            .input("OPERACAO_log", sql.VarChar, "ENTRADA")
            .input("USUARIO_log", sql.VarChar, usuario)
            .input("DT_log", sql.Date, new Date())
            .input("HR_log", sql.VarChar, new Date().toTimeString().split(" ")[0])
            .input("MOTIVO_log", sql.VarChar, "NOVO")
            .input("OBS_log", sql.VarChar, observacao || "")
            .input("KARDEX_log", sql.Int, 2026)
            .input("CAIXA_log", sql.VarChar, "")
            .query(`
              INSERT INTO [dbo].[KARDEX_2026] 
              ([D_E_L_E_T_], [APLICATIVO], [ID_TB_RESUMO], [CODIGO], [ENDERECO], [ARMAZEM], [QNT], [OPERACAO], [USUARIO], [DT], [HR], [MOTIVO], [OBS], [KARDEX], [CAIXA])
              VALUES (@D_E_L_E_T_, @APLICATIVO, @ID_TB_RESUMO, @CODIGO_log, @ENDERECO_log, @ARMAZEM_log, @QNT_log, @OPERACAO_log, @USUARIO_log, @DT_log, @HR_log, @MOTIVO_log, @OBS_log, @KARDEX_log, @CAIXA_log);
            `);
          
          // Busca a descrição do produto para retornar para a etiqueta
          const prod = await transaction.request()
              .input("CODIGO_PROD", sql.VarChar, codigo)
              .query("SELECT DESCRICAO FROM [dbo].[CAD_PROD] WHERE CODIGO = @CODIGO_PROD");
          const descricaoProduto = (prod.recordset[0] && prod.recordset[0].DESCRICAO) || 'N/A';

          responseData.labelData = {
              idMovimento: ultimoId,
              codigo: codigo,
              descricao: descricaoProduto,
              quantidade: quantidade,
              endereco: endereco || '',
              armazem: armazem || '',
              usuario: usuario,
              dataHora: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
              tipoMovimento: 'ENTRADA'
          };

        } else if (operacao === 'SAIDA') {
          // Lógica de SAÍDA (refeita)
          if (!idTbResumo) {
            return res.status(400).json({ message: "ID do lote é obrigatório para a saída." });
          }

          const loteInfo = await transaction.request()
            .input('ID', sql.Int, idTbResumo)
            .query("SELECT SALDO, QNT_SAIDA, ENDERECO, ARMAZEM, QNT FROM [dbo].[KARDEX_2026_EMBALAGEM] WHERE ID = @ID");

          if (loteInfo.recordset.length === 0) {
            throw new Error(`Lote com ID ${idTbResumo} não encontrado.`);
          }

          const { SALDO, QNT_SAIDA, ENDERECO, ARMAZEM, QNT: TAM_LOTE } = loteInfo.recordset[0];

          if (quantidade > SALDO) {
            throw new Error(`Saldo insuficiente. O lote possui ${SALDO}, mas a tentativa foi de retirar ${quantidade}.`);
          }

          const novaQntSaida = (QNT_SAIDA || 0) + quantidade;

          await transaction.request()
            .input('ID_upd', sql.Int, idTbResumo)
            .input('NOVA_QNT_SAIDA', sql.Float, novaQntSaida)
            .input('USUARIO_SAIDA', sql.VarChar, usuario)
            .input('DT_SAIDA', sql.Date, new Date())
            .input('HR_SAIDA', sql.VarChar, new Date().toTimeString().split(" ")[0])
            .query(`
                UPDATE [dbo].[KARDEX_2026_EMBALAGEM] 
                SET [QNT_SAIDA] = @NOVA_QNT_SAIDA,
                    [USUARIO_SAIDA] = @USUARIO_SAIDA,
                    [DT_SAIDA] = @DT_SAIDA,
                    [HR_SAIDA] = @HR_SAIDA 
                WHERE ID = @ID_upd
            `);

          await transaction.request()
            .input("D_E_L_E_T_", sql.VarChar, "")
            .input("APLICATIVO", sql.VarChar, "SGC-WEB")
            .input("ID_TB_RESUMO", sql.Int, idTbResumo)
            .input("CODIGO_log", sql.VarChar, codigo)
            .input("ENDERECO_log", sql.VarChar, ENDERECO)
            .input("ARMAZEM_log", sql.VarChar, ARMAZEM)
            .input("QNT_log", sql.Float, -quantidade)
            .input("OPERACAO_log", sql.VarChar, "SAÍDA")
            .input("USUARIO_log", sql.VarChar, usuario)
            .input("DT_log", sql.Date, new Date())
            .input("HR_log", sql.VarChar, new Date().toTimeString().split(" ")[0])
            .input("MOTIVO_log", sql.VarChar, "")
            .input("OBS_log", sql.VarChar, observacao || "")
            .input("KARDEX_log", sql.Int, 2026)
            .input("CAIXA_log", sql.Float, TAM_LOTE)
            .query(`
                INSERT INTO [dbo].[KARDEX_2026] 
                ([D_E_L_E_T_],[APLICATIVO],[ID_TB_RESUMO],[CODIGO],[ENDERECO],[ARMAZEM],[QNT],[OPERACAO],[USUARIO],[DT],[HR],[MOTIVO],[OBS],[KARDEX],[CAIXA])
                VALUES (@D_E_L_E_T_, @APLICATIVO, @ID_TB_RESUMO, @CODIGO_log, @ENDERECO_log, @ARMAZEM_log, @QNT_log, @OPERACAO_log, @USUARIO_log, @DT_log, @HR_log, @MOTIVO_log, @OBS_log, @KARDEX_log, @CAIXA_log);
            `);
        }

        await transaction.commit();
        return res.status(201).json(responseData);

      } catch (err) {
        await transaction.rollback();
        console.error("Erro ao registrar movimento:", err);
        return res
          .status(500)
          .json({ message: err.message || "Erro no servidor ao registrar movimento." });
      }
    }
  } catch (error) {
    console.error("Erro na API de inventário:", error);
    res.status(500).json({ message: "Erro interno no servidor.", error: error.message });
  }
}