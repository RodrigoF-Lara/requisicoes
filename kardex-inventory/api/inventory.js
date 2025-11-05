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
                <label for="codeInput">Código do Produto:</label>
                <input type="text" id="codeInput" placeholder="Digite o código do produto" required />
                <button id="consultButton" class="btn-destaque">Consultar</button>
            </div>

            <div id="productDetails" class="product-details" style="display: none;">
                <h2>Detalhes do Produto</h2>
                <p><strong>Código:</strong> <span id="productCode"></span></p>
                <p><strong>Descrição:</strong> <span id="productDescription"></span></p>
                <p><strong>Quantidade em Estoque:</strong> <span id="productQuantity"></span></p>
            </div>

            <div class="form-group">
                <h2>Gerenciar Entradas e Saídas</h2>
                <label for="quantityInput">Quantidade:</label>
                <input type="number" id="quantityInput" placeholder="Quantidade" required />
                <button id="entryButton" class="btn-destaque">Registrar Entrada</button>
                <button id="exitButton" class="btn-destaque">Registrar Saída</button>
            </div>

            <div id="statusMessage"></div>
        </div>
    </div>

    <script src="inventoryManagement.js"></script>
    <script src="layout.js"></script>
</body>
</html>