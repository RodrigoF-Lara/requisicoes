import sql from "mssql";

// Configuração do Azure via variáveis de ambiente
const config = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    database: process.env.AZURE_SQL_DATABASE,
    server: process.env.AZURE_SQL_SERVER,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: false }
};

export default async function handler(req, res) {
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
        const pool = await sql.connect(config);

        for (let row of data) {
            await pool.request()
                .input('ID_REQ', sql.Int, row.ID_REQ || null)
                .input('SOLICITANTE', sql.NVarChar, row.SOLICITANTE || null)
                .input('DT_REQUISICAO', sql.Date, row.DT_REQUISICAO || null)
                .input('HR_REQUSICAO', sql.NVarChar, row.HR_REQUSICAO || null)
                .input('STATUS', sql.NVarChar, row.STATUS || null)
                .query(`
                    INSERT INTO [dbo].[TB_REQUISICOES]
                    (ID_REQ, SOLICITANTE, DT_REQUISICAO, HR_REQUSICAO, STATUS)
                    VALUES (@ID_REQ, @SOLICITANTE, @DT_REQUISICAO, @HR_REQUSICAO, @STATUS)
                `);
        }

        res.status(200).json({ message: "Dados inseridos com sucesso no Azure!" });

    } catch (err) {
        console.error("Erro SQL:", err);
        res.status(500).json({ message: "Erro ao inserir no Azure", error: err.message });
    }
}
