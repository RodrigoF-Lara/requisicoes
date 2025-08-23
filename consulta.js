document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('requisicoes-container');
    const summaryContainer = document.getElementById('summary-container');
    const filterSolicitante = document.getElementById('filterSolicitante');
    const filterStatus = document.getElementById('filterStatus');
    const filterPrioridade = document.getElementById('filterPrioridade');
    
    let todasRequisicoes = []; // Guarda todos os dados do servidor para filtrar

    // --- FUNÇÕES ---

    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    function verDetalhes(idReq) {
        window.location.href = `detalhes.html?id=${idReq}`;
    }

    function renderRequisicoes(listaDeRequisicoes) {
        container.innerHTML = '';
        if (listaDeRequisicoes.length === 0) {
            container.innerHTML = '<p class="info-message">Nenhuma requisição encontrada com os filtros aplicados.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'consulta-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Data</th>
                    <th>Solicitante</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Nº de Itens</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${listaDeRequisicoes.map(req => `
                    <tr>
                        <td>${req.ID_REQ}</td>
                        <td>${formatarData(req.DT_REQUISICAO)}</td>
                        <td>${req.SOLICITANTE || 'N/A'}</td>
                        <td><span class="prioridade-badge prioridade-${(req.PRIORIDADE || 'NORMAL').toLowerCase()}">${req.PRIORIDADE || 'NORMAL'}</span></td>
                        <td><span class="status-badge status-${(req.STATUS || 'PENDENTE').replace(/\s/g, '-').toLowerCase()}">${req.STATUS || 'PENDENTE'}</span></td>
                        <td>${req.TOTAL_ITENS}</td>
                        <td>
                            <button class="btn-detalhes" data-id="${req.ID_REQ}">
                                <i class="fa-solid fa-circle-info"></i> Detalhes
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.appendChild(table);
    }

    function atualizarSumario(listaDeRequisicoes) {
        const total = listaDeRequisicoes.length;
        const pendentes = listaDeRequisicoes.filter(r => (r.STATUS || 'Pendente').trim().toUpperCase() === 'PENDENTE').length;
        const concluidas = listaDeRequisicoes.filter(r => (r.STATUS || '').trim().toUpperCase() === 'CONCLUIDO' || (r.STATUS || '').trim().toUpperCase() === 'CONCLUÍDO').length;
        const emAndamento = total - pendentes - concluidas;

        summaryContainer.innerHTML = `
            <div class="summary-card">
                <h3>Total de Requisições</h3>
                <p>${total}</p>
            </div>
            <div class="summary-card">
                <h3>Pendentes</h3>
                <p>${pendentes}</p>
            </div>
            <div class="summary-card">
                <h3>Em Andamento</h3>
                <p>${emAndamento}</p>
            </div>
            <div class="summary-card">
                <h3>Concluídas</h3>
                <p>${concluidas}</p>
            </div>
        `;
    }

    // --- FUNÇÃO CORRIGIDA ---
    function popularFiltroStatus(listaDeRequisicoes) {
        const statuses = [...new Set(listaDeRequisicoes.map(r => {
            let status = (r.STATUS || 'Pendente').trim();
            // Padroniza 'CONCLUIDO' (sem acento) para 'Concluído' (com acento)
            if (status.toUpperCase() === 'CONCLUIDO') {
                return 'Concluído';
            }
            return status;
        }))];
        
        filterStatus.innerHTML = '<option value="">Todos os Status</option>';
        statuses.sort().forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            filterStatus.appendChild(option);
        });
    }

    function aplicarFiltros() {
        const solicitante = filterSolicitante.value.toLowerCase();
        let status = filterStatus.value;
        const prioridade = filterPrioridade.value;

        // Padroniza o valor do filtro para a busca
        if (status === 'Concluído') {
            status = 'CONCLUIDO'; // Para buscar no array original
        }

        const requisicoesFiltradas = todasRequisicoes.filter(req => {
            const matchSolicitante = (req.SOLICITANTE || '').toLowerCase().includes(solicitante);
            
            let originalStatus = (req.STATUS || 'Pendente').trim().toUpperCase();
            const matchStatus = !filterStatus.value || originalStatus === status.toUpperCase() || (filterStatus.value === 'Concluído' && originalStatus === 'CONCLUÍDO');

            const matchPrioridade = !prioridade || (req.PRIORIDADE || 'NORMAL') === prioridade;
            return matchSolicitante && matchStatus && matchPrioridade;
        });

        renderRequisicoes(requisicoesFiltradas);
    }
    
    async function carregarDadosIniciais() {
        try {
            container.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Buscando requisições...</p></div>';
            const response = await fetch("/api/requisicao"); 
            if (!response.ok) {
                throw new Error('Falha ao buscar dados do servidor.');
            }
            todasRequisicoes = await response.json();
            
            renderRequisicoes(todasRequisicoes);
            atualizarSumario(todasRequisicoes);
            popularFiltroStatus(todasRequisicoes);

        } catch (error) {
            console.error("Erro ao carregar requisições:", error);
            container.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    // --- EVENT LISTENERS ---
    filterSolicitante.addEventListener('keyup', aplicarFiltros);
    filterStatus.addEventListener('change', aplicarFiltros);
    filterPrioridade.addEventListener('change', aplicarFiltros);

    container.addEventListener('click', function(event) {
        const detalhesButton = event.target.closest('.btn-detalhes');
        if(detalhesButton) {
            verDetalhes(detalhesButton.dataset.id);
        }
    });

    // --- INICIA A PÁGINA ---
    carregarDadosIniciais();
});