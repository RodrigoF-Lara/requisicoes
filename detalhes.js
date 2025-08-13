// filepath: detalhes.js
document.addEventListener('DOMContentLoaded', async function() {
    const headerContainer = document.getElementById('detalhe-header-container');
    const itemsContainer = document.getElementById('detalhe-itens-container');

    // Pega o ID da requisição da URL
    const urlParams = new URLSearchParams(window.location.search);
    const idReq = urlParams.get('id');

    if (!idReq) {
        headerContainer.innerHTML = "<p class='error-message'>ID da requisição não encontrado na URL.</p>";
        return;
    }

    try {
        const response = await fetch(`/api/detalhes?id=${idReq}`);
        if (!response.ok) {
            throw new Error('Falha ao buscar detalhes da requisição.');
        }
        const data = await response.json();

        // Preenche o cabeçalho
        renderHeader(data.header);

        // Preenche a tabela de itens
        renderItems(data.items);

    } catch (error) {
        console.error("Erro ao carregar detalhes:", error);
        headerContainer.innerHTML = `<p class='error-message'>${error.message}</p>`;
    }
});

function renderHeader(header) {
    const headerContainer = document.getElementById('detalhe-header-container');
    const dataReqFormatada = new Date(header.DT_REQUISICAO).toLocaleDateString('pt-BR');
    const dataNecFormatada = new Date(header.DT_NECESSIDADE).toLocaleDateString('pt-BR');

    headerContainer.innerHTML = `
        <div class="detalhe-header-grid">
            <div><strong>ID da Requisição:</strong> ${header.ID_REQ}</div>
            <div><strong>Data da Requisição:</strong> ${dataReqFormatada}</div>
            <div><strong>Solicitante:</strong> ${header.SOLICITANTE}</div>
            <div><strong>Data de Necessidade:</strong> ${dataNecFormatada}</div>
            <div><strong>Prioridade:</strong> <span class="status-tag prioridade-${header.PRIORIDADE.toLowerCase()}">${header.PRIORIDADE}</span></div>
            <div><strong>Status:</strong> <span class="status-tag status-${header.STATUS.toLowerCase()}">${header.STATUS}</span></div>
        </div>
    `;
}

function renderItems(items) {
    const itemsContainer = document.getElementById('detalhe-itens-container');

    if (items.length === 0) {
        itemsContainer.innerHTML = '<p class="info-message">Não há itens nesta requisição.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'consulta-table'; // Reutilizando o estilo da tabela de consulta
    table.innerHTML = `
        <thead>
            <tr>
                <th>Item</th>
                <th>Código do Produto</th>
                <th>Quantidade Requisitada</th>
                <th>Quantidade Paga</th>
                <th>Saldo</th>
                <th>Status do Item</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
                <tr>
                    <td>${item.ID_REQ_ITEM}</td>
                    <td>${item.CODIGO}</td>
                    <td>${item.QNT_REQ}</td>
                    <td>${item.QNT_PAGA}</td>
                    <td>${item.SALDO}</td>
                    <td><span class="status-tag status-${item.STATUS_ITEM.toLowerCase()}">${item.STATUS_ITEM}</span></td>
                </tr>
            `).join('')}
        </tbody>
    `;
    itemsContainer.appendChild(table);
}