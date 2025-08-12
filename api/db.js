// Arquivo: db.js
// Caminho: /api/db.js

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Aumenta o limite para aceitar mais dados do CSV

// Configuração do Pool de Conexões com o PlanetScale/MySQL
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//======================================================================
// ROTA POST PARA LOGIN
//======================================================================
app.post("/api/login", async (req, res) => {
  const { user, password } = req.body;
  try {
    const connection = await pool.promise().getConnection();
    const [rows] = await connection.execute(
      "SELECT F_NAME, L_NAME FROM KARDEX_USERS WHERE USER = ? AND PASSWORD = ?",
      [user, password]
    );
    connection.release();
    if (rows.length > 0) {
      res.status(200).json({ success: true, usuario: rows[0] });
    } else {
      res.status(401).json({ success: false, message: "Usuário ou senha inválidos" });
    }
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

//======================================================================
// ROTA POST PARA UPLOAD DOS DADOS DO CSV
//======================================================================
app.post("/api/upload", async (req, res) => {
  const { data, idReq } = req.body;
  if (!data || data.length === 0 || !idReq) {
    return res.status(400).json({ error: "Dados inválidos ou ID da requisição não fornecido." });
  }

  const connection = await pool.promise().getConnection();
  try {
    await connection.beginTransaction();

    const query =
      "INSERT INTO KARDEX_REQ (ID_REQ, CODIGO, QNT_REQ, DATA_REQ) VALUES (?, ?, ?, ?)";

    for (const item of data) {
      if (item.CODIGO && item.QNT_REQ) {
        await connection.execute(query, [
          idReq,
          item.CODIGO,
          item.QNT_REQ,
          new Date(),
        ]);
      }
    }

    await connection.commit();
    connection.release();
    res.status(200).json({ success: true, message: "Dados importados com sucesso!" });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Erro ao importar dados:", error);
    res.status(500).json({ error: "Erro ao salvar os dados no banco." });
  }
});

//======================================================================
// ROTA GET PARA CONSULTAR REQUISIÇÕES
//======================================================================
app.get("/api/requisicoes", async (req, res) => {
  try {
    const connection = await pool.promise().getConnection();
    
    // Query SQL para buscar um resumo de cada requisição
    // Agrupamos por ID_REQ para ter uma linha por requisição
    const [rows] = await connection.execute(`
      SELECT 
        ID_REQ,
        MIN(DATA_REQ) as DATA_REQ, 
        COUNT(*) as TOTAL_ITENS
      FROM KARDEX_REQ
      GROUP BY ID_REQ
      ORDER BY ID_REQ DESC
    `);
    
    connection.release();
    
    // Retorna os dados como JSON
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao buscar requisições:", error);
    res.status(500).json({ error: "Erro interno ao buscar dados das requisições." });
  }
});


// Exporta o app para que a Vercel possa usá-lo
module.exports = app;