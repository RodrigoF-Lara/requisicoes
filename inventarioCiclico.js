document.addEventListener('DOMContentLoaded', function() {
    const gerarListaBtn = document.getElementById('gerarListaBtn');
    const carregarInventariosBtn = document.getElementById('carregarInventariosBtn');
    const salvarInventarioBtn = document.getElementById('salvarInventarioBtn');
    const finalizarInventarioBtn = document.getElementById('finalizarInventarioBtn');
    const listaInventarioContainer = document.getElementById('listaInventarioContainer');
    const listaInventariosSalvos = document.getElementById('listaInventariosSalvos');
    const tabelaInventario = document.getElementById('tabelaInventario');
    const infoLista = document.getElementById('infoLista');
    const tituloInventario = document.getElementById('tituloInventario');
    const statusMessage = document.getElementById('statusMessage');
    const acuracidadeModal = document.getElementById('acuracidadeModal');
    const acuracidadeContent = document.getElementById('acuracidadeContent');

    let inventarioAtual = null;

    gerarListaBtn.addEventListener('click', gerarNovaLista);
    carregarInventariosBtn.addEventListener('click', carregarInventariosSalvos);
    salvarInventarioBtn.addEventListener('click', salvarInventario);
    finalizarInventarioBtn.addEventListener('click', finalizarInventario);

    // Event listeners para fechar modal
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById(this.dataset.modal).style.display = 'none';
        });
    });

    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

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

            inventarioAtual = {
                id: null,
                status: 'NOVO',
                itens: data.itens,
                dataGeracao: data.dataGeracao,
                criterio: data.criterio,
                blocos: data.blocos
            };

            renderizarInventario(inventarioAtual);
            salvarInventarioBtn.style.display = 'inline-block';
            finalizarInventarioBtn.style.display = 'none';
            
            statusMessage.style.color = 'green';
            statusMessage.textContent = 'Lista gerada com sucesso! Salve o inventário para continuar depois.';
            setTimeout(() => { statusMessage.textContent = ''; }, 5000);

        } catch (error) {
            console.error('Erro ao gerar lista:', error);
            statusMessage.style.color = '#c00';
            statusMessage.textContent = `Erro: ${error.message}`;
        } finally {
            gerarListaBtn.disabled = false;
            gerarListaBtn.innerHTML = '<i class="fa-solid fa-clipboard-list"></i> Gerar Nova Lista';
        }
    }

    async function salvarInventario() {
        if (!inventarioAtual) {
            alert('Nenhum inventário para salvar.');
            return;
        }

        const usuario = localStorage.getItem('userName') || 'Sistema';

        try {
            statusMessage.style.color = '#222';
            statusMessage.textContent = 'Salvando inventário...';
            salvarInventarioBtn.disabled = true;

            const response = await fetch('/api/inventarioCiclico', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acao: 'salvar',
                    inventario: inventarioAtual,
                    usuario: usuario
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao salvar inventário');
            }

            inventarioAtual.id = data.idInventario;
            inventarioAtual.status = 'EM_ANDAMENTO';

            statusMessage.style.color = 'green';
            statusMessage.textContent = `Inventário #${data.idInventario} salvo com sucesso!`;
            setTimeout(() => { statusMessage.textContent = ''; }, 3000);

            renderizarInventario(inventarioAtual);
            salvarInventarioBtn.style.display = 'none';
            finalizarInventarioBtn.style.display = 'inline-block';

        } catch (error) {
            console.error('Erro ao salvar inventário:', error);
            statusMessage.style.color = '#c00';
            statusMessage.textContent = `Erro: ${error.message}`;
        } finally {
            salvarInventarioBtn.disabled = false;
        }
    }

    async function carregarInventariosSalvos() {
        try {
            listaInventariosSalvos.innerHTML = '<div class="loader"></div>';
            
            const response = await fetch('/api/inventarioCiclico?acao=listar');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao carregar inventários');
            }

            if (!data.inventarios || data.inventarios.length === 0) {
                listaInventariosSalvos.innerHTML = '<p class="info-message">Nenhum inventário salvo encontrado.</p>';
                return;
            }

            renderizarListaInventarios(data.inventarios);

        } catch (error) {
            console.error('Erro ao carregar inventários:', error);
            listaInventariosSalvos.innerHTML = `<p class="error-message">Erro: ${error.message}</p>`;
        }
    }

    function renderizarListaInventarios(inventarios) {
        const table = document.createElement('table');
        table.className = 'consulta-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Data Geração</th>
                    <th>Criado Por</th>
                    <th>Data Criação</th>
                    <th>Total Itens</th>
                    <th>Valor Total</th>
                    <th>Status</th>
                    <th>Acuracidade</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${inventarios.map(inv => `
                    <tr>
                        <td><strong>#${inv.ID_INVENTARIO}</strong></td>
                        <td>${formatarDataHora(inv.DT_GERACAO)}</td>
                        <td><strong>${inv.USUARIO_CRIACAO || 'Sistema'}</strong></td>
                        <td>${formatarDataHora(inv.DT_CRIACAO)}</td>
                        <td>${inv.TOTAL_ITENS}</td>
                        <td><strong>R$ ${(inv.VALOR_TOTAL_GERAL || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                        <td><span class="status-badge status-${inv.STATUS.toLowerCase()}">${inv.STATUS}</span></td>
                        <td>${inv.ACURACIDADE ? inv.ACURACIDADE.toFixed(2) + '%' : '-'}</td>
                        <td>
                            <button class="btn-detalhes" onclick="abrirInventario(${inv.ID_INVENTARIO})">
                                <i class="fa-solid fa-folder-open"></i> Abrir
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        listaInventariosSalvos.innerHTML = '';
        listaInventariosSalvos.appendChild(table);
    }

    window.abrirInventario = async function(idInventario) {
        try {
            statusMessage.style.color = '#222';
            statusMessage.textContent = 'Carregando inventário...';

            const response = await fetch(`/api/inventarioCiclico?acao=abrir&id=${idInventario}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao carregar inventário');
            }

            inventarioAtual = data.inventario;
            renderizarInventario(inventarioAtual);

            if (inventarioAtual.status === 'EM_ANDAMENTO') {
                salvarInventarioBtn.style.display = 'none';
                finalizarInventarioBtn.style.display = 'inline-block';
            } else {
                salvarInventarioBtn.style.display = 'none';
                finalizarInventarioBtn.style.display = 'none';
            }

            statusMessage.style.color = 'green';
            statusMessage.textContent = `Inventário #${idInventario} carregado com sucesso!`;
            setTimeout(() => { statusMessage.textContent = ''; }, 3000);

        } catch (error) {
            console.error('Erro ao abrir inventário:', error);
            statusMessage.style.color = '#c00';
            statusMessage.textContent = `Erro: ${error.message}`;
        }
    };

    function renderizarInventario(inventario) {
        const { itens, dataGeracao, criterio, id, status, blocos, valorTotalGeral } = inventario;

        if (!itens || itens.length === 0) {
            infoLista.innerHTML = '<p class="info-message">Nenhum item encontrado para inventário.</p>';
            listaInventarioContainer.style.display = 'block';
            return;
        }

        tituloInventario.textContent = id ? `Inventário #${id}` : 'Nova Lista de Inventário';

        let blocosInfo = '';
        if (blocos) {
            blocosInfo = `
                <p><strong>Distribuição:</strong></p>
                <ul class="blocos-info">
                    <li><span class="bloco-badge bloco-movimentacao">Movimentação:</span> ${blocos.movimentacao} itens</li>
                    <li><span class="bloco-badge bloco-baixa-acuracidade">Baixa Acuracidade:</span> ${blocos.baixaAcuracidade} itens</li>
                    <li><span class="bloco-badge bloco-maior-valor">Maior Valor:</span> ${blocos.maiorValor} itens</li>
                </ul>
            `;
        }

        let valorInfo = '';
        if (valorTotalGeral !== undefined) {
            valorInfo = `<p><strong>💰 Valor Total em Estoque:</strong> <span class="valor-total-geral">R$ ${valorTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>`;
        }

        infoLista.innerHTML = `
            <p><strong>Status:</strong> <span class="status-badge status-${status.toLowerCase()}">${status.replace('_', ' ')}</span></p>
            <p><strong>Data de Geração:</strong> ${formatarDataHora(dataGeracao)}</p>
            <p><strong>Total de Itens:</strong> ${itens.length}</p>
            <p><strong>Critério:</strong> ${criterio}</p>
            ${blocosInfo}
            ${valorInfo}
        `;

        const podeEditar = status !== 'FINALIZADO';

        const table = document.createElement('table');
        table.className = 'consulta-table inventario-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>#</th>
                    <th>Bloco</th>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Saldo Sistema</th>
                    <th>Valor Unit.</th>
                    <th>Valor Total</th>
                    <th>Contagem Física</th>
                    <th>Diferença</th>
                    <th>Acuracidade</th>
                    <th>Contado Por</th>
                </tr>
            </thead>
            <tbody>
                ${itens.map((item, index) => {
                    const contagemFisica = item.CONTAGEM_FISICA || 0;
                    const saldoSistema = item.SALDO_ATUAL || 0;
                    const diferenca = contagemFisica - saldoSistema;
                    const acuracidade = saldoSistema > 0 ? ((Math.min(contagemFisica, saldoSistema) / Math.max(contagemFisica, saldoSistema)) * 100) : 0;
                    
                    const usuarioContagem = item.USUARIO_CONTAGEM || '-';
                    const dataContagem = item.DT_CONTAGEM ? formatarDataHora(item.DT_CONTAGEM) : '-';
                    
                    const custoUnitario = item.CUSTO_UNITARIO || 0;
                    const valorTotal = item.VALOR_TOTAL_ESTOQUE || 0;
                    
                    // Define a badge do bloco
                    let blocoTexto = '';
                    let blocoClass = '';
                    if (item.BLOCO === 'MOVIMENTACAO') {
                        blocoTexto = 'Movimentação';
                        blocoClass = 'bloco-movimentacao';
                    } else if (item.BLOCO === 'BAIXA_ACURACIDADE') {
                        blocoTexto = 'Baixa Acurac.';
                        blocoClass = 'bloco-baixa-acuracidade';
                    } else if (item.BLOCO === 'MAIOR_VALOR') {
                        blocoTexto = 'Maior Valor';
                        blocoClass = 'bloco-maior-valor';
                    }
                    
                    return `
                    <tr>
                        <td>${index + 1}</td>
                        <td><span class="bloco-badge ${blocoClass}">${blocoTexto}</span></td>
                        <td><strong>${item.CODIGO}</strong></td>
                        <td>${item.DESCRICAO || 'N/A'}</td>
                        <td>${saldoSistema}</td>
                        <td>R$ ${custoUnitario.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td><strong>R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                        <td>
                            ${podeEditar ? 
                                `<input type="number" 
                                        class="contagem-input" 
                                        data-codigo="${item.CODIGO}" 
                                        value="${contagemFisica}" 
                                        min="0" 
                                        step="1" />` 
                                : contagemFisica}
                        </td>
                        <td class="${diferenca === 0 ? 'diferenca-zero' : diferenca > 0 ? 'diferenca-positiva' : 'diferenca-negativa'}">
                            ${diferenca > 0 ? '+' : ''}${diferenca}
                        </td>
                        <td>
                            <span class="acuracidade-badge ${acuracidade >= 95 ? 'acuracidade-alta' : acuracidade >= 85 ? 'acuracidade-media' : 'acuracidade-baixa'}">
                                ${acuracidade.toFixed(1)}%
                            </span>
                        </td>
                        <td class="info-contagem">
                            ${usuarioContagem !== '-' ? `<small><strong>${usuarioContagem}</strong><br>${dataContagem}</small>` : '-'}
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
            ${valorTotalGeral !== undefined ? `
            <tfoot>
                <tr class="total-row">
                    <td colspan="6" style="text-align: right;"><strong>TOTAL GERAL:</strong></td>
                    <td><strong>R$ ${valorTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    <td colspan="4"></td>
                </tr>
            </tfoot>
            ` : ''}
        `;

        tabelaInventario.innerHTML = '';
        tabelaInventario.appendChild(table);
        listaInventarioContainer.style.display = 'block';

        // Event listener para atualizar contagens em tempo real
        if (podeEditar) {
            table.querySelectorAll('.contagem-input').forEach(input => {
                input.addEventListener('blur', function() {
                    const novaContagem = parseFloat(this.value) || 0;
                    atualizarContagemLocal(this.dataset.codigo, novaContagem);
                    
                    // Salva automaticamente no banco se o inventário já foi salvo
                    if (inventarioAtual.id) {
                        salvarContagemIndividual(inventarioAtual.id, this.dataset.codigo, novaContagem);
                    }
                });
            });
        }
    }

    async function salvarContagemIndividual(idInventario, codigo, contagem) {
        const usuario = localStorage.getItem('userName') || 'Sistema';

        try {
            const response = await fetch('/api/inventarioCiclico', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acao: 'salvarContagem',
                    idInventario: idInventario,
                    codigo: codigo,
                    contagemFisica: contagem,
                    usuario: usuario
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Erro ao salvar contagem:', data.message);
            } else {
                // Atualiza o item com os dados de quem contou
                const item = inventarioAtual.itens.find(i => i.CODIGO === codigo);
                if (item) {
                    item.USUARIO_CONTAGEM = usuario;
                    item.DT_CONTAGEM = new Date().toISOString();
                    renderizarInventario(inventarioAtual);
                }
            }

        } catch (error) {
            console.error('Erro ao salvar contagem individual:', error);
        }
    }

    function atualizarContagemLocal(codigo, contagem) {
        if (!inventarioAtual || !inventarioAtual.itens) return;
        
        const item = inventarioAtual.itens.find(i => i.CODIGO === codigo);
        if (item) {
            item.CONTAGEM_FISICA = contagem;
        }
    }

    async function finalizarInventario() {
        if (!inventarioAtual || !inventarioAtual.id) {
            alert('Salve o inventário antes de finalizar.');
            return;
        }

        if (!confirm('Deseja finalizar este inventário? Esta ação não pode ser desfeita.')) {
            return;
        }

        const usuario = localStorage.getItem('userName') || 'Sistema';

        try {
            statusMessage.style.color = '#222';
            statusMessage.textContent = 'Finalizando inventário...';
            finalizarInventarioBtn.disabled = true;

            const response = await fetch('/api/inventarioCiclico', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acao: 'finalizar',
                    idInventario: inventarioAtual.id,
                    itens: inventarioAtual.itens,
                    usuario: usuario
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao finalizar inventário');
            }

            inventarioAtual.status = 'FINALIZADO';
            inventarioAtual.acuracidade = data.acuracidadeGeral;

            renderizarInventario(inventarioAtual);
            mostrarResultadoAcuracidade(data);

            statusMessage.style.color = 'green';
            statusMessage.textContent = 'Inventário finalizado com sucesso!';
            finalizarInventarioBtn.style.display = 'none';

        } catch (error) {
            console.error('Erro ao finalizar inventário:', error);
            statusMessage.style.color = '#c00';
            statusMessage.textContent = `Erro: ${error.message}`;
        } finally {
            finalizarInventarioBtn.disabled = false;
        }
    }

    function mostrarResultadoAcuracidade(resultado) {
        acuracidadeContent.innerHTML = `
            <div class="resultado-acuracidade">
                <h3>Acuracidade Geral: <span class="acuracidade-geral">${resultado.acuracidadeGeral.toFixed(2)}%</span></h3>
                <div class="estatisticas-inventario">
                    <div class="stat-card">
                        <i class="fa-solid fa-box"></i>
                        <p>Total de Itens</p>
                        <strong>${resultado.totalItens}</strong>
                    </div>
                    <div class="stat-card">
                        <i class="fa-solid fa-check-circle"></i>
                        <p>Itens Corretos</p>
                        <strong>${resultado.itensCorretos}</strong>
                    </div>
                    <div class="stat-card">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <p>Com Divergência</p>
                        <strong>${resultado.itensDivergentes}</strong>
                    </div>
                </div>
                <button class="btn-destaque" onclick="document.getElementById('acuracidadeModal').style.display='none'">
                    Fechar
                </button>
            </div>
        `;
        acuracidadeModal.style.display = 'block';
    }

    function formatarDataHora(dataString) {
        if (!dataString) return 'N/A';
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR');
    }
});
