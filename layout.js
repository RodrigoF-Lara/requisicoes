// Carrega menu-lateral.html (se existir) e inicializa comportamento do sidebar
document.addEventListener('DOMContentLoaded', function () {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  fetch('menu-lateral.html')
    .then(response => {
      if (!response.ok) throw new Error('menu-lateral.html não encontrado');
      return response.text();
    })
    .then(html => {
      sidebarContainer.innerHTML = html;
      inicializarSidebar();
    })
    .catch(err => {
      console.error('Falha ao carregar menu-lateral.html:', err);
      // Fallback sincronizado com nomes existentes no projeto
      sidebarContainer.innerHTML = `
        <div class="sidebar-header"><h3>SGC - Sistema de Gestão Customic</h3></div>
        <div class="sidebar-user-info"><span id="sidebar-username">Usuário</span></div>
        <nav class="sidebar-nav">
          <a href="menu.html" id="nav-menu"><i class="fa fa-home"></i> Menu Principal</a>
          <a href="nova-requisicao.html" id="nav-nova-requisicao"><i class="fa fa-plus-square"></i> Nova Requisição</a>
          <a href="consultar.html" id="nav-consultar"><i class="fa fa-search"></i> Consultar</a>
          <a href="estoque.html" id="nav-estoque"><i class="fa fa-archive"></i> Gerenciar Estoque</a>
          <a href="status-nf.html" id="nav-status-nf"><i class="fa fa-barcode"></i> Status NF</a>
        </nav>
        <div class="sidebar-footer"><button id="logout-btn" class="logout-btn">Sair</button></div>
      `;
      inicializarSidebar();
    });
});

function inicializarSidebar() {
  const userName = localStorage.getItem('userName');
  const usernameEl = document.getElementById('sidebar-username');
  if (usernameEl) usernameEl.textContent = userName || 'Usuário';

  const filename = (window.location.pathname.split('/').pop() || 'menu.html').toLowerCase();
  const pageKey = filename.replace('.html', '') || 'menu';
  const idMap = {
    'menu': 'nav-menu',
    'nova-requisicao': 'nav-nova-requisicao',
    'consultar': 'nav-consultar',
    'estoque': 'nav-estoque',
    'status-nf': 'nav-status-nf',
    'inventariociclico': 'nav-inventario-ciclico',
    'index': 'nav-menu'
  };
  const navId = idMap[pageKey] || `nav-${pageKey}`;
  const navLink = document.getElementById(navId);
  if (navLink) navLink.classList.add('active');

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