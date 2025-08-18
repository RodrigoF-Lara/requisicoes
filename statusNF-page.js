document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('status-container');
    let allData = []; // Armazena todos os dados para filtrar no lado do cliente

    // --- Elementos do Modal ---
    const modal = document.getElementById('updateModal');
    const closeBtn = document.querySelector('.close-btn');
    const updateForm = document.getElementById('updateForm');
    const modalStatus = document.getElementById('modalStatus');

    // --- Inputs de Filtro ---
    const filters = {
        nf: document.getElementById('filterNF'),
        codigo: document.getElementById('filterCodigo'),
        usuario: document.getElementById('filterUsuario'),
        data: document.getElementById('filterData'),
        processo: document.getElementById('filterProcesso')
    };

    // --- Funções ---

    // Busca os dados da API e renderiza a tabela inicial
    async function fetchDataAndRender() {
        try {
            container.innerHTML = `<div class="loader-container"><div class="loader"></div><p>Buscando dados...</p></div>`;
            const response = await fetch("/api/statusNF");
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao buscar dados.');
            }
            allData = await response.json();
            renderTable(allData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            container.innerHTML = `<p class="error-message">Não foi possível carregar os dados. Tente novamente mais tarde.</p>`;
        }
    }

    // Renderiza a tabela com os dados fornecidos
    function renderTable(data) {
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<p class="info-message">Nenhum registro encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'consulta-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>NF</th>
                    <th>Código</th>
                    <th>Usuário</th>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Último Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="statusTableBody"></tbody>
        `;
        const tbody = table.querySelector('tbody');
        data.forEach(item => {
            const dataFormatada = new Date(item.DT).toLocaleDateString('pt-BR');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.NF}</td>
                <td>${item.CODIGO}</td>
                <td>${item.USUARIO}</td>
                <td>${dataFormatada}</td>
                <td>${item.HH}</td>
                <td>${item.PROCESSO}</td>
                <td>
                    <button class="btn-detalhes" data-nf="${item.NF}" data-codigo="${item.CODIGO}">
                        <i class="fa-solid fa-pen-to-square"></i> Alterar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        container.appendChild(table);
    }

    // Aplica os filtros na tabela
    function applyFilters() {
        const filterValues = {
            nf: filters.nf.value.toLowerCase(),
            codigo: filters.codigo.value.toLowerCase(),
            usuario: filters.usuario.value.toLowerCase(),
            data: filters.data.value, // Formato YYYY-MM-DD
            processo: filters.processo.value.toLowerCase()
        };

        const filteredData = allData.filter(item => {
            const itemDate = new Date(item.DT).toISOString().split('T')[0];
            return (
                item.NF.toLowerCase().includes(filterValues.nf) &&
                item.CODIGO.toLowerCase().includes(filterValues.codigo) &&
                item.USUARIO.toLowerCase().includes(filterValues.usuario) &&
                (filterValues.data === '' || itemDate === filterValues.data) &&
                item.PROCESSO.toLowerCase().includes(filterValues.processo)
            );
        });
        renderTable(filteredData);
    }

    // Abre o modal de atualização
    function openModal(nf, codigo) {
        document.getElementById('modalNF').textContent = nf;
        document.getElementById('modalCodigo').textContent = codigo;
        updateForm.dataset.nf = nf;
        updateForm.dataset.codigo = codigo;
        modalStatus.textContent = '';
        updateForm.reset();
        modal.style.display = 'block';
    }

    // Fecha o modal
    function closeModal() {
        modal.style.display = 'none';
    }

    // Lida com o envio do formulário de atualização
    async function handleUpdateSubmit(e) {
        e.preventDefault();
        const nf = updateForm.dataset.nf;
        const codigo = updateForm.dataset.codigo;
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
            if (!response.ok) {
                throw new Error(result.message || 'Erro ao salvar.');
            }

            modalStatus.textContent = result.message;
            modalStatus.style.color = "green";
            fetchDataAndRender(); // Recarrega os dados da tabela
            setTimeout(closeModal, 1500); // Fecha o modal após sucesso

        } catch (error) {
            modalStatus.textContent = `Erro: ${error.message}`;
            modalStatus.style.color = "#c00";
        }
    }

    // --- Event Listeners ---

    // Adiciona listeners aos inputs de filtro
    Object.values(filters).forEach(input => {
        input.addEventListener('keyup', applyFilters);
        input.addEventListener('change', applyFilters); // Para o input de data
    });

    // Listener para abrir o modal
    container.addEventListener('click', function(e) {
        if (e.target && e.target.closest('.btn-detalhes')) {
            const button = e.target.closest('.btn-detalhes');
            const { nf, codigo } = button.dataset;
            openModal(nf, codigo);
        }
    });
    
    // Listeners do modal
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(e) {
        if (e.target == modal) {
            closeModal();
        }
    });
    updateForm.addEventListener('submit', handleUpdateSubmit);

    // --- Carga Inicial ---
    fetchDataAndRender();
});