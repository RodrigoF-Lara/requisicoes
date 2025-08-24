document.addEventListener('DOMContentLoaded', async function() {
    // --- ELEMENTOS GLOBAIS ---
    const headerContainer = document.getElementById('detalhe-header-container');
    const itemsContainer = document.getElementById('detalhe-itens-container');
    const urlParams = new URLSearchParams(window.location.search);
    const idReq = urlParams.get('id');

    // Elementos de Ações em Massa
    const bulkActionsContainer = document.getElementById('bulk-actions-container');
    const bulkCounter = document.getElementById('bulk-counter');
    const bulkStatusSelect = document.getElementById('bulk-status-select');
    const bulkApplyBtn = document.getElementById('bulk-apply-btn');
    
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
        const dataRequisicao = formatarData(header.DT_REQUISICAO);
        const dataNecessidade = formatarData(header.DT_NECESSIDADE);
        const prioridade = (header.PRIORIDADE || 'NORMAL').trim();
        headerContainer.innerHTML = `<div class="detalhe-header"><div><strong>Nº Requisição:</strong> ${header.ID_REQ}</div><div><strong>Solicitante:</strong> ${header.SOLICITANTE || 'N/A'}</div><div><strong>Data Requisição:</strong> ${dataRequisicao}</div><div><strong>Data Necessidade:</strong> ${dataNecessidade}</div><div><strong>Prioridade:</strong> <span class="prioridade-badge prioridade-${prioridade.toLowerCase()}">${prioridade}</span></div><div><strong>Status:</strong> <span class="status-badge status-${(header.STATUS || 'PENDENTE').replace(/\s/g, '-').toLowerCase()}">${header.STATUS || 'PENDENTE'}</span></div></div>`;
    }

    function renderItems(items, idReq) {
        itemsContainer.innerHTML = '';
        const table = document.createElement('table');
        const statusOptions = ['Pendente', 'Em separação', 'Separado', 'Aguarda coleta', 'Finalizado'];

        const tableRowsHTML = items.map(item => {
            const statusLimpo = (item.STATUS_ITEM || 'Pendente').trim();
            const optionsHTML = statusOptions.map(opt => `<option value="${opt}" ${statusLimpo === opt ? 'selected' : ''}>${opt}</option>`).join('');
            const descricao = item.DESCRICAO_PRODUTO || 'Descrição não encontrada';
            return `
                <tr>
                    <td><input type="checkbox" class="item-checkbox" data-id-req-item="${item.ID_REQ_ITEM}"></td>
                    <td>${item.ID_REQ_ITEM}</td>
                    <td>${item.CODIGO}</td>
                    <td>${descricao}</td>
                    <td>${item.QNT_REQ}</td>
                    <td>${item.QNT_PAGA}</td>
                    <td>${item.SALDO}</td>
                    <td><span class="status-badge status-${statusLimpo.replace(/\s/g, '-').toLowerCase()}">${statusLimpo}</span></td>
                    <td>
                        <div class="acoes-container">
                            <select class="status-select" data-id-req-item="${item.ID_REQ_ITEM}" data-original-status="${statusLimpo}" ${statusLimpo === 'Finalizado' ? 'disabled' : ''}>${optionsHTML}</select>
                            <button class="btn-log" data-id-req-item="${item.ID_REQ_ITEM}" title="Ver Histórico"><i class="fa-solid fa-history"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        table.innerHTML = `
            <thead>
                <tr>
                    <th><input type="checkbox" id="select-all-checkbox"></th>
                    <th>Item</th><th>Código</th><th>Descrição</th><th>QNT REQ</th><th>QNT PAGA</th><th>Saldo</th><th>Status</th><th>Ações</th>
                </tr>
            </thead>
            <tbody>${tableRowsHTML}</tbody>`;
        itemsContainer.appendChild(table);
    }

    // --- FUNÇÕES DE LÓGICA ---
    function updateBulkActionBar() {
        const selectedCheckboxes = itemsContainer.querySelectorAll('.item-checkbox:checked');
        const count = selectedCheckboxes.length;
        if (count > 0) {
            bulkActionsContainer.style.display = 'flex';
            bulkCounter.textContent = `${count} item(s) selecionado(s)`;
        } else {
            bulkActionsContainer.style.display = 'none';
        }
    }

    async function carregarDetalhes() {
        try {
            headerContainer.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
            itemsContainer.innerHTML = '';
            const response = await fetch(`/api/requisicao?id=${idReq}`);
            const responseData = await response.json();
            if (!response.ok) { throw new Error(responseData.message); }
            renderHeader(responseData.header);
            renderItems(responseData.items, idReq);
            updateBulkActionBar(); // Garante que a barra esteja escondida ao recarregar
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error);
            headerContainer.innerHTML = `<p class='error-message'>${error.message}</p>`;
        }
    }

    // --- GERENCIADORES DE EVENTOS ---
    itemsContainer.addEventListener('change', async function(event) {
        const target = event.target;
        // Lógica para mudança de status individual
        if (target.classList.contains('status-select')) {
            const { idReqItem, originalStatus } = target.dataset;
            const novoStatus = target.value;
            const usuario = localStorage.getItem('userName');
            if (confirm(`Alterar status de "${originalStatus}" para "${novoStatus}"?`)) {
                try {
                    target.disabled = true;
                    const response = await fetch('/api/requisicao', {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'updateStatus', idReqItem, idReq, novoStatus, statusAntigo: originalStatus, usuario })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    await carregarDetalhes();
                } catch (error) {
                    alert(`Falha: ${error.message}`);
                    target.value = originalStatus;
                    target.disabled = false;
                }
            } else {
                target.value = originalStatus;
            }
        }
        // Lógica para checkboxes
        if (target.id === 'select-all-checkbox') {
            const allCheckboxes = itemsContainer.querySelectorAll('.item-checkbox');
            allCheckboxes.forEach(checkbox => checkbox.checked = target.checked);
            updateBulkActionBar();
        }
        if (target.classList.contains('item-checkbox')) {
            updateBulkActionBar();
        }
    });

    bulkApplyBtn.addEventListener('click', async () => {
        const selectedCheckboxes = itemsContainer.querySelectorAll('.item-checkbox:checked');
        const itemIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.idReqItem);
        const novoStatus = bulkStatusSelect.value;
        const usuario = localStorage.getItem('userName');

        if (itemIds.length === 0) return alert('Nenhum item selecionado.');
        if (!novoStatus) return alert('Por favor, selecione um status para aplicar.');
        if (!usuario) return alert('Usuário não identificado.');

        if (confirm(`Tem certeza que deseja alterar ${itemIds.length} item(ns) para o status "${novoStatus}"?`)) {
            try {
                bulkApplyBtn.disabled = true;
                bulkApplyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Aplicando...';
                
                const response = await fetch('/api/requisicao', {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'bulkUpdateStatus', itemIds, idReq, novoStatus, usuario })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                alert(result.message);
                await carregarDetalhes();

            } catch (error) {
                alert(`Falha na atualização em massa: ${error.message}`);
            } finally {
                bulkApplyBtn.disabled = false;
                bulkApplyBtn.textContent = 'Aplicar';
                bulkStatusSelect.value = '';
            }
        }
    });

    // Lógica de modais (simplificada, já que o de atender foi removido)
    itemsContainer.addEventListener('click', async function(event) {
        const btnLog = event.target.closest('.btn-log');
        if (btnLog) { /* ... lógica do modal de log ... */ }
    });
    // ... restante dos listeners de modal ...

    carregarDetalhes();
});