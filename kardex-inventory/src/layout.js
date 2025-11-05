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
                <!-- Resultados da consulta serão exibidos aqui -->
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