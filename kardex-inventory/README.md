### 1. HTML Structure (inventoryManagement.html)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gerenciamento de Inventário</title>
    <link rel="stylesheet" href="style.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
</head>
<body>
    <div id="sidebar-container" class="sidebar"></div>

    <div class="main-content">
        <div class="container">
            <h1>Gerenciamento de Inventário</h1>

            <div class="form-group">
                <label for="codigo">Código do Produto:</label>
                <input type="text" id="codigo" placeholder="Digite o código do produto" required />
                <button id="consultarBtn" class="btn-destaque">Consultar</button>
            </div>

            <div id="resultadoConsulta" class="resultado-container">
                <!-- Os dados do produto serão exibidos aqui -->
            </div>

            <h2>Gerenciar Entradas e Saídas</h2>
            <div class="form-group">
                <label for="quantidade">Quantidade:</label>
                <input type="number" id="quantidade" placeholder="Quantidade" required />
                <select id="tipoMovimento">
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                </select>
                <button id="gerenciarBtn" class="btn-destaque">Registrar Movimento</button>
            </div>

            <div id="status" class="status-message"></div>
        </div>
    </div>

    <script src="inventoryManagement.js"></script>
    <script src="layout.js"></script>
</body>
</html>
```

### 2. CSS Styles (style.css)

```css
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f4f4f4;
}

.container {
    max-width: 800px;
    margin: 20px auto;
    padding: 20px;
    background: white;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

h1, h2 {
    color: #333;
}

.form-group {
    margin-bottom: 15px;
}

input[type="text"], input[type="number"] {
    width: calc(100% - 22px);
    padding: 10px;
    margin-right: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

button {
    padding: 10px 15px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background-color: #218838;
}

.resultado-container {
    margin-top: 20px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.status-message {
    margin-top: 20px;
    color: #c00;
}
```

### 3. JavaScript Logic (inventoryManagement.js)

```javascript
document.getElementById('consultarBtn').addEventListener('click', async function() {
    const codigo = document.getElementById('codigo').value;
    const resultadoConsulta = document.getElementById('resultadoConsulta');

    if (!codigo) {
        resultadoConsulta.innerHTML = "<p class='status-message'>Por favor, insira um código de produto.</p>";
        return;
    }

    try {
        const response = await fetch(`/api/inventory?codigo=${codigo}`);
        const data = await response.json();

        if (response.ok) {
            resultadoConsulta.innerHTML = `
                <h3>Dados do Produto</h3>
                <p><strong>Código:</strong> ${data.codigo}</p>
                <p><strong>Descrição:</strong> ${data.descricao}</p>
                <p><strong>Quantidade em Estoque:</strong> ${data.quantidade}</p>
            `;
        } else {
            resultadoConsulta.innerHTML = `<p class='status-message'>${data.message}</p>`;
        }
    } catch (error) {
        resultadoConsulta.innerHTML = "<p class='status-message'>Erro ao consultar o produto.</p>";
    }
});

document.getElementById('gerenciarBtn').addEventListener('click', async function() {
    const codigo = document.getElementById('codigo').value;
    const quantidade = document.getElementById('quantidade').value;
    const tipoMovimento = document.getElementById('tipoMovimento').value;
    const status = document.getElementById('status');

    if (!codigo || !quantidade) {
        status.textContent = "Por favor, preencha todos os campos.";
        return;
    }

    try {
        const response = await fetch('/api/inventory/movimento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, quantidade, tipoMovimento })
        });

        const data = await response.json();

        if (response.ok) {
            status.textContent = `Movimento registrado com sucesso: ${data.message}`;
        } else {
            status.textContent = data.message;
        }
    } catch (error) {
        status.textContent = "Erro ao registrar o movimento.";
    }
});
```

### 4. Backend API (Example: inventory.js)

You would need to create an API endpoint to handle the requests made from the front end. Below is a simple example of how you might structure that API.

```javascript
import { getConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    const { method } = req;

    if (method === 'GET') {
        const { codigo } = req.query;
        const pool = await getConnection();

        try {
            const result = await pool.request()
                .input('codigo', sql.NVarChar, codigo)
                .query("SELECT * FROM [dbo].[TB_PRODUTOS] WHERE CODIGO = @codigo");

            if (result.recordset.length > 0) {
                res.status(200).json(result.recordset[0]);
            } else {
                res.status(404).json({ message: "Produto não encontrado." });
            }
        } catch (error) {
            res.status(500).json({ message: "Erro ao buscar produto.", error: error.message });
        }
    } else if (method === 'POST') {
        const { codigo, quantidade, tipoMovimento } = req.body;
        const pool = await getConnection();

        try {
            // Logic to update inventory based on tipoMovimento (entrada/saida)
            // Example: Update the quantity in the database
            res.status(200).json({ message: "Movimento registrado com sucesso." });
        } catch (error) {
            res.status(500).json({ message: "Erro ao registrar movimento.", error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
}
```

### Summary

This implementation provides a basic structure for an inventory management page where users can consult product data and manage inventory movements. You would need to adapt the backend API to fit your database schema and business logic. Additionally, ensure that you handle authentication and authorization as necessary for your application.