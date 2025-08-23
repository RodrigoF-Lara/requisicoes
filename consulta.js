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
                ${listaDeRequisicoes.map(req => {
                    // Padroniza os dados para exibição
                    const prioridade = (req.PRIORIDADE || 'NORMAL').trim();
                    let status = (req.STATUS || 'Pendente').trim();
                    if (status.toUpperCase() === 'CONCLUIDO') status = 'Concluído';
                    if (status === '') status = 'Pendente';

                    return `
                    <tr>
                        <td>${req.ID_REQ}</td>
                        <td>${formatarData(req.DT_REQUISICAO)}</td>
                        <td>${req.SOLICITANTE || 'N/A'}</td>
                        <td><span class="prioridade-badge prioridade-${prioridade.toLowerCase()}">${prioridade}</span></td>
                        <td><span class="status-badge status-${status.replace(/\s/g, '-').toLowerCase()}">${status}</span></td>
                        <td>${req.TOTAL_ITENS}</td>
                        <td>
                            <button class="btn-detalhes" data-id="${req.ID_REQ}">
                                <i class="fa-solid fa-circle-info"></i> Detalhes
                            </button>
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        `;
        container.appendChild(table);
    }

    function atualizarSumario(listaDeRequisicoes) {
        let pendentes = 0;
        let concluidas = 0;

        listaDeRequisicoes.forEach(r => {
            const status = (r.STATUS || 'Pendente').trim().toUpperCase();
            if (status === 'PENDENTE') {
                pendentes++;
            } else if (status === 'CONCLUIDO' || status === 'CONCLUÍDO') {
                concluidas++;
            }
        });
        
        const total = listaDeRequisicoes.length;
        const emAndamento = total - pendentes - concluidas;

        summaryContainer.innerHTML = `
            <div class="summary-card"><h3>Total</h3><p>${total}</p></div>
            <div class="summary-card"><h3>Pendentes</h3><p>${pendentes}</p></div>
            <div class="summary-card"><h3>Em Andamento</h3><p>${emAndamento}</p></div>
            <div class="summary-card"><h3>Concluídas</h3><p>${concluidas}</p></div>
        `;
    }

    // --- FUNÇÃO DE FILTRO CORRIGIDA E MAIS ROBUSTA ---
    function popularFiltroStatus(listaDeRequisicoes) {
        const statuses = [...new Set(listaDeRequisicoes.map(r => {
            let status = (r.STATUS || 'Pendente').trim();
            if (status === '') return 'Pendente'; // Trata strings vazias
            if (status.toUpperCase() === 'CONCLUIDO') return 'Concluído'; // Padroniza
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
        const statusFiltro = filterStatus.value;
        const prioridade = filterPrioridade.value;

        const requisicoesFiltradas = todasRequisicoes.filter(req => {
            const matchSolicitante = (req.SOLICITANTE || '').toLowerCase().includes(solicitante);
            const matchPrioridade = !prioridade || (req.PRIORIDADE || 'NORMAL') === prioridade;

            // Lógica de filtro de status mais robusta
            let statusOriginal = (req.STATUS || 'Pendente').trim();
            if (statusOriginal === '') statusOriginal = 'Pendente';
            if (statusOriginal.toUpperCase() === 'CONCLUIDO') statusOriginal = 'Concluído';
            
            const matchStatus = !statusFiltro || statusOriginal === statusFiltro;
            
            return matchSolicitante && matchPrioridade && matchStatus;
        });

        renderRequisicoes(requisicoesFiltradas);
    }
    
    async function carregarDadosIniciais() {
        try {
            container.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Buscando requisições...</p></div>';
            const response = await fetch("/api/requisicao"); 
            if (!response.ok) throw new Error('Falha ao buscar dados do servidor.');
            
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
            window.location.href = `detalhes.html?id=${detalhesButton.dataset.id}`;
        }
    });

    carregarDadosIniciais();
});