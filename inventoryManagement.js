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
      await buscarSaldoPorLocal(codigo);
      
      statusEl.textContent = "";
      
      // Ativa os botões
      btnEntrada.disabled = false;
      btnSaida.disabled = false;
    } catch (err) {
      statusEl.style.color = "#c00";
      statusEl.textContent = `Erro: ${err.message}`;
      btnEntrada.disabled = true;
      btnSaida.disabled = true;
    }
  }

  async function buscarSaldoPorLocal(codigo) {
    try {
      const res = await fetch(`/api/inventory?codigo=${encodeURIComponent(codigo)}&action=saldoLocal`);
      if (!res.ok) return;
      
      const data = await res.json();
      renderSaldoPorLocal(data.locais || []);
    } catch (err) {
      console.error('Erro ao buscar saldo por local:', err);
    }
  }

  function renderSaldoPorLocal(locais) {
    const tbody = document.getElementById("saldoLocalBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (locais.length === 0) {
      saldoPorLocalContainer.style.display = "none";
      return;
    }
    
    let totalCaixas = 0;
    let totalSaldo = 0;
    
    locais.forEach(local => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${local.ARMAZEM ? String(local.ARMAZEM).padStart(2, '0') : '-'}</td>
        <td><strong>${local.ENDERECO || '-'}</strong></td>
        <td>${local.TAM_LOTE || '-'}</td>
        <td><strong>${local.QNT_CAIXAS || 0}</strong></td>
        <td class="text-right"><strong>${local.SALDO || 0}</strong></td>
      `;
      tbody.appendChild(tr);
      totalCaixas += (local.QNT_CAIXAS || 0);
      totalSaldo += (local.SALDO || 0);
    });
    
    // Adiciona linha de total com destaque
    const trTotal = document.createElement("tr");
    trTotal.className = "total-row-saldo";
    trTotal.innerHTML = `
      <td colspan="3" class="text-right"><strong>TOTAL:</strong></td>
      <td><strong>${totalCaixas}</strong></td>
      <td class="text-right"><strong style="font-size: 1.1em; color: #1976d2;">🏷️ ${totalSaldo}</strong></td>
    `;
    tbody.appendChild(trTotal);
    
    saldoPorLocalContainer.style.display = "block";
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
          <span class="stat-value" style="color: #28a745; font-size: 32px;">${saldoTotal.toLocaleString('pt-BR')}</span>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-arrow-up"></i>
          <span class="stat-label">Total Entradas</span>
          <span class="stat-value">${entradas.length}</span>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-arrow-down"></i>
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
      historicoBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nenhum histórico encontrado</td></tr>';
      return;
    }
    
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      
      const operacaoClass = r.OPERACAO === 'ENTRADA' ? 'badge-entrada' : 'badge-saida';
      const operacaoIcon = r.OPERACAO === 'ENTRADA' ? '⬆️' : '⬇️';
      
      tr.innerHTML = `
        <td>${r.ID_TB_RESUMO || '-'}</td>
        <td><span class="badge ${operacaoClass}">${operacaoIcon} ${r.OPERACAO || "-"}</span></td>
        <td>${r.ENDERECO || "-"}</td>
        <td>${r.ARMAZEM ? String(r.ARMAZEM).padStart(2, '0') : "-"}</td>
        <td class="text-right"><strong>${r.QNT || 0}</strong></td>
        <td>${r.USUARIO || "-"}</td>
        <td>${r.DT ? new Date(r.DT).toLocaleDateString('pt-BR') : "-"}</td>
        <td>${r.HR || "-"}</td>
      `;
      historicoBody.appendChild(tr);
    });
  }

  function gerarEtiqueta(dados) {
    const janelaEtiqueta = window.open('', '_blank', 'width=600,height=400');
    
    const htmlEtiqueta = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta - ${dados.codigo}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
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
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 5mm;
        }
        
        .etiqueta {
            width: 145mm;
            height: 104mm;
            border: 3px solid #000;
            padding: 3mm;
            background: white;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            justify-content: space-between;
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
    
    <div class="etiqueta">
        <div class="header">
            <div class="header-top">
                <span class="id-badge">ID: ${dados.idMovimento || 'N/A'}</span>
                <h1>KARDEX SYSTEM</h1>
                <span class="tipo-movimento">${dados.tipoMovimento}</span>
            </div>
        </div>
        
        <div class="codigo-principal">
            <div class="codigo-texto">${dados.codigo}</div>
        </div>
        
        <div class="codigo-barras">
            <svg id="barcode"></svg>
        </div>
        
        <div class="info-principal">
            <div class="info-row destaque">
                <span class="info-label">QUANTIDADE:</span>
                <span class="info-value" style="font-size: 10pt;">${dados.quantidade}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">ENDEREÇO:</span>
                <span class="info-value">${dados.endereco || '-'}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">ARMAZÉM:</span>
                <span class="info-value">${dados.armazem ? String(dados.armazem).padStart(2, '0') : '-'}</span>
            </div>
        </div>
        
        <div class="descricao">
            <div class="descricao-label">DESCRIÇÃO DO PRODUTO:</div>
            <div class="descricao-text">${dados.descricao || 'N/A'}</div>
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
    
    <script>
        // Gera código de barras com tamanho maximizado
        JsBarcode("#barcode", "${dados.codigo}", {
            format: "CODE128",
            width: 3,
            height: 55,
            displayValue: true,
            fontSize: 14,
            margin: 2,
            fontOptions: "bold"
        });
        
        setTimeout(() => window.focus(), 250);
    </script>
</body>
</html>`;

    janelaEtiqueta.document.write(htmlEtiqueta);
    janelaEtiqueta.document.close();
  }

  btnConsultar.addEventListener("click", () => {
    const codigo = codigoEl.value.trim();
    if (!codigo) {
      statusEl.style.color = "#c00";
      statusEl.textContent = "Digite um código.";
      return;
    }
    statusEl.textContent = "";
    consultar(codigo);
  });

  btnEntrada.addEventListener("click", () => {
    if (!codigoAtual) return;
    tituloModal.textContent = "📥 Registrar ENTRADA";
    tituloModal.style.color = "#4caf50";
    iconModal.textContent = "📥";
    iconModal.style.color = "#4caf50";
    inputTipoMovimento.value = "ENTRADA";
    submitBtn.style.backgroundColor = "#4caf50";
    submitBtn.textContent = "✓ Registrar Entrada";
    document.getElementById("tamanhoLoteModal").value = "1";
    document.getElementById("repeticoesModal").value = "1";
    document.getElementById("observacaoModal").value = "";
    document.getElementById("enderecoModal").value = "";
    document.getElementById("armazemModal").value = "";
    modalMovimento.style.display = "flex";
  });

  btnSaida.addEventListener("click", () => {
    if (!codigoAtual) return;
    tituloModal.textContent = "📤 Registrar SAÍDA";
    tituloModal.style.color = "#f44336";
    iconModal.textContent = "📤";
    iconModal.style.color = "#f44336";
    inputTipoMovimento.value = "SAIDA";
    submitBtn.style.backgroundColor = "#f44336";
    submitBtn.textContent = "✓ Registrar Saída";
    document.getElementById("tamanhoLoteModal").value = "1";
    document.getElementById("repeticoesModal").value = "1";
    document.getElementById("observacaoModal").value = "";
    document.getElementById("enderecoModal").value = "";
    document.getElementById("armazemModal").value = "";
    modalMovimento.style.display = "flex";
  });

  closeModal.addEventListener("click", () => {
    modalMovimento.style.display = "none";
  });

  modalMovimento.addEventListener("click", (e) => {
    if (e.target === modalMovimento) {
      modalMovimento.style.display = "none";
    }
  });

  formMovimento.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const tamanhoLote = Number(document.getElementById("tamanhoLoteModal").value) || 0;
    const repeticoes = Number(document.getElementById("repeticoesModal").value) || 1;
    const observacao = document.getElementById("observacaoModal").value.trim();
    const endereco = (document.getElementById("enderecoModal").value || "").trim();
    const armazem = (document.getElementById("armazemModal").value || "").trim();
    const tipo = inputTipoMovimento.value;
    const usuario = localStorage.getItem("userName") || "WEB";

    if (!codigoAtual || tamanhoLote <= 0 || repeticoes <= 0) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    statusEl.style.color = "#222";
    statusEl.textContent = "Registrando...";

    try {
        for (let i = 0; i < repeticoes; i++) {
            const body = {
                codigo: codigoAtual,
                tipo,
                quantidade: tamanhoLote,
                usuario,
                endereco,
                armazem,
                observacao,
            };

            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Erro ao registrar movimento");
        }

        statusEl.style.color = "green";
        statusEl.textContent = "Movimentos registrados com sucesso!";
        modalMovimento.style.display = "none";
        consultar(codigoAtual);
    } catch (err) {
        statusEl.style.color = "#c00";
        statusEl.textContent = `Erro: ${err.message}`;
    }
  });

  // Desativa botões inicialmente
  btnEntrada.disabled = true;
  btnSaida.disabled = true;
});