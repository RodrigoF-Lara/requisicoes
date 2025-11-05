// Carrega o menu-lateral.html (se existir) e inicializa comportamento do sidebar
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
      // Fallback simples caso o arquivo não exista
      sidebarContainer.innerHTML = `
        <div class="sidebar-brand">Kardex System</div>
        <div class="user-panel">
          <div class="user-icon"><i class="fa fa-user-circle"></i></div>
          <div class="user-info"><div id="sidebar-username">Usuário</div></div>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li><a id="nav-menu" href="menu.html"><i class="fa fa-home"></i> Menu Principal</a></li>
            <li><a id="nav-nova-requisicao" href="nova-requisicao.html"><i class="fa fa-plus-square"></i> Nova Requisição</a></li>
            <li><a id="nav-consultar" href="consultar.html"><i class="fa fa-search"></i> Consultar</a></li>
            <li><a id="nav-estoque" href="estoque.html"><i class="fa fa-archive"></i> Gerenciar Estoque</a></li>
            <li><a id="nav-status-nf" href="status-nf.html"><i class="fa fa-barcode"></i> Status NF</a></li>
          </ul>
        </nav>
        <div class="sidebar-footer"><button id="logout-btn" class="logout-btn">Sair</button></div>
      `;
      inicializarSidebar();
    });
});

function inicializarSidebar() {
  // mostra usuário
  const userName = localStorage.getItem('userName');
  const usernameEl = document.getElementById('sidebar-username');
  if (usernameEl) usernameEl.textContent = userName || 'Usuário';

  // destaca link ativo
  const filename = (window.location.pathname.split('/').pop() || 'menu.html').toLowerCase();
  const pageKey = filename.replace('.html', '') || 'menu';
  // mapeamento simples para ids (caso nomes de arquivo diferentes)
  const idMap = {
    'menu': 'nav-menu',
    'nova-requisicao': 'nav-nova-requisicao',
    'consultar': 'nav-consultar',
    'estoque': 'nav-estoque',
    'status-nf': 'nav-status-nf',
    'index': 'nav-menu'
  };
  const navId = idMap[pageKey] || `nav-${pageKey}`;
  const navLink = document.getElementById(navId);
  if (navLink) navLink.classList.add('active');

  // logout
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