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

document.getElementById('testConnectionBtn').addEventListener('click', function() {
    document.getElementById('connectionStatus').textContent = "Testando...";
    fetch("https://SEU-BACKEND-VERCEL.vercel.app/api/upload", {
        method: "GET"
    })
    .then(res => {
        if (res.ok) {
            document.getElementById('connectionStatus').textContent = "Conexão OK!";
        } else {
            document.getElementById('connectionStatus').textContent = "Falha na conexão!";
        }
    })
    .catch(() => {
        document.getElementById('connectionStatus').textContent = "Erro ao conectar!";
    });
});

