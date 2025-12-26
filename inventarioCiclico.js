document.addEventListener('DOMContentLoaded', function() {
    const gerarListaBtn = document.getElementById('gerarListaBtn');
    const listaInventarioContainer = document.getElementById('listaInventarioContainer');
    const tabelaInventario = document.getElementById('tabelaInventario');
    const infoLista = document.getElementById('infoLista');
    const statusMessage = document.getElementById('statusMessage');

    gerarListaBtn.addEventListener('click', gerarNovaLista);

    async function gerarNovaLista() {
        try {
            statusMessage.style.color = '#222';
            statusMessage.textContent = 'Gerando lista de inventário...';
            gerarListaBtn.disabled = true;
            gerarListaBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';

            const response = await fetch('/api/inventarioCiclico?acao=gerarLista');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao gerar lista');
            }

            renderizarLista(data);
            statusMessage.style.color = 'green';
            statusMessage.textContent = 'Lista gerada com sucesso!';
            setTimeout(() => { statusMessage.textContent = ''; }, 3000);

        } catch (error) {
            console.error('Erro ao gerar lista:', error);
            statusMessage.style.color = '#c00';
            statusMessage.textContent = `Erro: ${error.message}`;
        } finally {
            gerarListaBtn.disabled = false;
            gerarListaBtn.innerHTML = '<i class="fa-solid fa-clipboard-list"></i> Gerar Nova Lista';
        }
    }

    function renderizarLista(data) {
        const { itens, dataGeracao } = data;

        if (!itens || itens.length === 0) {
            infoLista.innerHTML = '<p class="info-message">Nenhum item encontrado para inventário.</p>';
            listaInventarioContainer.style.display = 'block';
            return;
        }

        infoLista.innerHTML = `
            <p><strong>Data de Geração:</strong> ${formatarDataHora(dataGeracao)}</p>
            <p><strong>Total de Itens:</strong> ${itens.length}</p>
            <p><strong>Critério:</strong> Itens mais movimentados nos últimos 21 dias</p>
        `;

        const table = document.createElement('table');
        table.className = 'consulta-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>#</th>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Movimentações (7 dias)</th>
                    <th>Saldo Atual</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${itens.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.CODIGO}</td>
                        <td>${item.DESCRICAO || 'N/A'}</td>
                        <td><strong>${item.TOTAL_MOVIMENTACOES}</strong></td>
                        <td>${item.SALDO_ATUAL || 0}</td>
                        <td>
                            <button class="btn-detalhes" onclick="verDetalhes('${item.CODIGO}')">
                                <i class="fa-solid fa-eye"></i> Ver Detalhes
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        tabelaInventario.innerHTML = '';
        tabelaInventario.appendChild(table);
        listaInventarioContainer.style.display = 'block';
    }

    function formatarDataHora(dataString) {
        if (!dataString) return 'N/A';
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR');
    }

    // Função global para ver detalhes (pode ser expandida futuramente)
    window.verDetalhes = function(codigo) {
        window.location.href = `estoque.html?codigo=${codigo}`;
    };
});
