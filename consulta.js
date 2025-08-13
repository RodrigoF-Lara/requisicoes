document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('requisicoes-container');

    async function carregarRequisicoes() {
        try {
            // Apontando para /api/consulta
            const response = await fetch("/api/consulta"); 
            
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
                tr.innerHTML = `
                    <td>${req.ID_REQ}</td>
                    <td>${dataFormatada}</td>
                    <td>${req.SOLICITANTE || 'N/A'}</td>
                    <td><span class="status-tag prioridade-${(req.PRIORIDADE || 'normal').toLowerCase()}">${req.PRIORIDADE || 'Normal'}</span></td>
                    <td><span class="status-tag status-${(req.STATUS || 'pendente').toLowerCase()}">${req.STATUS || 'Pendente'}</span></td>
                    <td>${req.TOTAL_ITENS}</td>
                    <td>
                        <button class="btn-detalhes" onclick="verDetalhes(${req.ID_REQ})">
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
    alert(`Funcionalidade "Ver Detalhes" para a Requisição ${idReq} ainda não implementada.`);
}