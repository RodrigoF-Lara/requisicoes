import { getConnection, closeConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { data, idReq } = req.body; // Recebe o ID_REQ do corpo da requisição
    if (!Array.isArray(data) || !data.length || !idReq) {
        return res.status(400).json({ message: "Dados inválidos ou ID_REQ ausente" });
    }

    try {
        const pool = await getConnection();

        let idReqItem = 1; // Inicializa a sequência ID_REQ_ITEM

        for (let row of data) {
            const codigo = row.CODIGO; // Assumindo que a coluna no CSV se chama CODIGO
            const qntReq = parseFloat(row.QNT_REQ); // Assumindo que a coluna no CSV se chama QNT_REQ

            if (!codigo || isNaN(qntReq)) {
                console.warn("Linha ignorada devido a dados inválidos:", row);
                continue; // Ignora a linha se os dados forem inválidos
            }

            await pool.request()
                .input('ID_REQ', sql.Int, idReq)
                .input('ID_REQ_ITEM', sql.Int, idReqItem++)
                .input('CODIGO', sql.NVarChar, codigo)
                .input('QNT_REQ', sql.Float, qntReq)
                .input('QNT_PAGA', sql.Float, 0)
                .input('SALDO', sql.Float, qntReq)
                .input('STATUS_ITEM', sql.NVarChar, 'PENDENTE')
                .query(`
                    INSERT INTO [dbo].[TB_REQ_ITEM]
                    (ID_REQ, ID_REQ_ITEM, CODIGO, QNT_REQ, QNT_PAGA, SALDO, STATUS_ITEM)
                    VALUES (@ID_REQ, @ID_REQ_ITEM, @CODIGO, @QNT_REQ, @QNT_PAGA, @SALDO, @STATUS_ITEM)
                `);
        }

        res.status(200).json({ message: "Dados inseridos com sucesso na TB_REQ_ITEM!" });

    } catch (err) {
        console.error("Erro SQL:", err);
        res.status(500).json({ message: "Erro ao inserir na TB_REQ_ITEM", error: err.message });
    } finally {
        await closeConnection();
    }
}