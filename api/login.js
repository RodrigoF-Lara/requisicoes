const { sql, config } = require('./db');

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }
    const { usuario, pw } = req.body;
    if (!usuario || !pw) {
        return res.status(400).json({ message: "Usuário e senha obrigatórios" });
    }
    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT [USUARIO],[PW],[NIVEL],[CPF],[F_NAME],[L_NAME],[ID],[COD],[SETOR]
            FROM [dbo].[CAD_USUARIO]
            WHERE [USUARIO]=${usuario} AND [PW]=${pw}
        `;
        if (result.recordset.length === 1) {
            const user = result.recordset[0];
            res.status(200).json({ usuario: user });
        } else {
            res.status(401).json({ message: "Usuário ou senha inválidos" });
        }
    } catch (err) {
        res.status(500).json({ message: "Erro no servidor", error: err.message });
    } finally {
        sql.close();
    }
};