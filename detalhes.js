document.addEventListener('DOMContentLoaded', async function() {
    // --- ELEMENTOS GLOBAIS ---
    const headerContainer = document.getElementById('detalhe-header-container');
    const itemsContainer = document.getElementById('detalhe-itens-container');
    const atenderModal = document.getElementById('atenderModal');
    const atenderForm = document.getElementById('atenderForm');
    const modalStatus = document.getElementById('modalStatus');

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
        const dataRequisicao = formatarData(header.DT_REQUISICAO);
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
        const tableRowsHTML = items.map(item => {
            const statusLimpo = item.STATUS_ITEM ? item.STATUS_ITEM.trim() : 'PENDENTE';
            return `
                <tr>
                    <td>${item.ID_REQ_ITEM}</td>
                    <td>${item.CODIGO}</td>
                    <td>${item.DESCRICAO || 'N/A'}</td>
                    <td>${item.QNT_REQ}</td>
                    <td>${item.QNT_PAGA}</td>
                    <td>${item.SALDO}</td>
                    <td><span class="status-badge status-${(statusLimpo || 'pendente').toLowerCase()}">${statusLimpo}</span></td>
                    <td>${statusLimpo !== 'PAGO' ? `<button class="btn-atender" data-id-req-item="${item.ID_REQ_ITEM}" data-id-req="${idReq}" data-codigo="${item.CODIGO}" data-qnt-req="${item.QNT_REQ}" data-saldo="${item.SALDO}"><i class="fa-solid fa-dolly"></i> Atender</button>` : '<span class="info-message">Concluído</span>'}</td>
                    <td>
                        <div class="acoes-container">
                            ${statusLimpo !== 'PAGO' ? `<button class="btn-acao btn-pagar" title="Marcar como Pago" data-id-req-item="${item.ID_REQ_ITEM}" data-id-req="${idReq}"><i class="fa-solid fa-check"></i> Pagar</button>` : ''}
                            ${statusLimpo === 'PAGO' ? `<button class="btn-acao btn-estornar" title="Marcar como Pendente" data-id-req-item="${item.ID_REQ_ITEM}" data-id-req="${idReq}"><i class="fa-solid fa-undo"></i> Estornar</button>` : ''}
                        </div>
                    </td>
                </tr>`;
        }).join('');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Item</th><th>Código</th><th>Descrição</th><th>QNT REQ</th><th>QNT PAGA</th><th>Saldo</th><th>Status</th><th>Atender Item</th><th>Ações</th>
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

    // --- GERENCIADORES DE EVENTOS (EVENT LISTENERS) ---
    itemsContainer.addEventListener('click', async function(event) {
        const btnAtender = event.target.closest('.btn-atender');
        const btnAcao = event.target.closest('.btn-acao');

        if (btnAtender) {
            const { idReqItem, idReq, codigo, qntReq, saldo } = btnAtender.dataset;
            document.getElementById('modalCodigo').textContent = codigo;
            document.getElementById('modalQntReq').textContent = qntReq;
            document.getElementById('modalSaldo').textContent = saldo;
            document.getElementById('quantidadeAtendida').value = saldo;
            document.getElementById('modalStatus').textContent = '';
            atenderForm.dataset.idReqItem = idReqItem;
            atenderForm.dataset.idReq = idReq;
            atenderModal.style.display = 'block';
        }

        if (btnAcao) {
            const { idReqItem, idReq } = btnAcao.dataset;
            const usuario = localStorage.getItem('userName');
            const novoStatus = btnAcao.classList.contains('btn-pagar') ? 'PAGO' : 'PENDENTE';
            const acao = novoStatus === 'PAGO' ? 'PAGO' : 'PENDENTE (ESTORNADO)';
            
            if (!usuario) { return alert('Erro: Usuário não identificado.'); }
            if (!confirm(`Tem certeza que deseja marcar este item como ${acao}?`)) { return; }

            try {
                btnAcao.disabled = true;
                btnAcao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                const response = await fetch('/api/atualizarStatusItem', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idReqItem, idReq, novoStatus, usuario })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                alert(result.message);
                carregarDetalhes();
            } catch (error) {
                console.error('Erro ao mudar status:', error);
                alert(`Falha ao mudar o status: ${error.message}`);
                carregarDetalhes();
            }
        }
    });

    atenderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const { idReqItem, idReq } = this.dataset;
        const quantidadeAtendida = document.getElementById('quantidadeAtendida').value;
        const usuario = localStorage.getItem('userName');
        modalStatus.textContent = "Salvando...";

        try {
            const response = await fetch('/api/atenderRequisicao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idReqItem, idReq, quantidadeAtendida, usuario })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            modalStatus.style.color = 'green';
            modalStatus.textContent = result.message;
            setTimeout(() => {
                atenderModal.style.display = 'none';
                carregarDetalhes();
            }, 1000);
        } catch (error) {
            modalStatus.style.color = 'red';
            modalStatus.textContent = `Erro: ${error.message}`;
        }
    });

    document.querySelector('.close-btn').addEventListener('click', () => { atenderModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == atenderModal) { atenderModal.style.display = 'none'; } });

    carregarDetalhes();
});