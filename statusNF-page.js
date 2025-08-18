document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('status-container');
    const summaryContainer = document.getElementById('summary-container'); // NOVO
    let allData = [];

    // --- Elementos de Filtro e Modais (sem alteração) ---
    // ...

    // NOVO: Função para renderizar os totalizadores
    function renderSummary(data) {
        // Calcula a contagem de cada status
        const statusCounts = data.reduce((acc, item) => {
            const status = item.PROCESSO || 'Indefinido';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        summaryContainer.innerHTML = ''; // Limpa o container

        // Cria um card para cada status
        for (const status in statusCounts) {
            const count = statusCounts[status];
            // Cria uma classe CSS amigável a partir do nome do status
            const statusClass = 'status-' + status.toLowerCase()
                .replace(/\s+/g, '-') // substitui espaços por hífens
                .replace(/[^\w-]+/g, ''); // remove caracteres não alfanuméricos

            const card = document.createElement('div');
            card.className = `summary-card ${statusClass}`;
            card.innerHTML = `
                <h3>${status}</h3>
                <p>${count}</p>
            `;
            summaryContainer.appendChild(card);
        }
    }

    // Busca os dados da API e renderiza a tabela e o resumo
    async function fetchDataAndRender() {
        try {
            container.innerHTML = `<div class="loader-container">...</div>`;
            const response = await fetch("/api/statusNF");
            if (!response.ok) throw new Error((await response.json()).message || 'Falha ao buscar dados.');
            
            allData = await response.json();
            populateStatusFilter(allData);
            renderTable(allData);
            renderSummary(allData); // ATUALIZADO: Renderiza o resumo com todos os dados
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            container.innerHTML = `<p class="error-message">Não foi possível carregar os dados.</p>`;
            summaryContainer.innerHTML = ''; // Limpa o resumo em caso de erro
        }
    }

    // Renderiza a tabela (sem alteração na lógica interna)
    function renderTable(data) {
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<p class="info-message">Nenhum registro encontrado.</p>';
            return;
        }
        // ... (todo o código para criar a tabela continua o mesmo)
    }

    // Aplica os filtros e atualiza a tabela E o resumo
    function applyFilters() {
        // ... (lógica de filtragem continua a mesma)
        
        const filteredData = allData.filter(item => {
            // ... (condições do filtro)
        });

        renderTable(filteredData);
        renderSummary(filteredData); // ATUALIZADO: Renderiza o resumo com os dados filtrados
    }
    
    // ... (restante do seu código JavaScript, como funções de modal, listeners, etc., continua igual)

    // --- Carga Inicial ---
    fetchDataAndRender();
});