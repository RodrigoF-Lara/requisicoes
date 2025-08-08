document.getElementById('csvForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files.length) {
        alert("Selecione um arquivo CSV primeiro!");
        return;
    }

    // Mostra animação de envio
    const statusElem = document.getElementById('status');
    let dots = 0;
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
                statusElem.textContent = `${response.message} (Inserido em: ${dataHora})`;
            })
            .catch(err => {
                clearInterval(animInterval);
                console.error(err);
                statusElem.textContent = "Erro ao enviar!";
            });
        }
    });
});
