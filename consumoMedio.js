document.addEventListener('DOMContentLoaded', function() {
    const dataPeriodo = document.getElementById('dataPeriodo');
    const filtroFornecedor = document.getElementById('filtroFornecedor');
    const gerarRelatorioBtn = document.getElementById('gerarRelatorioBtn');
    const totalizadoresContainer = document.getElementById('totalizadoresContainer');
    const resultadosContainer = document.getElementById('resultadosContainer');
    const tabelaRelatorio = document.getElementById('tabelaRelatorio');
    const statusMessage = document.getElementById('statusMessage');
    const imprimirBtn = document.getElementById('imprimirBtn');
    const exportarExcelBtn = document.getElementById('exportarExcelBtn');

    let dadosRelatorio = [];
    let totalizadores = {};

    // Define período padrão (mês atual)
    const hoje = new Date();
    const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    dataPeriodo.value = mesAtual;

    gerarRelatorioBtn.addEventListener('click', gerarRelatorio);
    imprimirBtn.addEventListener('click', imprimirRelatorio);
    exportarExcelBtn.addEventListener('click', exportarParaExcel);

    async function gerarRelatorio() {
        const periodo = dataPeriodo.value;
        const fornecedor = filtroFornecedor.value.trim();

        if (!periodo) {
            mostrarMensagem('Por favor, selecione um período', 'error');
            return;
        }

        mostrarMensagem('Gerando relatório...', 'info');
        gerarRelatorioBtn.disabled = true;

        try {
            let url = `/api/consumoMedio?acao=gerarRelatorio&periodo=${periodo}`;
            if (fornecedor) {
                url += `&fornecedor=${encodeURIComponent(fornecedor)}`;
            }

            console.log('🔍 URL da requisição:', url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Erro na resposta:', errorData);
                throw new Error(errorData.message || 'Erro ao buscar dados');
            }

            const resultado = await response.json();
            
            console.log('✅ Resultado recebido:', resultado);
            
            dadosRelatorio = resultado.dados;
            totalizadores = resultado.totalizadores;

            if (dadosRelatorio.length === 0) {
                mostrarMensagem(
                    `⚠️ Nenhum item encontrado para o período selecionado.`, 
                    'error'
                );
                totalizadoresContainer.style.display = 'none';
                resultadosContainer.style.display = 'none';
                gerarRelatorioBtn.disabled = false;
                return;
            }

            renderizarTotalizadores();
            renderizarTabela();
            
            totalizadoresContainer.style.display = 'block';
            resultadosContainer.style.display = 'block';
            
            mostrarMensagem(
                `Relatório gerado com sucesso! ${dadosRelatorio.length} itens encontrados.`, 
                'success'
            );

        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
            mostrarMensagem(`Erro ao gerar relatório: ${error.message}`, 'error');
        } finally {
            gerarRelatorioBtn.disabled = false;
        }
    }

    function renderizarTotalizadores() {
        document.getElementById('totalItens').textContent = 
            totalizadores.totalItens.toLocaleString('pt-BR');
        
        document.getElementById('valorTotalEstoque').textContent = 
            `R$ ${totalizadores.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        document.getElementById('totalFornecedores').textContent = 
            totalizadores.totalFornecedores.toLocaleString('pt-BR');
        
        // Formata o período
        const [ano, mes] = dataPeriodo.value.split('-');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        document.getElementById('periodoInfo').textContent = 
            `${meses[parseInt(mes) - 1]}/${ano}`;
    }

    function renderizarTabela() {
        if (dadosRelatorio.length === 0) {
            tabelaRelatorio.innerHTML = '<p class="info-message">Nenhum registro encontrado para o período selecionado.</p>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Código</th>
                        <th>Saldo Atual</th>
                        <th>Descrição</th>
                        <th>Preço Unit. Últ. NF</th>
                        <th>Valor Total Estoque</th>
                        <th>Fornecedor</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosRelatorio.map((item, index) => {
                        const valorTotal = (item.SALDO_ATUAL || 0) * (item.PRECO_UNITARIO || 0);
                        return `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${item.CODIGO}</strong></td>
                            <td>${(item.SALDO_ATUAL || 0).toLocaleString('pt-BR')}</td>
                            <td>${item.DESCRICAO || 'SEM DESCRIÇÃO'}</td>
                            <td>R$ ${(item.PRECO_UNITARIO || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td><strong>R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                            <td>${item.FORNECEDOR || 'NÃO INFORMADO'}</td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="5" style="text-align: right;"><strong>TOTAL GERAL:</strong></td>
                        <td><strong>R$ ${totalizadores.valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        `;
        tabelaRelatorio.innerHTML = html;
    }

    function imprimirRelatorio() {
        const janela = window.open('', '_blank');
        
        const [ano, mes] = dataPeriodo.value.split('-');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const periodoFormatado = `${meses[parseInt(mes) - 1]} de ${ano}`;
        
        const conteudo = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Consumo de Estoque - ${periodoFormatado}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; background: #FFE135; padding: 15px; margin: 0 0 20px 0; }
                    h2 { color: #333; margin-top: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 8px; border: 1px solid #000; text-align: left; }
                    th { background: #000; color: white; font-weight: bold; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .total-row { background: #FFE135; font-weight: bold; }
                    .footer { margin-top: 20px; font-size: 12px; text-align: center; }
                </style>
            </head>
            <body>
                <h1>CONSUMO DE ESTOQUE REFERENTE À ${periodoFormatado.toUpperCase()}</h1>
                ${tabelaRelatorio.innerHTML}
                <div class="footer">
                    <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
                    <p style="page-break-after: always;"></p>
                </div>
            </body>
            </html>
        `;
        
        janela.document.write(conteudo);
        janela.document.close();
        
        setTimeout(() => {
            janela.print();
        }, 250);
    }

    function exportarParaExcel() {
        const [ano, mes] = dataPeriodo.value.split('-');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const nomeArquivo = `Consumo_Estoque_${meses[parseInt(mes) - 1]}_${ano}.xlsx`;

        const ws_data = [
            ['CONSUMO DE ESTOQUE REFERENTE À ' + meses[parseInt(mes) - 1] + '/' + ano],
            [],
            ['#', 'Código', 'Saldo Atual', 'Descrição', 'Preço Unit. Últ. NF', 'Valor Total Estoque', 'Fornecedor'],
            ...dadosRelatorio.map((item, index) => {
                const valorTotal = (item.SALDO_ATUAL || 0) * (item.PRECO_UNITARIO || 0);
                return [
                    index + 1,
                    item.CODIGO,
                    item.SALDO_ATUAL || 0,
                    item.DESCRICAO || 'SEM DESCRIÇÃO',
                    item.PRECO_UNITARIO || 0,
                    valorTotal,
                    item.FORNECEDOR || 'NÃO INFORMADO'
                ];
            }),
            [],
            ['', '', '', '', 'TOTAL GERAL:', totalizadores.valorTotalEstoque, '']
        ];

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = [
            { wch: 5 },
            { wch: 12 },
            { wch: 15 },
            { wch: 35 },
            { wch: 18 },
            { wch: 20 },
            { wch: 35 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Consumo');
        XLSX.writeFile(wb, nomeArquivo);
    }

    function mostrarMensagem(mensagem, tipo = 'info') {
        statusMessage.textContent = mensagem;
        statusMessage.className = 'status-message';
        
        if (tipo === 'error') {
            statusMessage.style.color = '#c00';
        } else if (tipo === 'success') {
            statusMessage.style.color = 'green';
        } else {
            statusMessage.style.color = '#222';
        }

        if (tipo === 'success') {
            setTimeout(() => { statusMessage.textContent = ''; }, 5000);
        }
    }

    function formatarData(data) {
        if (!data) return '-';
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR');
    }
});
