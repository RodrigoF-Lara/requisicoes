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
    if (!codigo || quantidade <= 0) {
      statusEl.style.color = "#c00";
      statusEl.textContent = "Código e quantidade válidos são obrigatórios.";
      return;
    }
    statusEl.style.color = "#222";
    statusEl.textContent = "Registrando...";
    try {
      const body = { codigo, tipo, quantidade, usuario };
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erro ao registrar movimento");
      statusEl.style.color = "green";
      statusEl.textContent = data.message || "Movimento registrado";
      await consultar(codigo);
    } catch (err) {
      statusEl.style.color = "#c00";
      statusEl.textContent = `Erro: ${err.message}`;
    }
  });
});
