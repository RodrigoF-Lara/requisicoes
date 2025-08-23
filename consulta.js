document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('requisicoes-container');

    async function carregarRequisicoes() {
        try {
            // ALTERAÇÃO AQUI: Apontando para o novo endpoint
            const response = await fetch("/api/requisicao"); 
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao buscar dados do servidor.');
            }
            const requisicoes = await response.json();
            container.innerHTML = ''; 

            if (requisicoes.length === 0) {
                container.innerHTML = '<p class="info-message">Nenhuma requisição encontrada.</p>';
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
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');

            requisicoes.forEach(req => {
                const dataFormatada = new Date(req.DT_REQUISICAO).toLocaleDateString('pt-BR');
                const tr = document.createElement('tr');
                // Substitua a linha tr.innerHTML = `...`; por esta:
                tr.innerHTML = `
                    <td>${req.ID_REQ}</td>
                    <td>${dataFormatada}</td>
                    <td>${req.SOLICITANTE || 'N/A'}</td>
                    <td><span class="prioridade-badge prioridade-${(req.PRIORIDADE || 'NORMAL').toUpperCase()}">${req.PRIORIDADE || 'NORMAL'}</span></td>
                    <td><span class="status-badge status-${(req.STATUS || 'PENDENTE').toUpperCase().replace(/\s/g, '-')}">${req.STATUS || 'PENDENTE'}</span></td>
                    <td>${req.TOTAL_ITENS}</td>
                    <td>
                        <button class="btn-detalhes" data-id="${req.ID_REQ}">
                            <i class="fa-solid fa-circle-info"></i> Detalhes
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            container.appendChild(table);

        } catch (error) {
            console.error("Erro no lado do cliente (consulta.js):", error);
            container.innerHTML = `<p class="error-message">Não foi possível carregar as requisições. Verifique o console (F12).</p>`;
        }
    }

    carregarRequisicoes();
});

function verDetalhes(idReq) {
    // Redireciona para a página de detalhes, passando o ID na URL
    window.location.href = `detalhes.html?id=${idReq}`;
}