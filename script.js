// --- UPLOAD CSV ---
document.getElementById('csvForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files.length) {
        alert("Selecione um arquivo CSV primeiro!");
        return;
    }

    // Animação "Enviando..."
    const statusElem = document.getElementById('status');
    let dots = 0;
    statusElem.style.color = "#222";
    statusElem.textContent = "Enviando";
    const animInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        statusElem.textContent = "Enviando" + ".".repeat(dots);
    }, 500);

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            fetch("https://requisicoes-five.vercel.app/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: results.data })
            })
            .then(res => res.json())
            .then(response => {
                clearInterval(animInterval);
                const now = new Date();
                const dataHora = now.toLocaleString('pt-BR');
                statusElem.style.color = "green";
                statusElem.textContent = `${response.message} (Inserido em: ${dataHora})`;
            })
            .catch(err => {
                clearInterval(animInterval);
                console.error(err);
                statusElem.style.color = "#c00";
                statusElem.textContent = "Erro ao enviar!";
            });
        }
    });
});

// --- TESTE DE CONEXÃO ---
document.getElementById('testConnectionBtn').addEventListener('click', function() {
    const statusSpan = document.getElementById('connectionStatus');
    statusSpan.style.color = "#222";
    statusSpan.textContent = "Testando...";
    fetch("https://requisicoes-five.vercel.app/api/upload", {
        method: "GET"
    })
    .then(async res => {
        let msg = `Status: ${res.status} ${res.statusText}`;
        try {
            const data = await res.json();
            msg += data.message ? ` | Resposta: ${data.message}` : '';
        } catch (e) {
            // Não é JSON ou não tem mensagem
        }
        if (res.ok) {
            statusSpan.style.color = "green";
            statusSpan.textContent = "Conexão OK! " + msg;
        } else {
            statusSpan.style.color = "#c00";
            statusSpan.textContent = "Falha na conexão! " + msg;
        }
    })
    .catch(err => {
        statusSpan.style.color = "#c00";
        statusSpan.textContent = "Erro ao conectar! Detalhes: " + err;
    });
});