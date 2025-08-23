document.addEventListener('DOMContentLoaded', async function() {
    // --- ELEMENTOS GLOBAIS ---
    const headerContainer = document.getElementById('detalhe-header-container');
    const itemsContainer = document.getElementById('detalhe-itens-container');
    const urlParams = new URLSearchParams(window.location.search);
    const idReq = urlParams.get('id');

    // Elementos dos Modais
    const atenderModal = document.getElementById('atenderModal');
    const atenderForm = document.getElementById('atenderForm');
    const logModal = document.getElementById('logModal');
    const logContent = document.getElementById('logContent');
    

    if (!idReq) {
        headerContainer.innerHTML = "<p class='error-message'>ID da requisição não encontrado na URL.</p>";
        return;
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    function renderHeader(header) {
        const dataNecessidade = formatarData(header.DT_NECESSIDADE);
        const dataRequisicao = formatarData(header.DT_REQUISICOES);
        headerContainer.innerHTML = `
            <div class="detalhe-header">
                <div><strong>Nº Requisição:</strong> ${header.ID_REQ}</div>
                <div><strong>Solicitante:</strong> ${header.SOLICITANTE || 'N/A'}</div>
                <div><strong>Data Requisição:</strong> ${dataRequisicao}</div>
                <div><strong>Data Necessidade:</strong> ${dataNecessidade}</div>
                <div><strong>Prioridade:</strong> <span class="prioridade-badge prioridade-${(header.PRIORIDADE || 'NORMAL').toLowerCase()}">${header.PRIORIDADE || 'NORMAL'}</span></div>
                <div><strong>Status:</strong> <span class="status-badge status-${(header.STATUS || 'PENDENTE').toLowerCase()}">${header.STATUS || 'PENDENTE'}</span></div>
            </div>`;
    }

    function renderItems(items, idReq) {
        itemsContainer.innerHTML = '';
        const table = document.createElement('table');
        const statusOptions = ['Pendente', 'Em separação', 'Separado', 'Aguarda coleta', 'Finalizado'];

        const tableRowsHTML = items.map(item => {
            const statusLimpo = item.STATUS_ITEM ? item.STATUS_ITEM.trim() : 'Pendente';
            const optionsHTML = statusOptions.map(opt => `<option value="${opt}" ${statusLimpo === opt ? 'selected' : ''}>${opt}</option>`).join('');
            return `
                <tr>
                    <td>${item.ID_REQ_ITEM}</td>
                    <td>${item.CODIGO}</td>
                    <td>${item.DESCRICAO || 'N/A'}</td>
                    <td>${item.QNT_REQ}</td>
                    <td>${item.QNT_PAGA}</td>
                    <td>${item.SALDO}</td>
                    <td><span class="status-badge status-${(statusLimpo || 'pendente').replace(/\s/g, '-').toLowerCase()}">${statusLimpo}</span></td>
                    <td>
                        <div class="acoes-container">
                            <select class="status-select" 
                                    data-id-req-item="${item.ID_REQ_ITEM}" 
                                    data-id-req="${idReq}"
                                    data-original-status="${statusLimpo}"
                                    ${statusLimpo === 'Finalizado' ? 'disabled' : ''}>
                                ${optionsHTML}
                            </select>
                            <button class="btn-log" data-id-req-item="${item.ID_REQ_ITEM}" title="Ver Histórico">
                                <i class="fa-solid fa-history"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Item</th><th>Código</th><th>Descrição</th><th>QNT REQ</th><th>QNT PAGA</th><th>Saldo</th><th>Status</th><th>Ações</th>
                </tr>
            </thead>
            <tbody>${tableRowsHTML}</tbody>`;
        itemsContainer.appendChild(table);
    }

    // --- FUNÇÃO PRINCIPAL PARA CARREGAR DADOS ---
    async function carregarDetalhes() {
        try {
            headerContainer.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
            itemsContainer.innerHTML = '';
            const response = await fetch(`/api/requisicao?id=${idReq}`);
            const responseData = await response.json();
            if (!response.ok) { throw new Error(responseData.message || 'Falha ao buscar detalhes da requisição.'); }
            renderHeader(responseData.header);
            renderItems(responseData.items, idReq);
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error);
            headerContainer.innerHTML = `<p class='error-message'>${error.message}</p>`;
        }
    }

    // --- GERENCIADORES DE EVENTOS ---
    itemsContainer.addEventListener('click', async function(event) {
        const btnLog = event.target.closest('.btn-log');

        if (btnLog) {
            const idReqItem = btnLog.dataset.idReqItem;
            logContent.innerHTML = '<div class="loader"></div>';
            logModal.style.display = 'block';

            try {
                // ALTERAÇÃO AQUI
            const response = await fetch(`/api/requisicao?idReqItemLog=${idReqItem}`);
                const logData = await response.json();
                if (!response.ok) throw new Error(logData.message || 'Erro ao buscar histórico.');

                if (logData.length === 0) {
                    logContent.innerHTML = '<p class="info-message">Nenhum histórico de alteração para este item.</p>';
                    return;
                }

                let logHTML = '';
                logData.forEach(entry => {
                    logHTML += `
                        <div class="log-entry">
                            <p>Status alterado de <strong>${entry.STATUS_ANTERIOR || 'N/A'}</strong> para <strong>${entry.STATUS_NOVO}</strong></p>
                            <p class="log-meta">Por: <strong>${entry.RESPONSAVEL}</strong> em ${formatarData(entry.DT_ALTERACAO)} às ${entry.HR_ALTERACAO_FORMATADA}</p>
                        </div>
                    `;
                });
                logContent.innerHTML = logHTML;

            } catch(error) {
                logContent.innerHTML = `<p class="error-message">${error.message}</p>`;
            }
        }
    });

    itemsContainer.addEventListener('change', async function(event) {
        const select = event.target;
        if (!select.classList.contains('status-select')) return;

        const { idReqItem, idReq, originalStatus } = select.dataset;
        const novoStatus = select.value;
        const usuario = localStorage.getItem('userName');

        if (!usuario) { return alert('Erro: Usuário não identificado.'); }

        if (confirm(`Tem certeza que deseja alterar o status de "${originalStatus}" para "${novoStatus}"?`)) {
            try {
                select.disabled = true;
                // ALTERAÇÃO AQUI
            const response = await fetch('/api/requisicao', {
                method: 'PUT', // Mudamos para PUT
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'updateStatus', // Novo parâmetro
                    idReqItem, 
                    idReq, 
                    novoStatus, 
                    statusAntigo: originalStatus, 
                    usuario 
                })
            });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                carregarDetalhes(); 
            } catch (error) {
                console.error('Erro ao mudar status:', error);
                alert(`Falha ao mudar o status: ${error.message}`);
                select.value = originalStatus; 
                select.disabled = false;
            }
        } else {
            select.value = originalStatus;
        }
    });

    // --- Lógica para fechar os modais (atualizada para funcionar com múltiplos modais) ---
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modalId;
            if(modalId) {
                document.getElementById(modalId).style.display = 'none';
            } else {
                // Fallback para modais antigos
                btn.closest('.modal').style.display = 'none';
            }
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    carregarDetalhes();
});