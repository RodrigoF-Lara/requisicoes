document.getElementById('csvForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const fileInput = document.getElementById('csvFile');
    const dtNecessidade = document.getElementById('dtNecessidade').value;
    const prioridade = document.getElementById('prioridade').value;
    const statusElem = document.getElementById('status');
    const aguardeAnimacao = document.getElementById('aguardeAnimacao');

    if (!fileInput.files.length || !dtNecessidade || !prioridade) {
        statusElem.style.color = "#c00";
        statusElem.textContent = "Preencha todos os campos e selecione um arquivo CSV!";
        return;
    }

    aguardeAnimacao.style.display = "block";
    statusElem.style.color = "#222";
    statusElem.textContent = "Enviando";
    let dots = 0;
    const animInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        statusElem.textContent = "Enviando" + ".".repeat(dots);
    }, 500);

    const userName = localStorage.getItem('userName');

    try {
        // Criar a requisição
        const responseNovaReq = await fetch("https://requisicoes-five.vercel.app/api/novaRequisicao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dtNecessidade, prioridade, solicitante: userName })
        });

        const dataNovaReq = await responseNovaReq.json();

        if (!responseNovaReq.ok) {
            throw new Error(dataNovaReq.message || "Erro ao criar requisição");
        }

        const idReq = dataNovaReq.idReq;

        // Upload do CSV
        Papa.parse(fileInput.files[0], {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                try {
                    const responseUpload = await fetch("https://requisicoes-five.vercel.app/api/upload", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ data: results.data, idReq: idReq })
                    });

                    const dataUpload = await responseUpload.json();

                    if (!responseUpload.ok) {
                        throw new Error(dataUpload.message || "Erro ao enviar CSV");
                    }

                    clearInterval(animInterval);
                    const now = new Date();
                    const dataHora = now.toLocaleString('pt-BR');
                    statusElem.style.color = "green";
                    statusElem.textContent = `${dataUpload.message} (Requisição #${idReq} - Inserido em: ${dataHora})`;

                } catch (error) {
                    clearInterval(animInterval);
                    console.error(error);
                    statusElem.style.color = "#c00";
                    statusElem.textContent = `Erro ao enviar CSV: ${error.message}`;
                } finally {
                    aguardeAnimacao.style.display = "none";
                }
            }
        });

    } catch (error) {
        clearInterval(animInterval);
        console.error(error);
        statusElem.style.color = "#c00";
        statusElem.textContent = `Erro ao criar requisição: ${error.message}`;
        aguardeAnimacao.style.display = "none";
    }
});