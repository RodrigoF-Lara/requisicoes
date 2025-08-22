document.addEventListener('DOMContentLoaded', async function() {
    // --- ELEMENTOS GLOBAIS ---
    const headerContainer = document.getElementById('detalhe-header-container');
    const itemsContainer = document.getElementById('detalhe-itens-container');
    const urlParams = new URLSearchParams(window.location.search);
    const idReq = urlParams.get('id');

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
        const dataRequisicao = formatarData(header.DT_REQUISICOES); // Corrigido de DT_REQUISICAO para DT_REQUISICOES se for o caso no seu DB
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

    // FUNÇÃO RENDERITEMS COM A CORREÇÃO
    function renderItems(items, idReq) {
        itemsContainer.innerHTML = '';
        const table = document.createElement('table');
        const statusOptions = ['Pendente', 'Em separação', 'Separado', 'Aguarda coleta', 'Finalizado'];

        const tableRowsHTML = items.map(item => {
            const statusLimpo = item.STATUS_ITEM ? item.STATUS_ITEM.trim() : 'Pendente';
            
            const optionsHTML = statusOptions.map(opt => 
                `<option value="${opt}" ${statusLimpo === opt ? 'selected' : ''}>${opt}</option>`
            ).join('');

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
                        <select class="status-select" 
                                data-id-req-item="${item.ID_REQ_ITEM}" 
                                data-id-req="${idReq}"
                                data-original-status="${statusLimpo}" ${statusLimpo === 'Finalizado' ? 'disabled' : ''}>
                            ${optionsHTML}
                        </select>
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
            const response = await fetch(`/api/detalhes?id=${idReq}`);
            const responseData = await response.json();
            if (!response.ok) { throw new Error(responseData.message || 'Falha ao buscar detalhes da requisição.'); }
            renderHeader(responseData.header);
            renderItems(responseData.items, idReq);
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error);
            headerContainer.innerHTML = `<p class='error-message'>${error.message}</p>`;
        }
    }

    // --- GERENCIADOR DE EVENTOS CORRIGIDO ---
    itemsContainer.addEventListener('change', async function(event) {
        const select = event.target;
        if (!select.classList.contains('status-select')) return;

        const idReqItem = select.dataset.idReqItem;
        const idReq = select.dataset.idReq;
        const novoStatus = select.value;
        const usuario = localStorage.getItem('userName');
        
        // CORREÇÃO APLICADA AQUI: Busca o status original de forma segura
        const statusAntigo = select.dataset.originalStatus;

        if (!usuario) { return alert('Erro: Usuário não identificado.'); }

        if (confirm(`Tem certeza que deseja alterar o status para "${novoStatus}"?`)) {
            try {
                select.disabled = true;
                const response = await fetch('/api/atualizarStatusItem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idReqItem, idReq, novoStatus, usuario })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                carregarDetalhes(); // Recarrega para mostrar as atualizações
            } catch (error) {
                console.error('Erro ao mudar status:', error);
                alert(`Falha ao mudar o status: ${error.message}`);
                select.value = statusAntigo; 
                select.disabled = false;
            }
        } else {
            select.value = statusAntigo; // Usuário cancelou, reverte a seleção
        }
    });

    carregarDetalhes();
});