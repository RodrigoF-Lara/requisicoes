document.getElementById('csvForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files.length) {
        alert("Selecione um arquivo CSV primeiro!");
        return;
    }

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            fetch("https://SEU-BACKEND-VERCEL.vercel.app/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: results.data })
            })
            .then(res => res.json())
            .then(response => {
                document.getElementById('status').textContent = response.message;
            })
            .catch(err => {
                console.error(err);
                document.getElementById('status').textContent = "Erro ao enviar!";
            });
        }
    });
});
// ...existing code...

// Código para testar conexão
document.getElementById('testConnectionBtn').addEventListener('click', function() {
    const statusSpan = document.getElementById('connectionStatus');
    statusSpan.textContent = "Testando...";
    fetch("https://SEU-BACKEND-VERCEL.vercel.app/api/upload", {
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
            statusSpan.textContent = "Conexão OK! " + msg;
        } else {
            statusSpan.textContent = "Falha na conexão! " + msg;
        }
    })
    .catch(err => {
        statusSpan.textContent = "Erro ao conectar! Detalhes: " + err;
    });
});

