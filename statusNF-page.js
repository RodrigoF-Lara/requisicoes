document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('status-container');
    let allData = []; // Armazena todos os dados para filtrar

    // --- Elementos do Modal de Update ---
    const updateModal = document.getElementById('updateModal');
    const updateForm = document.getElementById('updateForm');
    const modalStatus = document.getElementById('modalStatus');

    // --- Elementos do Modal de Log ---
    const logModal = document.getElementById('logModal');
    const logContent = document.getElementById('logContent');

    // --- Inputs de Filtro ---
    const filters = {
        nf: document.getElementById('filterNF'),
        codigo: document.getElementById('filterCodigo'),
        usuario: document.getElementById('filterUsuario'),
        data: document.getElementById('filterData'),
        processo: document.getElementById('filterProcesso')
    };

    // --- Funções ---

    // Popula o filtro de status com valores únicos
    function populateStatusFilter(data) {
        const uniqueStatuses = [...new Set(data.map(item => item.PROCESSO))];
        filters.processo.innerHTML = '<option value="">Todos os Status</option>'; // Limpa e adiciona a opção padrão
        uniqueStatuses.sort().forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            filters.processo.appendChild(option);
        });
    }

    // Busca os dados da API e renderiza a tabela inicial
    async function fetchDataAndRender() {
        try {
            container.innerHTML = `<div class="loader-container"><div class="loader"></div><p>Buscando dados...</p></div>`;
            const response = await fetch("/api/statusNF");
            if (!response.ok) throw new Error((await response.json()).message || 'Falha ao buscar dados.');
            
            allData = await response.json();
            populateStatusFilter(allData); // Popula o filtro
            renderTable(allData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            container.innerHTML = `<p class="error-message">Não foi possível carregar os dados: ${error.message}</p>`;
        }
    }

    // Renderiza a tabela
    function renderTable(data) {
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<p class="info-message">Nenhum registro encontrado com os filtros aplicados.</p>';
            return;
        }
        const table = document.createElement('table');
        table.className = 'consulta-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>NF</th><th>Código</th><th>Usuário</th><th>Data</th><th>Hora</th><th>Último Status</th><th>Ações</th>
                </tr>
            </thead>
            <tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        data.forEach(item => {
            const dataFormatada = new Date(item.DT).toLocaleDateString('pt-BR');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.NF}</td><td>${item.CODIGO}</td><td>${item.USUARIO}</td>
                <td>${dataFormatada}</td><td>${item.HH}</td><td>${item.PROCESSO}</td>
                <td class="actions-cell">
                    <button class="btn-detalhes btn-update" data-nf="${item.NF}" data-codigo="${item.CODIGO}" title="Alterar Status">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-detalhes btn-log" data-nf="${item.NF}" data-codigo="${item.CODIGO}" title="Ver Histórico">
                        <i class="fa-solid fa-list-ul"></i>
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });
        container.appendChild(table);
    }

    // Aplica os filtros
    function applyFilters() {
        const filterValues = {
            nf: filters.nf.value.toLowerCase(),
            codigo: filters.codigo.value.toLowerCase(),
            usuario: filters.usuario.value.toLowerCase(),
            data: filters.data.value,
            processo: filters.processo.value
        };
        const filteredData = allData.filter(item => {
            const itemDate = new Date(item.DT).toISOString().split('T')[0];
            return (
                item.NF.toLowerCase().includes(filterValues.nf) &&
                item.CODIGO.toLowerCase().includes(filterValues.codigo) &&
                item.USUARIO.toLowerCase().includes(filterValues.usuario) &&
                (!filterValues.data || itemDate === filterValues.data) &&
                (!filterValues.processo || item.PROCESSO === filterValues.processo)
            );
        });
        renderTable(filteredData);
    }

    // Abre os modais
    function openModal(modalId, nf, codigo) {
        const modal = document.getElementById(modalId);
        if (modalId === 'updateModal') {
            document.getElementById('modalNF').textContent = nf;
            document.getElementById('modalCodigo').textContent = codigo;
            updateForm.dataset.nf = nf;
            updateForm.dataset.codigo = codigo;
            modalStatus.textContent = '';
            updateForm.reset();
        } else if (modalId === 'logModal') {
            document.getElementById('logModalNF').textContent = nf;
            document.getElementById('logModalCodigo').textContent = codigo;
            fetchAndDisplayLog(nf, codigo);
        }
        modal.style.display = 'block';
    }

    // Fecha os modais
    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Busca e exibe o log
    async function fetchAndDisplayLog(nf, codigo) {
        logContent.innerHTML = `<div class="loader"></div>`;
        try {
            const response = await fetch(`/api/logNF?nf=${nf}&codigo=${codigo}`);
            if (!response.ok) throw new Error((await response.json()).message || 'Falha ao buscar log.');
            const logData = await response.json();

            if (logData.length === 0) {
                logContent.innerHTML = '<p>Nenhum histórico encontrado para este item.</p>';
                return;
            }
            logContent.innerHTML = `
                <table id="logTable">
                    <thead><tr><th>Data</th><th>Hora</th><th>Usuário</th><th>Processo</th></tr></thead>
                    <tbody>
                        ${logData.map(entry => `
                            <tr>
                                <td>${new Date(entry.DT).toLocaleDateString('pt-BR')}</td>
                                <td>${entry.HH}</td>
                                <td>${entry.USUARIO}</td>
                                <td>${entry.PROCESSO}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        } catch (error) {
            logContent.innerHTML = `<p class="error-message">Erro ao carregar histórico: ${error.message}</p>`;
        }
    }

    // Lida com o envio do formulário de atualização
    async function handleUpdateSubmit(e) {
        e.preventDefault();
        const { nf, codigo } = updateForm.dataset;
        const processo = document.getElementById('novoProcesso').value;
        const usuario = localStorage.getItem('userName');
        if (!processo) {
            modalStatus.textContent = "Selecione um processo.";
            modalStatus.style.color = "#c00";
            return;
        }
        modalStatus.textContent = "Salvando...";
        modalStatus.style.color = "#222";
        try {
            const response = await fetch('/api/atualizarStatusNF', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nf, codigo, processo, usuario })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Erro ao salvar.');
            modalStatus.textContent = result.message;
            modalStatus.style.color = "green";
            fetchDataAndRender(); // Recarrega os dados
            setTimeout(() => closeModal('updateModal'), 1500);
        } catch (error) {
            modalStatus.textContent = `Erro: ${error.message}`;
            modalStatus.style.color = "#c00";
        }
    }

    // --- Event Listeners ---
    Object.values(filters).forEach(input => {
        input.addEventListener('keyup', applyFilters);
        input.addEventListener('change', applyFilters);
    });

    container.addEventListener('click', function(e) {
        const updateBtn = e.target.closest('.btn-update');
        const logBtn = e.target.closest('.btn-log');
        if (updateBtn) {
            const { nf, codigo } = updateBtn.dataset;
            openModal('updateModal', nf, codigo);
        } else if (logBtn) {
            const { nf, codigo } = logBtn.dataset;
            openModal('logModal', nf, codigo);
        }
    });
    
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modalId));
    });

    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });

    updateForm.addEventListener('submit', handleUpdateSubmit);

    // --- Carga Inicial ---
    fetchDataAndRender();
});