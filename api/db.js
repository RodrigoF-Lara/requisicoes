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

// Função para obter uma conexão do pool compartilhado
export async function getConnection() {
    try {
        if (!pool) {
            console.log('POOL INEXISTENTE: Criando novo pool de conexões.');
            pool = await sql.connect(config);
        }
        return pool;
    } catch (err) {
        console.error("Erro CRÍTICO ao conectar ao banco de dados:", err);
        // Se a conexão falhar, limpa o pool para forçar uma nova tentativa na próxima vez
        pool = null; 
        throw err;
    }
}