// ... código do login ...
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const usuario = document.getElementById('usuario').value;
    const pw = document.getElementById('pw').value;
    const status = document.getElementById('loginStatus');
    status.textContent = "Verificando...";

    try {
        const res = await fetch("https://requisicoes-five.vercel.app/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, pw })
        });
        const data = await res.json();
        if (res.ok && data.usuario) {
            status.style.color = "green";
            status.textContent = `Bem-vindo, ${data.usuario.F_NAME} ${data.usuario.L_NAME}!`;
            // Troca para tela de upload
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('uploadScreen').style.display = '';
        } else {
            status.style.color = "#c00";
            status.textContent = data.message || "Usuário ou senha inválidos.";
        }
    } catch (err) {
        status.style.color = "#c00";
        status.textContent = "Erro ao conectar ao servidor.";
    }
});

// ...restante do seu script.js (upload, teste de conexão etc)...
