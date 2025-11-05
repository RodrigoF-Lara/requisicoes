<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gerenciamento de Estoque</title>
    <link rel="stylesheet" href="style.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
</head>
<body>
    <div id="sidebar-container" class="sidebar"></div>

    <div class="main-content">
        <div class="container">
            <h1>Gerenciamento de Estoque</h1>

            <div class="form-group">
                <label for="codigo">Código do Produto:</label>
                <input type="text" id="codigo" placeholder="Digite o código do produto" required />
                <button id="consultarBtn" class="btn-destaque">Consultar</button>
            </div>

            <div id="resultadoConsulta" class="resultado-container" style="display: none;">
                <h2>Dados do Produto</h2>
                <div id="produtoInfo"></div>
            </div>

            <div class="form-group">
                <h2>Gerenciar Entradas e Saídas</h2>
                <label for="quantidade">Quantidade:</label>
                <input type="number" id="quantidade" placeholder="Quantidade" required />
                <button id="entradaBtn" class="btn-destaque">Registrar Entrada</button>
                <button id="saidaBtn" class="btn-destaque">Registrar Saída</button>
            </div>

            <div id="status" class="status-message"></div>
        </div>
    </div>

    <script src="inventoryManagement.js"></script>
    <script src="layout.js"></script>
</body>
</html>