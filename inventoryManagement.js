document.addEventListener("DOMContentLoaded", () => {
  const codigoEl = document.getElementById("codigo");
  const btnConsultar = document.getElementById("consultarBtn");
  const produtoInfo = document.getElementById("produtoInfo");
  const infoCodigo = document.getElementById("infoCodigo");
  const infoDescricao = document.getElementById("infoDescricao");
  const infoQuantidade = document.getElementById("infoQuantidade");

  const entradaSaidaContainer = document.getElementById("entradaSaidaContainer");
  const quantidadeEl = document.getElementById("quantidade");
  const tipoMovimento = document.getElementById("tipoMovimento");
  const gerenciarBtn = document.getElementById("gerenciarBtn");
  const statusEl = document.getElementById("status");

  // novos campos de endereço e armazém (devem existir no HTML)
  const enderecoEl = document.getElementById("endereco");
  const armazemEl = document.getElementById("armazem");

  const historicoContainer = document.getElementById("historicoContainer");
  const historicoBody = document.getElementById("historicoBody");

  async function consultar(codigo) {
    produtoInfo.style.display = "none";
    entradaSaidaContainer.style.display = "none";
    historicoContainer.style.display = "none";
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
      statusEl.textContent = "";
    } catch (err) {
      statusEl.style.color = "#c00";
      statusEl.textContent = `Erro: ${err.message}`;
    }
  }

  function renderHistorico(rows) {
    historicoBody.innerHTML = "";
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.DT || ""}</td><td>${r.OPERACAO || r.TIPO || ""}</td><td>${r.QNT || ""}</td>`;
      historicoBody.appendChild(tr);
    }
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
            border: 2px solid #000;
            padding: 6mm;
            background: white;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 3mm;
            margin-bottom: 2mm;
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2mm;
        }
        
        .header-top .id-badge {
            background-color: #2c3e50;
            color: white;
            padding: 2mm 4mm;
            border-radius: 3mm;
            font-size: 11pt;
            font-weight: bold;
        }
        
        .header h1 {
            font-size: 16pt;
            font-weight: bold;
            color: #1976d2;
            flex: 1;
            text-align: center;
        }
        
        .header .tipo-movimento {
            display: inline-block;
            background-color: #4caf50;
            color: white;
            padding: 2mm 5mm;
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
            margin: 2mm 0;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1.5mm;
            padding: 1.5mm;
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
            font-size: 9pt;
            min-width: 35%;
        }
        
        .info-value {
            color: #000;
            font-size: 9pt;
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
        
        <div class="codigo-barras">
            <svg id="barcode"></svg>
        </div>
        
        <div class="info-principal">
            <div class="info-row destaque">
                <span class="info-label">CÓDIGO:</span>
                <span class="info-value">${dados.codigo}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">QUANTIDADE:</span>
                <span class="info-value">${dados.quantidade}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">ENDEREÇO:</span>
                <span class="info-value">${dados.endereco || '-'}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">ARMAZÉM:</span>
                <span class="info-value">${dados.armazem || '-'}</span>
            </div>
        </div>
        
        <div class="descricao">
            <div class="descricao-label">DESCRIÇÃO DO PRODUTO:</div>
            <div class="descricao-text">${dados.descricao || 'N/A'}</div>
        </div>
        
        <div class="footer">
            <div class="footer-left">
                Gerado em: ${dados.dataHora}
            </div>
            <div class="footer-right">
                Usuário: ${dados.usuario}
            </div>
        </div>
    </div>
    
    <script>
        // Gera código de barras com tamanho maximizado
        JsBarcode("#barcode", "${dados.codigo}", {
            format: "CODE128",
            width: 3,
            height: 80,
            displayValue: true,
            fontSize: 18,
            margin: 5,
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

  gerenciarBtn.addEventListener("click", async () => {
    const codigo = codigoEl.value.trim();
    const quantidade = Number(quantidadeEl.value) || 0;
    const tipo = tipoMovimento.value;
    const usuario = localStorage.getItem("userName") || "WEB";

    const endereco = (enderecoEl && enderecoEl.value || "").trim();
    const armazem = (armazemEl && armazemEl.value || "").trim();

    // validação mínima
    if (!codigo || quantidade <= 0) {
      statusEl.style.color = "#c00";
      statusEl.textContent = "Código e quantidade válidos são obrigatórios.";
      return;
    }

    statusEl.style.color = "#222";
    statusEl.textContent = "Registrando...";
    try {
      const body = { codigo, tipo, quantidade, usuario, endereco, armazem };
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erro ao registrar movimento");
      statusEl.style.color = "green";
      statusEl.textContent = data.message || "Movimento registrado";
      
      // Gera etiqueta apenas para ENTRADA
      if (tipo.toUpperCase() === "ENTRADA") {
        const dadosEtiqueta = {
          idMovimento: data.resumoId || 'N/A',
          codigo: codigo,
          descricao: infoDescricao.textContent,
          quantidade: quantidade,
          tipoMovimento: "ENTRADA",
          endereco: endereco,
          armazem: armazem,
          dataHora: new Date().toLocaleString('pt-BR'),
          usuario: usuario
        };
        
        setTimeout(() => {
          gerarEtiqueta(dadosEtiqueta);
        }, 500);
      }
      
      // atualiza informações e histórico
      await consultar(codigo);
      // limpa quantidade (opcional)
      quantidadeEl.value = "1";
    } catch (err) {
      statusEl.style.color = "#c00";
      statusEl.textContent = `Erro: ${err.message}`;
    }
  });
});