document.addEventListener('DOMContentLoaded', function() {
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    const gerarRelatorioBtn = document.getElementById('gerarRelatorioBtn');
    const totalizadoresContainer = document.getElementById('totalizadoresContainer');
    const resultadosContainer = document.getElementById('resultadosContainer');
    const tabelaRelatorio = document.getElementById('tabelaRelatorio');
    const statusMessage = document.getElementById('statusMessage');
    const imprimirBtn = document.getElementById('imprimirBtn');
    const exportarExcelBtn = document.getElementById('exportarExcelBtn');

    let dadosRelatorio = [];
    let totalizadores = {};

    // Define data padrão (últimos 30 dias)
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    
    dataFim.valueAsDate = hoje;
    dataInicio.valueAsDate = trintaDiasAtras;

    gerarRelatorioBtn.addEventListener('click', gerarRelatorio);
    imprimirBtn.addEventListener('click', imprimirRelatorio);
    exportarExcelBtn.addEventListener('click', exportarParaExcel);

    async function gerarRelatorio() {
        const inicio = dataInicio.value;
        const fim = dataFim.value;

        if (!inicio || !fim) {
            mostrarMensagem('Por favor, selecione as datas de início e fim', 'error');
            return;
        }

        if (new Date(inicio) > new Date(fim)) {
            mostrarMensagem('Data de início não pode ser maior que data fim', 'error');
            return;
        }

        mostrarMensagem('Gerando relatório...', 'info');
        gerarRelatorioBtn.disabled = true;

        try {
            const response = await fetch(
                `/api/relatorios?acao=baixaPorPeriodo&dataInicio=${inicio}&dataFim=${fim}`
            );

            if (!response.ok) {
                throw new Error('Erro ao buscar dados');
            }

            const resultado = await response.json();
            
            dadosRelatorio = resultado.dados;
            totalizadores = resultado.totalizadores;

            renderizarTotalizadores();
            renderizarTabela();
            
            totalizadoresContainer.style.display = 'block';
            resultadosContainer.style.display = 'block';
            
            mostrarMensagem(
                `Relatório gerado com sucesso! ${dadosRelatorio.length} produtos encontrados.`, 
                'success'
            );

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            mostrarMensagem('Erro ao gerar relatório. Tente novamente.', 'error');
        } finally {
            gerarRelatorioBtn.disabled = false;
        }
    }

    function renderizarTotalizadores() {
        document.getElementById('totalSaidas').textContent = 
            totalizadores.totalSaidas.toLocaleString('pt-BR');
        
        document.getElementById('totalProdutos').textContent = 
            totalizadores.totalProdutos.toLocaleString('pt-BR');
        
        document.getElementById('totalMovimentacoes').textContent = 
            totalizadores.totalMovimentacoes.toLocaleString('pt-BR');
        
        const inicioFormatado = formatarData(totalizadores.periodo.inicio);
        const fimFormatado = formatarData(totalizadores.periodo.fim);
        document.getElementById('periodoInfo').textContent = 
            `${inicioFormatado} a ${fimFormatado}`;
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
                        <th>Código (SKU)</th>
                        <th>Descrição do Produto</th>
                        <th>Total de Saídas</th>
                        <th>Qtd Movimentações</th>
                        <th>Primeira Baixa</th>
                        <th>Última Baixa</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosRelatorio.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${item.CODIGO}</strong></td>
                            <td>${item.DESCRICAO}</td>
                            <td><strong>${item.TOTAL_SAIDAS.toLocaleString('pt-BR')}</strong></td>
                            <td>${item.QUANTIDADE_MOVIMENTACOES}</td>
                            <td>${formatarData(item.PRIMEIRA_BAIXA)}</td>
                            <td>${formatarData(item.ULTIMA_BAIXA)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="3" style="text-align: right;"><strong>TOTAL GERAL:</strong></td>
                        <td><strong>${totalizadores.totalSaidas.toLocaleString('pt-BR')}</strong></td>
                        <td><strong>${totalizadores.totalMovimentacoes.toLocaleString('pt-BR')}</strong></td>
                        <td colspan="2"></td>
                    </tr>
                </tfoot>
            </table>
        `;

        tabelaRelatorio.innerHTML = html;
    }

    function imprimirRelatorio() {
        if (dadosRelatorio.length === 0) {
            mostrarMensagem('Nenhum dado para imprimir', 'error');
            return;
        }

        const usuarioNome = localStorage.getItem('userName') || 'Sistema';
        const inicioFormatado = formatarData(totalizadores.periodo.inicio);
        const fimFormatado = formatarData(totalizadores.periodo.fim);

        const janelaImpressao = window.open('', '_blank', 'width=800,height=600');
        
        const htmlImpressao = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Baixa por Período</title>
    <style>
        @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.3; color: #333; }
        .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 3px solid #2c3e50; }
        .header h1 { font-size: 18pt; color: #2c3e50; margin-bottom: 5px; }
        .header h2 { font-size: 14pt; color: #34495e; font-weight: normal; }
        .info-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
        .info-item { display: flex; gap: 5px; }
        .info-item strong { color: #2c3e50; }
        .totalizadores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
        .total-card { padding: 8px; text-align: center; background-color: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9pt; }
        thead { background-color: #2c3e50; color: white; }
        th { padding: 8px 4px; text-align: left; font-weight: 600; border: 1px solid #34495e; }
        td { padding: 6px 4px; border: 1px solid #ddd; }
        tbody tr:nth-child(even) { background-color: #f8f9fa; }
        tfoot { background-color: #34495e; color: white; font-weight: bold; }
        tfoot td { border-color: #2c3e50; }
        .text-right { text-align: right; }
        .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #2c3e50; font-size: 8pt; text-align: center; color: #666; }
        .btn-imprimir { position: fixed; top: 10px; right: 10px; padding: 10px 20px; background-color: #2c3e50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 11pt; }
        .btn-imprimir:hover { background-color: #34495e; }
    </style>
</head>
<body>
    <button class="btn-imprimir no-print" onclick="window.print()">🖨️ Imprimir</button>
    
    <div class="header">
        <h1>KARDEX SYSTEM</h1>
        <h2>Relatório de Baixa por Período</h2>
    </div>

    <div class="info-section">
        <div class="info-item"><strong>Período:</strong><span>${inicioFormatado} a ${fimFormatado}</span></div>
        <div class="info-item"><strong>Data de Emissão:</strong><span>${new Date().toLocaleString('pt-BR')}</span></div>
        <div class="info-item"><strong>Total de Produtos:</strong><span>${totalizadores.totalProdutos}</span></div>
        <div class="info-item"><strong>Emitido por:</strong><span>${usuarioNome}</span></div>
    </div>

    <div class="totalizadores">
        <div class="total-card">
            <strong>Total de Saídas</strong>
            <p style="font-size: 14pt; margin-top: 5px;">${totalizadores.totalSaidas.toLocaleString('pt-BR')}</p>
        </div>
        <div class="total-card">
            <strong>Produtos Diferentes</strong>
            <p style="font-size: 14pt; margin-top: 5px;">${totalizadores.totalProdutos.toLocaleString('pt-BR')}</p>
        </div>
        <div class="total-card">
            <strong>Movimentações</strong>
            <p style="font-size: 14pt; margin-top: 5px;">${totalizadores.totalMovimentacoes.toLocaleString('pt-BR')}</p>
        </div>
        <div class="total-card">
            <strong>Média por Produto</strong>
            <p style="font-size: 14pt; margin-top: 5px;">${(totalizadores.totalSaidas / totalizadores.totalProdutos).toFixed(2)}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 30px;">#</th>
                <th style="width: 100px;">Código</th>
                <th>Descrição</th>
                <th style="width: 100px;" class="text-right">Total Saídas</th>
                <th style="width: 80px;" class="text-right">Movimentações</th>
                <th style="width: 90px;">Primeira Baixa</th>
                <th style="width: 90px;">Última Baixa</th>
            </tr>
        </thead>
        <tbody>
            ${dadosRelatorio.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${item.CODIGO}</strong></td>
                    <td>${item.DESCRICAO}</td>
                    <td class="text-right"><strong>${item.TOTAL_SAIDAS.toLocaleString('pt-BR')}</strong></td>
                    <td class="text-right">${item.QUANTIDADE_MOVIMENTACOES}</td>
                    <td>${formatarData(item.PRIMEIRA_BAIXA)}</td>
                    <td>${formatarData(item.ULTIMA_BAIXA)}</td>
                </tr>
            `).join('')}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="text-right"><strong>TOTAL GERAL:</strong></td>
                <td class="text-right"><strong>${totalizadores.totalSaidas.toLocaleString('pt-BR')}</strong></td>
                <td class="text-right"><strong>${totalizadores.totalMovimentacoes.toLocaleString('pt-BR')}</strong></td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>

    <div class="footer">
        <p>Documento gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        <p>SGC - Sistema de Gestão Customic | Kardex System</p>
    </div>
</body>
</html>`;

        janelaImpressao.document.write(htmlImpressao);
        janelaImpressao.document.close();
        setTimeout(() => janelaImpressao.focus(), 250);
    }

    function exportarParaExcel() {
        if (dadosRelatorio.length === 0) {
            mostrarMensagem('Nenhum dado para exportar', 'error');
            return;
        }

        const inicioFormatado = formatarData(totalizadores.periodo.inicio);
        const fimFormatado = formatarData(totalizadores.periodo.fim);

        // Dados principais
        const dadosExcel = dadosRelatorio.map((item, index) => ({
            '#': index + 1,
            'Código (SKU)': item.CODIGO,
            'Descrição': item.DESCRICAO,
            'Total de Saídas': item.TOTAL_SAIDAS,
            'Quantidade Movimentações': item.QUANTIDADE_MOVIMENTACOES,
            'Primeira Baixa': formatarData(item.PRIMEIRA_BAIXA),
            'Última Baixa': formatarData(item.ULTIMA_BAIXA)
        }));

        // Adiciona linha de total
        dadosExcel.push({
            '#': '',
            'Código (SKU)': '',
            'Descrição': 'TOTAL GERAL',
            'Total de Saídas': totalizadores.totalSaidas,
            'Quantidade Movimentações': totalizadores.totalMovimentacoes,
            'Primeira Baixa': '',
            'Última Baixa': ''
        });

        // Informações do relatório
        const infoData = [
            { 'Campo': 'Relatório', 'Valor': 'Baixa por Período' },
            { 'Campo': 'Período', 'Valor': `${inicioFormatado} a ${fimFormatado}` },
            { 'Campo': 'Data de Emissão', 'Valor': new Date().toLocaleString('pt-BR') },
            { 'Campo': 'Emitido por', 'Valor': localStorage.getItem('userName') || 'Sistema' },
            { 'Campo': '', 'Valor': '' },
            { 'Campo': 'TOTALIZADORES', 'Valor': '' },
            { 'Campo': 'Total de Saídas', 'Valor': totalizadores.totalSaidas },
            { 'Campo': 'Produtos Diferentes', 'Valor': totalizadores.totalProdutos },
            { 'Campo': 'Total Movimentações', 'Valor': totalizadores.totalMovimentacoes }
        ];

        // Cria workbook
        const wb = XLSX.utils.book_new();
        
        // Aba de informações
        const wsInfo = XLSX.utils.json_to_sheet(infoData);
        wsInfo['!cols'] = [{ wch: 25 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações');

        // Aba de dados
        const wsDados = XLSX.utils.json_to_sheet(dadosExcel);
        wsDados['!cols'] = [
            { wch: 5 },   // #
            { wch: 15 },  // Código
            { wch: 50 },  // Descrição
            { wch: 15 },  // Total Saídas
            { wch: 20 },  // Movimentações
            { wch: 15 },  // Primeira Baixa
            { wch: 15 }   // Última Baixa
        ];
        XLSX.utils.book_append_sheet(wb, wsDados, 'Dados');

        // Gera arquivo
        const nomeArquivo = `Relatorio_Baixa_${inicioFormatado.replace(/\//g, '-')}_a_${fimFormatado.replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);
        
        mostrarMensagem('Arquivo Excel exportado com sucesso!', 'success');
    }

    function formatarData(dataString) {
        if (!dataString) return '-';
        const data = new Date(dataString + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    }

    function mostrarMensagem(mensagem, tipo) {
        statusMessage.textContent = mensagem;
        statusMessage.className = 'status-message';
        
        if (tipo === 'success') {
            statusMessage.style.color = 'green';
        } else if (tipo === 'error') {
            statusMessage.style.color = 'red';
        } else {
            statusMessage.style.color = '#666';
        }

        if (tipo === 'success' || tipo === 'error') {
            setTimeout(() => {
                statusMessage.textContent = '';
            }, 5000);
        }
    }
});
