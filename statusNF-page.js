document.addEventListener('DOMContentLoaded', function() {
    // ... (outras constantes do topo do arquivo)

    // --- NOVA FUNÇÃO HELPER ---
    /**
     * Formata uma data ISO (ex: "2025-08-18T00:00:00.000Z") para o formato "dd/mm/yyyy".
     * Trata a data como UTC para evitar problemas de fuso horário que fazem a data "voltar" um dia.
     * @param {string} dateString A data no formato ISO.
     * @returns {string} A data formatada.
     */
    function formatarDataUTC(dateString) {
        if (!dateString) return 'N/A';
        // O construtor new Date() com a string ISO pode ajustar para o fuso local.
        // Ao adicionar 'T00:00:00', garantimos que estamos lidando com o início do dia.
        // O timeZone: 'UTC' força a formatação sem conversão de fuso.
        const data = new Date(dateString);
        return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    // ...

    // Função renderTable ATUALIZADA
    function renderTable(data) {
        // ... (início da função)
        data.forEach(item => {
            // AQUI ESTÁ A MUDANÇA
            const dataFormatada = formatarDataUTC(item.DT);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.NF}</td><td>${item.CODIGO}</td><td>${item.USUARIO}</td>
                <td>${dataFormatada}</td><td>${item.HH}</td><td>${item.PROCESSO}</td>
                <td class="actions-cell">
                    </td>`;
            tbody.appendChild(tr);
        });
        container.appendChild(table);
    }
    
    // ...
    
    // Função fetchAndDisplayLog ATUALIZADA
    async function fetchAndDisplayLog(nf, codigo) {
        logContent.innerHTML = `<div class="loader"></div>`;
        try {
            // ... (fetch)
            const logData = await response.json();
            // ... (verificação de logData.length)
            
            logContent.innerHTML = `
                <table id="logTable">
                    <thead><tr><th>Data</th><th>Hora</th><th>Usuário</th><th>Processo</th></tr></thead>
                    <tbody>
                        ${logData.map(entry => `
                            <tr>
                                <td>${formatarDataUTC(entry.DT)}</td>
                                <td>${entry.HH}</td>
                                <td>${entry.USUARIO}</td>
                                <td>${entry.PROCESSO}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        } catch (error) {
            logContent.innerHTML = `<p class="error-message">Erro ao carregar histórico: ${error.message}</p>`;
        }
    }

    // ... (Restante do seu código JavaScript)
});