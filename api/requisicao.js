const { sql, config } = require('./db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ message: 'Método não permitido' });
        return;
    }

    const { solicitante, dtRequisicao, hrRequisicao, status, dtNecessidade, prioridade } = req.body;

    if (!solicitante || !dtRequisicao || !hrRequisicao || !status || !dtNecessidade || !prioridade) {
        res.status(400).json({ message: 'Dados incompletos' });
        return;
    }

    try {
        await sql.connect(config);
        const result = await sql.query`
            INSERT INTO [dbo].[TB_REQUISICOES]
                ([SOLICITANTE], [DT_REQUISICAO], [HR_REQUSICAO], [STATUS], [DT_NECESSIDADE], [PRIORIDADE])
            OUTPUT INSERTED.ID_REQ
            VALUES (${solicitante}, ${dtRequisicao}, ${hrRequisicao}, ${status}, ${dtNecessidade}, ${prioridade})
        `;
        const id = result.recordset[0]?.ID_REQ;
        if (id) {
            res.status(200).json({ id });
        } else {
            res.status(500).json({ message: 'Não foi possível obter o ID gerado.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Erro ao inserir requisição.', error: err.message });
    } finally {
        sql.close();
    }
};