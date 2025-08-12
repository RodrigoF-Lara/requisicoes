document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('requisicoes-container');

    async function carregarRequisicoes() {
        try {
            const response = await fetch("https://requisicoes-five.vercel.app/api/requisicoes");
            if (!response.ok) {
                throw new Error('Falha ao buscar dados.');
            }
            const requisicoes = await response.json();

            // Limpa o container (remove o loader)
            container.innerHTML = ''; 

            if (requisicoes.length === 0) {
                container.innerHTML = '<p class="info-message">Nenhuma requisição encontrada.</p>';
                return;
            }

            // Cria a tabela e o cabeçalho
            const table = document.createElement('table');
            table.className = 'consulta-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID da Requisição</th>
                        <th>Data</th>
                        <th>Nº de Itens</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');

            // Preenche a tabela com os dados
            requisicoes.forEach(req => {
                // Formata a data para o padrão brasileiro
                const dataFormatada = new Date(req.DATA_REQ).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${req.ID_REQ}</td>
                    <td>${dataFormatada}</td>
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
            console.error(error);
            container.innerHTML = '<p class="error-message">Não foi possível carregar as requisições. Tente novamente mais tarde.</p>';
        }
    }

    carregarRequisicoes();
});

// Função placeholder para o botão "Detalhes"
function verDetalhes(idReq) {
    alert(`Funcionalidade "Ver Detalhes" para a Requisição ${idReq} ainda não implementada.`);
    // Futuramente, isso pode redirecionar para uma página de detalhes:
    // window.location.href = `detalhes.html?id=${idReq}`;
}