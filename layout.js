document.addEventListener('DOMContentLoaded', function() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        fetch('menu-lateral.html')
            .then(response => response.text())
            .then(data => {
                sidebarContainer.innerHTML = data;
                inicializarSidebar();
            });
    }
});

function inicializarSidebar() {
    // Exibe o nome do usuário
    const userName = localStorage.getItem('userName');
    if (userName) {
        document.getElementById('sidebar-username').textContent = userName;
    } else {
        window.location.href = "index.html"; // Redireciona se não estiver logado
    }

    // Destaca o link da página atual
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const navLink = document.getElementById(`nav-${currentPage}`);
    if (navLink) {
        navLink.classList.add('active');
    }

    // Adiciona funcionalidade de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Tem certeza que deseja sair?')) {
                localStorage.removeItem('userName');
                localStorage.removeItem('loginTime');
                window.location.href = 'index.html';
            }
        });
    }
}