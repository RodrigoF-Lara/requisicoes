// filepath: detalhes.js
document.addEventListener('DOMContentLoaded', async function() {
    const headerContainer = document.getElementById('detalhe-header-container');
    const itemsContainer = document.getElementById('detalhe-itens-container');
    const urlParams = new URLSearchParams(window.location.search);
    const idReq = urlParams.get('id');

    const atenderModal = document.getElementById('atenderModal');
    const atenderForm = document.getElementById('atenderForm');
    const modalStatus = document.getElementById('modalStatus');
    const closeBtn = document.querySelector('.close-btn');

    if (!idReq) {
        headerContainer.innerHTML = "<p class='error-message'>ID da requisição não encontrado na URL.</p>";
        return;
    }

    async function carregarDetalhes() {
        try {
            headerContainer.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
            itemsContainer.innerHTML = '';

            const response = await fetch(`/api/detalhes?id=${idReq}`);
            const responseData = await response.json(); // Pega os dados da resposta

            if (!response.ok) {
                // Agora, a mensagem de erro virá do JSON que o servidor enviou
                throw new Error(responseData.message || 'Falha ao buscar detalhes da requisição.');
            }
            
            renderHeader(responseData.header);
            renderItems(responseData.items, idReq);
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error);
            headerContainer.innerHTML = `<p class='error-message'>${error.message}</p>`;
        }
    }

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
                carregarDetalhes();
            }, 1500);

        } catch (error) {
            modalStatus.textContent = `Erro: ${error.message}`;
            modalStatus.style.color = "#c00";
        }
    });
    
    closeBtn.addEventListener('click', () => atenderModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == atenderModal) {
            atenderModal.style.display = 'none';
        }
    });

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
                    <td data-label="Código">${item.CODIGO}</td>
                    <td data-label="Qtd. Req.">${item.QNT_REQ}</td>
                    <td data-label="Qtd. Atend.">${item.QNT_PAGA}</td>
                    <td data-label="Saldo">${item.SALDO}</td>
                    <td data-label="Status"><span class="status-tag status-${(item.STATUS_ITEM || 'pendente').toLowerCase()}">${item.STATUS_ITEM}</span></td>
                    <td data-label="Ações">
                        ${item.STATUS_ITEM !== 'PAGO' ? `
                        <button class="btn-detalhes btn-atender" 
                                data-id-req-item="${item.ID_REQ_ITEM}" 
                                data-id-req="${idReq}"
                                data-codigo="${item.CODIGO}"
                                data-qnt-req="${item.QNT_REQ}"
                                data-saldo="${item.SALDO}">
                            <i class="fa-solid fa-dolly"></i> Atender
                        </button>
                        ` : '<span class="info-message">Concluído</span>'}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    itemsContainer.appendChild(table);

    itemsContainer.querySelectorAll('.btn-atender').forEach(button => {
        button.addEventListener('click', function() {
            const { idReqItem, idReq, codigo, qntReq, saldo } = this.dataset;
            
            const atenderModal = document.getElementById('atenderModal');
            document.getElementById('modalCodigo').textContent = codigo;
            document.getElementById('modalQntReq').textContent = qntReq;
            document.getElementById('modalSaldo').textContent = saldo;
            document.getElementById('quantidadeAtendida').value = saldo;
            document.getElementById('modalStatus').textContent = '';

            const atenderForm = document.getElementById('atenderForm');
            atenderForm.dataset.idReqItem = idReqItem;
            atenderForm.dataset.idReq = idReq;

            atenderModal.style.display = 'block';
        });
    });
}