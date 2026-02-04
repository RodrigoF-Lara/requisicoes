document.addEventListener("DOMContentLoaded", () => {
  const codigoEl = document.getElementById("codigo");
  const btnConsultar = document.getElementById("consultarBtn");
  const produtoInfo = document.getElementById("produtoInfo");
  const infoCodigo = document.getElementById("infoCodigo");
  const infoDescricao = document.getElementById("infoDescricao");
  const infoQuantidade = document.getElementById("infoQuantidade");

  const entradaSaidaContainer = document.getElementById("entradaSaidaContainer");
  const statusEl = document.getElementById("status");
  
  // Novos elementos para modal
  const btnEntrada = document.getElementById("btnEntrada");
  const btnSaida = document.getElementById("btnSaida");
  const modalMovimento = document.getElementById("modalMovimento");
  const closeModal = document.getElementById("closeModal");
  const formMovimento = document.getElementById("formMovimento");
  const tituloModal = document.getElementById("tituloModal");
  const iconModal = document.getElementById("iconModal");
  const inputTipoMovimento = document.getElementById("inputTipoMovimento");
  const submitBtn = document.getElementById("submitBtn");

  const historicoContainer = document.getElementById("historicoContainer");
  const historicoBody = document.getElementById("historicoBody");
  
  // Novos elementos para estatísticas
  const estatisticasContainer = document.getElementById("estatisticasContainer");
  const saldoPorLocalContainer = document.getElementById("saldoPorLocalContainer");

  let codigoAtual = "";
  let loteSelecionado = null;

  async function consultar(codigo) {
    codigoAtual = codigo;
    produtoInfo.style.display = "none";
    entradaSaidaContainer.style.display = "none";
    historicoContainer.style.display = "none";
    estatisticasContainer.style.display = "none";
    saldoPorLocalContainer.style.display = "none";
    
    statusEl.style.color = "#222";
    statusEl.textContent = "Buscando...";
    
    try {
      const res = await fetch(`/api/inventory?codigo=${encodeURIComponent(codigo)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erro ao consultar" }));
        throw new Error(err.message || "Erro ao consultar");
      }
      const data = await res.json();
      
      infoCodigo.textContent = data.codigo || codigo;
      infoDescricao.textContent = data.descricao || "-";
      infoQuantidade.textContent = (data.saldo !== undefined) ? data.saldo : "-";
      
      produtoInfo.style.display = "block";
      entradaSaidaContainer.style.display = "block";
      historicoContainer.style.display = "block";
      
      renderHistorico(data.movimentos || []);
      renderEstatisticas(data);
      await buscarSaldoAgrupado(codigo);
      
      statusEl.textContent = "";
      
      // Habilita botões de entrada e saída
      btnEntrada.disabled = false;
      btnSaida.disabled = false; 
      loteSelecionado = null; // Reseta lote selecionado

    } catch (err) {
      statusEl.style.color = "#c00";
      statusEl.textContent = `Erro: ${err.message}`;
      btnEntrada.disabled = true;
      btnSaida.disabled = true;
    }
  }

  async function buscarSaldoAgrupado(codigo) {
    const saldoLocalBody = document.getElementById("saldoLocalBody");
    saldoPorLocalContainer.style.display = 'block';
    saldoLocalBody.innerHTML = '<tr><td colspan="5">Buscando...</td></tr>';
    
    try {
        const res = await fetch(`/api/inventory?action=saldoLocal&codigo=${encodeURIComponent(codigo)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        renderSaldoAgrupado(data.locais);
    } catch (err) {
        saldoLocalBody.innerHTML = `<tr><td colspan="5" style="color:#c00;">${err.message}</td></tr>`;
    }
  }

  function renderSaldoAgrupado(locais) {
    const saldoLocalBody = document.getElementById("saldoLocalBody");
    saldoLocalBody.innerHTML = "";
    if (!locais || locais.length === 0) {
      saldoLocalBody.innerHTML = '<tr><td colspan="5" class="info-message">Nenhum saldo encontrado para este produto.</td></tr>';
      return;
    }
    
    locais.forEach(local => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${local.ARMAZEM || "-"}</td>
            <td>${local.ENDERECO || "-"}</td>
            <td>${local.TAM_LOTE || 0}</td>
            <td class="text-right">${local.QNT_CAIXAS || 0}</td>
            <td class="text-right"><strong>${local.SALDO || 0}</strong></td>
        `;
        saldoLocalBody.appendChild(tr);
    });
  }

  function renderEstatisticas(data) {
    if (!estatisticasContainer) return;
    
    const movimentos = data.movimentos || [];
    const entradas = movimentos.filter(m => m.OPERACAO === 'ENTRADA');
    const saidas = movimentos.filter(m => m.OPERACAO === 'SAÍDA');
    const saldoTotal = data.saldo || 0;
    
    estatisticasContainer.innerHTML = `
      <h3>📊 Estatísticas Rápidas</h3>
      <div class="estatisticas-grid">
        <div class="stat-card destaque-saldo">
          <i class="fa-solid fa-boxes-stacked"></i>
          <span class="stat-label">Saldo Total em Estoque</span>
          <span class="stat-value" style="color: #030303; font-size: 32px;">${saldoTotal.toLocaleString('pt-BR')}</span>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-arrow-up"></i>
          <span class="stat-label">Total Entradas</span>
          <span class="stat-value">${entradas.length}</span>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-arrow-down" style="color: #f44336;"></i>
          <span class="stat-label">Total Saídas</span>
          <span class="stat-value">${saidas.length}</span>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-calendar-days"></i>
          <span class="stat-label">Última Movimentação</span>
          <span class="stat-value">${movimentos[0]?.DT ? new Date(movimentos[0].DT).toLocaleDateString('pt-BR') : '-'}</span>
        </div>
      </div>
    `;
    
    estatisticasContainer.style.display = "block";
  }

  function renderHistorico(rows) {
    historicoBody.innerHTML = "";
    if (!rows || rows.length === 0) {
      historicoBody.innerHTML =
        '<tr><td colspan="9" style="text-align:center;">Nenhum histórico encontrado</td></tr>';
      return;
    }

    rows.forEach((row) => {
      historicoBody.innerHTML += `
        <tr data-id-movimento="${row.ID_TB_RESUMO}">
          <td>${row.ID_TB_RESUMO || "-"}</td>
          <td><span class="badge ${
            row.OPERACAO === "ENTRADA" ? "badge-entrada" : "badge-saida"
          }">${row.OPERACAO === "ENTRADA" ? "⬆️" : "⬇️"} ${
        row.OPERACAO || "-"
      }</span></td>
          <td>${row.ENDERECO || "-"}</td>
          <td>${row.ARMAZEM ? String(row.ARMAZEM).padStart(2, "0") : "-"}</td>
          <td class="text-right"><strong>${row.QNT || 0}</strong></td>
          <td>${row.USUARIO || "-"}</td>
          <td>${
            row.DT ? new Date(row.DT).toLocaleDateString("pt-BR") : "-"
          }</td>
          <td>${row.HR || "-"}</td>
          <td class="actions-cell">
            ${
              row.OPERACAO === "ENTRADA"
                ? `<button class="btn-reimprimir" title="Reimprimir Etiqueta">
                <i class="fa-solid fa-print"></i>
              </button>`
                : ""
            }
          </td>
        </tr>
      `;
    });
  }

  function gerarEtiqueta(dadosOuArray) {
    const etiquetas = Array.isArray(dadosOuArray) ? dadosOuArray : [dadosOuArray];
    if (etiquetas.length === 0) {
      console.error("gerarEtiqueta foi chamada sem dados de etiqueta válidos.");
      return;
    }

    const janelaEtiqueta = window.open("", "_blank", "width=800,height=600");

    if (!janelaEtiqueta || typeof janelaEtiqueta.closed == 'undefined' || janelaEtiqueta.closed) {
      alert("A janela de impressão foi bloqueada pelo navegador. Por favor, habilite os pop-ups para este site e tente reimprimir a etiqueta a partir do histórico.");
      return;
    }

    const etiquetasHtml = etiquetas.map(dados => `
      <div class="etiqueta">
        <div class="header">
            <div class="header-top">
                <span class="id-badge">ID: ${dados.idMovimento || "N/A"}</span>
                <h1>KARDEX SYSTEM</h1>
                <span class="tipo-movimento">${dados.tipoMovimento}</span>
            </div>
        </div>
        
        <div class="codigo-principal">
            <div class="codigo-texto">${dados.codigo}</div>
        </div>
        
        <div class="codigo-barras">
            <svg id="barcode-${dados.idMovimento}"></svg>
        </div>
        
        <div class="info-principal">
            <div class="info-row destaque">
                <span class="info-label">QUANTIDADE:</span>
                <span class="info-value" style="font-size: 10pt;">${dados.quantidade}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">ENDEREÇO:</span>
                <span class="info-value">${dados.endereco || "-"}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">ARMAZÉM:</span>
                <span class="info-value">${dados.armazem ? String(dados.armazem).padStart(2, "0") : "-"}</span>
            </div>
        </div>
        
        <div class="descricao">
            <div class="descricao-label">DESCRIÇÃO DO PRODUTO:</div>
            <div class="descricao-text">${dados.descricao || "N/A"}</div>
        </div>
        
        <div class="footer">
            <div class="footer-left">
                ${dados.dataHora}
            </div>
            <div class="footer-right">
                ${dados.usuario} | KARDEX 2026
            </div>
        </div>
    </div>
    `).join('');

    const htmlEtiqueta = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta - ${etiquetas[0].codigo}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
    <style>
        @media print {
            @page { 
                size: 145mm 104mm;
                margin: 0;
            }
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
            }
            .no-print { display: none !important; }
            .etiqueta {
                page-break-after: always;
            }
            .etiqueta:last-child {
                page-break-after: auto;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: #ccc;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 5mm;
        }
        
        .etiqueta {
            width: 145mm;
            height: 104mm;
            border: 1px dashed #666;
            padding: 3mm;
            background: white;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            justify-content: space-between;
            margin-bottom: 5mm;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 1.5mm;
            margin-bottom: 1.5mm;
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5mm;
        }
        
        .header-top .id-badge {
            background-color: #2c3e50;
            color: white;
            padding: 1.5mm 3mm;
            border-radius: 3mm;
            font-size: 11pt;
            font-weight: bold;
        }
        
        .header h1 {
            font-size: 15pt;
            font-weight: bold;
            color: #1976d2;
            flex: 1;
            text-align: center;
            margin: 0;
        }
        
        .header .tipo-movimento {
            display: inline-block;
            background-color: #4caf50;
            color: white;
            padding: 1.5mm 4mm;
            border-radius: 3mm;
            font-size: 11pt;
            font-weight: bold;
        }
        
        .codigo-barras {
            text-align: center;
            margin: 2mm 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .codigo-barras svg {
            width: 100% !important;
            max-width: 130mm !important;
            height: auto !important;
        }
        
        .info-principal {
            margin: 1mm 0;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.8mm;
            padding: 1.2mm;
            background-color: #f5f5f5;
            border-left: 3px solid #1976d2;
        }
        
        .info-row.destaque {
            background-color: #e3f2fd;
            border-left-color: #0d47a1;
        }
        
        .info-label {
            font-weight: bold;
            color: #333;
            font-size: 8.5pt;
            min-width: 35%;
        }
        
        .info-value {
            color: #000;
            font-size: 8.5pt;
            font-weight: 600;
            text-align: right;
            flex: 1;
        }
        
        .descricao {
            margin: 2mm 0;
            padding: 2mm;
            background-color: #fff3e0;
            border: 1px solid #ff9800;
            border-radius: 2mm;
        }
        
        .descricao-label {
            font-weight: bold;
            font-size: 8pt;
            color: #e65100;
            margin-bottom: 1mm;
        }
        
        .descricao-text {
            font-size: 10pt;
            color: #000;
            font-weight: 600;
            line-height: 1.2;
            max-height: 2.4em;
            overflow: hidden;
        }
        
        .footer {
            border-top: 2px solid #333;
            padding-top: 2mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7pt;
            color: #666;
        }
        
        .footer-left {
            font-style: italic;
        }
        
        .footer-right {
            text-align: right;
            font-weight: bold;
        }

        .codigo-principal {
          text-align: center;
          padding: 2mm 0;
        }

        .codigo-texto {
            font-size: 20pt;
            font-weight: bold;
            letter-spacing: 2px;
            color: #111;
        }
        
        .btn-imprimir {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 20px;
            background-color: #1976d2;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            z-index: 1000;
        }
        
        .btn-imprimir:hover {
            background-color: #1565c0;
        }
    </style>
</head>
<body>
    <button class="btn-imprimir no-print" onclick="window.print()">🖨️ Imprimir Etiqueta</button>
    ${etiquetasHtml}    
    <script>
        const etiquetasData = ${JSON.stringify(etiquetas)};
        setTimeout(() => {
            etiquetasData.forEach(dados => {
                if (dados.idMovimento && document.getElementById('barcode-' + dados.idMovimento)) {
                    JsBarcode("#barcode-" + dados.idMovimento, dados.codigo, {
                        format: "CODE128",
                        width: 3,
                        height: 55,
                        displayValue: true,
                        fontSize: 14,
                        margin: 2,
                        fontOptions: "bold"
                    });
                }
            });
            window.focus();
        }, 250);
    </script>
</body>
</html>`;

    janelaEtiqueta.document.write(htmlEtiqueta);
    janelaEtiqueta.document.close();

    // Adiciona um pequeno delay para garantir que o conteúdo foi renderizado antes de imprimir
    setTimeout(() => {
      janelaEtiqueta.print();
    }, 500);
  }

  // --- Lógica de Eventos ---

  btnConsultar.addEventListener("click", () => {
    const codigo = codigoEl.value.trim();
    if (codigo) consultar(codigo);
  });

  codigoEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const codigo = codigoEl.value.trim();
      if (codigo) consultar(codigo);
    }
  });

  btnEntrada.addEventListener("click", () => {
    if (!codigoAtual) return;
    tituloModal.textContent = "📥 Registrar ENTRADA";
    tituloModal.style.color = "#4caf50";
    iconModal.textContent = "📥";
    iconModal.style.color = "#4caf50";
    inputTipoMovimento.value = "ENTRADA";
    submitBtn.className = "btn-movimento entrada";
    submitBtn.textContent = "✓ Registrar Entrada";

    // Mostra/oculta campos e ajusta validação
    document.getElementById('loteSelectorContainer').style.display = 'none';
    document.getElementById('loteIdModal').required = false; // <-- Correção
    document.getElementById('entradaFields').style.display = 'block';
    document.getElementById('repeticoesContainer').style.display = 'block';
    
    modalMovimento.style.display = "flex";
  });

  btnSaida.addEventListener("click", async () => {
    if (!codigoAtual) {
      alert('Consulte um produto antes de registrar uma saída.');
      return;
    }
    tituloModal.textContent = `📤 Registrar SAÍDA`;
    tituloModal.style.color = "#f44336";
    iconModal.textContent = "📤";
    iconModal.style.color = "#f44336";
    inputTipoMovimento.value = "SAIDA";
    submitBtn.className = "btn-movimento saida";
    submitBtn.textContent = "✓ Registrar Saída";

    // Mostra/oculta campos e ajusta validação
    document.getElementById('loteSelectorContainer').style.display = 'block';
    document.getElementById('loteIdModal').required = true; // <-- Correção
    document.getElementById('entradaFields').style.display = 'none';
    document.getElementById('repeticoesContainer').style.display = 'none';
    
    modalMovimento.style.display = "flex";

    // Busca e popula os lotes disponíveis
    const loteSelect = document.getElementById('loteIdModal');
    loteSelect.innerHTML = '<option value="">Carregando lotes...</option>';
    loteSelect.disabled = true;
    loteSelecionado = null; // Reseta seleção anterior

    try {
        const res = await fetch(`/api/inventory?action=saldoPorLote&codigo=${encodeURIComponent(codigoAtual)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        if (data.lotes && data.lotes.length > 0) {
            loteSelect.innerHTML = '<option value="">Selecione um lote...</option>';
            data.lotes.forEach(lote => {
                const option = document.createElement('option');
                option.value = lote.ID;
                option.textContent = `ID: ${lote.ID} | End: ${lote.ENDERECO || 'N/A'} | Saldo: ${lote.SALDO}`;
                option.dataset.saldo = lote.SALDO;
                loteSelect.appendChild(option);
            });
            loteSelect.disabled = false;
        } else {
            loteSelect.innerHTML = '<option value="">Nenhum lote com saldo encontrado.</option>';
        }
    } catch (err) {
        loteSelect.innerHTML = `<option value="">Erro ao carregar lotes.</option>`;
        console.error(err);
    }
  });

  closeModal.addEventListener("click", () => {
    modalMovimento.style.display = "none";
  });
  
  window.addEventListener("click", (e) => {
    if (e.target === modalMovimento) {
      modalMovimento.style.display = "none";
    }
  });
  
  formMovimento.addEventListener("submit", (e) => {
    e.preventDefault();
    handleMovimento();
  });

  document.getElementById('loteIdModal').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption && selectedOption.value) {
        loteSelecionado = {
            id: selectedOption.value,
            saldo: parseFloat(selectedOption.dataset.saldo)
        };
        // Atualiza o título do modal com o ID selecionado
        tituloModal.textContent = `📤 Registrar SAÍDA (Lote ID: ${loteSelecionado.id})`;
    } else {
        loteSelecionado = null;
        tituloModal.textContent = `📤 Registrar SAÍDA`;
    }
  });

  // Listener para o botão de reimprimir etiqueta
  document.getElementById('historicoBody').addEventListener('click', function(event) {
    const target = event.target.closest('.btn-reimprimir');
    if (target) {
        const row = target.closest('tr');
        const operacao = row.cells[1].textContent.trim().replace('⬆️', '').replace('⬇️', '').trim();
        
        if (operacao !== 'ENTRADA') {
            alert('A reimpressão de etiquetas está disponível apenas para movimentações de ENTRADA.');
            return;
        }

        const dados = {
            idMovimento: row.cells[0].textContent.trim(),
            codigo: codigoAtual,
            descricao: document.getElementById('infoDescricao').textContent.trim(),
            quantidade: row.cells[4].textContent.trim(),
            endereco: row.cells[2].textContent.trim(),
            armazem: row.cells[3].textContent.trim(),
            usuario: row.cells[5].textContent.trim(),
            dataHora: `${row.cells[6].textContent.trim()} ${row.cells[7].textContent.trim()}`,
            tipoMovimento: operacao
        };
        gerarEtiqueta(dados);
    }
  });

  async function handleMovimento() {
    const tipo = inputTipoMovimento.value;
    const quantidade = Number(document.getElementById("tamanhoLoteModal").value) || 0;
    const repeticoes = (tipo === 'ENTRADA') ? (Number(document.getElementById("repeticoesModal").value) || 1) : 1;
    const observacao = document.getElementById("observacaoModal").value.trim();
    const endereco = (document.getElementById("enderecoModal").value || "").trim();
    const armazem = (document.getElementById("armazemModal").value || "").trim();
    const usuario = localStorage.getItem("userName") || "WEB";

    if (!codigoAtual || quantidade <= 0) {
      alert("A quantidade deve ser maior que zero.");
      return;
    }

    if (tipo === 'SAIDA') {
      if (!loteSelecionado) {
        alert("Erro fatal: Nenhum lote selecionado. A operação não pode continuar.");
        return;
      }
      if (quantidade > loteSelecionado.saldo) {
        alert(`Quantidade inválida. O lote selecionado (${loteSelecionado.id}) possui saldo de apenas ${loteSelecionado.saldo}.`);
        return;
      }
    }

    statusEl.style.color = "#222";
    statusEl.textContent = "Registrando...";
    const etiquetasParaImprimir = [];

    try {
      for (let i = 0; i < repeticoes; i++) {
        if (repeticoes > 1) {
          statusEl.textContent = `Registrando ${i + 1} de ${repeticoes}...`;
        }
        
        const body = {
          codigo: codigoAtual,
          tipo,
          quantidade: quantidade,
          usuario,
          endereco,
          armazem,
          observacao,
        };
        
        if (tipo === 'SAIDA') {
            body.idTbResumo = loteSelecionado.id;
        }

        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || `Erro ao registrar movimento ${i + 1}`);
        }
        
        if (tipo === 'ENTRADA' && data.labelData) {
            etiquetasParaImprimir.push(data.labelData);
        }
      }

      if (etiquetasParaImprimir.length > 0) {
        gerarEtiqueta(etiquetasParaImprimir);
      }
      
      modalMovimento.style.display = "none";
      formMovimento.reset();
      
      // Atraso para dar tempo ao DB de atualizar antes de reconsultar
      setTimeout(() => {
          consultar(codigoAtual);
      }, 500);
      
      statusEl.style.color = "#28a745";
      statusEl.textContent = `${repeticoes} movimento(s) registrado(s) com sucesso!`;

    } catch (err) {
      statusEl.style.color = "#c00";
      statusEl.textContent = `Erro: ${err.message}`;
      modalMovimento.style.display = "none"; // Garante que o modal feche em caso de erro.
      // Re-consulta mesmo em caso de erro para atualizar a lista com os que deram certo
      setTimeout(() => {
        consultar(codigoAtual);
      }, 500);
    }
  }
});