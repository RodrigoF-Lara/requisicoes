// filepath: api/db.js
import sql from "mssql";

// A configuração permanece a mesma
const config = {
    user: process.env.AZURE_SQL_USER || process.env.DB_USER,
    password: process.env.AZURE_SQL_PASSWORD || process.env.DB_PASS,
    database: process.env.AZURE_SQL_DATABASE || process.env.DB_NAME,
    server: process.env.AZURE_SQL_SERVER || process.env.DB_SERVER,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: false }
};

// Função simplificada para obter uma nova conexão
export async function getConnection() {
    try {
        const pool = await sql.connect(config);
        return pool;
    } catch (err) {
        console.error("ERRO CRÍTICO AO TENTAR CONECTAR AO BANCO DE DADOS:", err);
        // Lança o erro para que a função que chamou saiba que a conexão falhou
        throw err;
    }
}