// Dentro de statusNF-page.js

function renderTable(data) {
    container.innerHTML = '';
    if (data.length === 0) {
        container.innerHTML = '<p class="info-message">Nenhum registro encontrado com os filtros aplicados.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'consulta-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>NF</th><th>Código</th><th>Descrição</th><th>Usuário</th><th>Data</th><th>Hora</th><th>Último Status</th><th>Ações</th>
            </tr>
        </thead>
        <tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    data.forEach(item => {
        const dataFormatada = formatarDataUTC(item.DT);
        const tr = document.createElement('tr');
        // --- CÓDIGO ATUALIZADO AQUI ---
        // Adicionamos 'data-label' a cada <td> para a responsividade
        tr.innerHTML = `
            <td data-label="NF">${item.NF}</td>
            <td data-label="Código">${item.CODIGO}</td>
            <td data-label="Descrição">${item.DESCRICAO || 'N/A'}</td>
            <td data-label="Usuário">${item.USUARIO}</td>
            <td data-label="Data">${dataFormatada}</td>
            <td data-label="Hora">${item.HH}</td>
            <td data-label="Último Status">${item.PROCESSO}</td>
            <td class="actions-cell" data-label="Ações">
                <button class="btn-detalhes btn-update" 
                        data-nf="${item.NF}" 
                        data-codigo="${item.CODIGO}" 
                        data-id-nf="${item.ID_NF}" 
                        data-id-nf-prod="${item.ID_NF_PROD}" 
                        title="Alterar Status">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-detalhes btn-log" 
                        data-nf="${item.NF}" 
                        data-codigo="${item.CODIGO}" 
                        title="Ver Histórico">
                    <i class="fa-solid fa-list-ul"></i>
                </button>
            </td>`;
        tbody.appendChild(tr);
    });
    container.appendChild(table);
}