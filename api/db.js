// filepath: api/db.js
import sql from "mssql";

// Configuração da conexão com o banco de dados
const config = {
    user: process.env.AZURE_SQL_USER || process.env.DB_USER,
    password: process.env.AZURE_SQL_PASSWORD || process.env.DB_PASS,
    database: process.env.AZURE_SQL_DATABASE || process.env.DB_NAME,
    server: process.env.AZURE_SQL_SERVER || process.env.DB_SERVER,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: false }
};

let pool;

// Função para obter uma conexão do pool
export async function getConnection() {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            console.log('Nova conexão com o banco de dados estabelecida.');
        } else {
            // Testar a conexão existente antes de reutilizar
            try {
                await pool.request().query('SELECT 1'); // Uma query simples para testar a conexão
            } catch (err) {
                console.warn('Conexão existente falhou, reconectando...', err);
                pool = await sql.connect(config); // Reconectar se a conexão falhou
                console.log('Reconexão com o banco de dados estabelecida.');
            }
        }
        return pool;
    } catch (err) {
        console.error("Erro ao conectar ao banco de dados:", err);
        throw err;
    }
}

// Função para fechar o pool de conexões (se necessário)
export async function closeConnection() {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('Conexão com o banco de dados fechada.');
        }
    } catch (err) {
        console.error("Erro ao fechar a conexão com o banco de dados:", err);
    }
}