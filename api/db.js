// filepath: api/db.js
import sql from "mssql";

const config = {
    user: process.env.AZURE_SQL_USER || process.env.DB_USER,
    password: process.env.AZURE_SQL_PASSWORD || process.env.DB_PASS,
    database: process.env.AZURE_SQL_DATABASE || process.env.DB_NAME,
    server: process.env.AZURE_SQL_SERVER || process.env.DB_SERVER,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: false }
};

let pool;

export async function getConnection() {
    try {
        if (!pool) {
            pool = await sql.connect(config);
        }
        return pool;
    } catch (err) {
        console.error("Erro ao conectar ao banco de dados:", err);
        pool = null; // Limpa o pool em caso de erro para tentar de novo
        throw err;
    }
}

// A função que estava faltando na versão anterior
export async function closeConnection() {
    try {
        if (pool) {
            await pool.close();
            pool = null;
        }
    } catch (err) {
        console.error("Erro ao fechar a conexão com o banco de dados:", err);
    }
}