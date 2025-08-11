const { sql, config } = require('./db');

module.exports = async (req, res) => {
    if (req.method === "GET") {
        return res.status(200).json({ message: "API online e pronta para receber uploads!" });
    }

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { data } = req.body;
    if (!Array.isArray(data) || !data.length) {
        return res.status(400).json({ message: "Dados inválidos" });
    }

    try {
        await sql.connect(config);

        for (let row of data) {
            await sql.query`
                INSERT INTO [dbo].[TB_REQUISICOES]
                (SOLICITANTE, DT_REQUISICAO, HR_REQUSICAO, STATUS)
                VALUES (
                    ${row.SOLICITANTE || null},
                    ${row.DT_REQUISICAO || null},
                    ${row.HR_REQUSICAO || null},
                    ${row.STATUS || null}
                )
            `;
        }

        res.status(200).json({ message: "Dados inseridos com sucesso no Azure!" });

    } catch (err) {
        console.error("Erro SQL:", err);
        res.status(500).json({ message: "Erro ao inserir no Azure", error: err.message });
    } finally {
        sql.close();
    }
};