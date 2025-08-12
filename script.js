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

    // Obtém o ID_REQ do elemento requisicaoStatus
    const requisicaoStatus = document.getElementById('requisicaoStatus');
    const idReqMatch = requisicaoStatus.textContent.match(/ID: (\d+)/);
    const idReq = idReqMatch ? parseInt(idReqMatch[1], 10) : null;

    if (!idReq) {
        clearInterval(animInterval);
        statusElem.style.color = "#c00";
        statusElem.textContent = "ID da requisição não encontrado. Crie a requisição primeiro!";
        return;
    }

    Papa.parse(fileInput.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            fetch("https://requisicoes-five.vercel.app/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: results.data, idReq: idReq }) // Envia o ID_REQ
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