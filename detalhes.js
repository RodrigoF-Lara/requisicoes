// filepath: detalhes.js
document.addEventListener('DOMContentLoaded', async function() {
    const headerContainer = document.getElementById('detalhe-header-container');
    const itemsContainer = document.getElementById('detalhe-itens-container');
    const urlParams = new URLSearchParams(window.location.search);
    const idReq = urlParams.get('id');

    // --- Elementos do Modal ---
    const atenderModal = document.getElementById('atenderModal');
    const atenderForm = document.getElementById('atenderForm');
    const modalStatus = document.getElementById('modalStatus');
    const closeBtn = document.querySelector('.close-btn');

    if (!idReq) {
        headerContainer.innerHTML = "<p class='error-message'>ID da requisição não encontrado.</p>";
        return;
    }

    // Função principal para carregar os dados
    async function carregarDetalhes() {
        try {
            headerContainer.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
            itemsContainer.innerHTML = '';

            const response = await fetch(`/api/detalhes?id=${idReq}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao buscar detalhes da requisição.');
            }
            const data = await response.json();
            renderHeader(data.header);
            renderItems(data.items, idReq);
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error);
            headerContainer.innerHTML = `<p class='error-message'>${error.message}</p>`;
        }
    }

    // Event listener para o formulário do modal
    atenderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const idReqItem = this.dataset.idReqItem;
        const idReq = this.dataset.idReq;
        const quantidadeAtendida = document.getElementById('quantidadeAtendida').value;
        const usuario = localStorage.getItem('userName');
        
        modalStatus.textContent = "Salvando...";
        modalStatus.style.color = "#222";

        try {
            const response = await fetch('/api/atenderRequisicao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idReqItem, idReq, quantidadeAtendida, usuario })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao salvar.');

            modalStatus.textContent = result.message;
            modalStatus.style.color = "green";
            
            setTimeout(() => {
                atenderModal.style.display = 'none';
                carregarDetalhes(); // Recarrega os dados para refletir a mudança
            }, 1500);

        } catch (error) {
            modalStatus.textContent = `Erro: ${error.message}`;
            modalStatus.style.color = "#c00";
        }
    });
    
    // Event listeners para fechar o modal
    closeBtn.addEventListener('click', () => atenderModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == atenderModal) {
            atenderModal.style.display = 'none';
        }
    });

    // Carrega os dados iniciais ao abrir a página
    carregarDetalhes();
});

function renderHeader(header) {
    const headerContainer = document.getElementById('detalhe-header-container');
    const dataReqFormatada = new Date(header.DT_REQUISICAO).toLocaleDateString('pt-BR');
    const dataNecFormatada = new Date(header.DT_NECESSIDADE).toLocaleDateString('pt-BR');
    headerContainer.innerHTML = `
        <div class="detalhe-grid">
            <div><strong>ID Requisição:</strong> ${header.ID_REQ}</div>
            <div><strong>Solicitante:</strong> ${header.SOLICITANTE || 'N/A'}</div>
            <div><strong>Data Requisição:</strong> ${dataReqFormatada}</div>
            <div><strong>Data Necessidade:</strong> ${dataNecFormatada}</div>
            <div><strong>Prioridade:</strong> <span class="status-tag prioridade-${(header.PRIORIDADE || 'normal').toLowerCase()}">${header.PRIORIDADE}</span></div>
            <div><strong>Status:</strong> <span class="status-tag status-${(header.STATUS || 'pendente').toLowerCase()}">${header.STATUS}</span></div>
        </div>
    `;
}

function renderItems(items, idReq) {
    const itemsContainer = document.getElementById('detalhe-itens-container');
    if (!items || items.length === 0) {
        itemsContainer.innerHTML = '<p class="info-message">Não há itens nesta requisição.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'consulta-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Item</th><th>Código</th><th>Qtd. Req.</th><th>Qtd. Atend.</th><th>Saldo</th><th>Status</th><th>Ações</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
                <tr>
                    <td data-label="Item">${item.ID_REQ_ITEM}</td>