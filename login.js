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
            // Redirecionar ou salvar token, se necessário
        } else {
            status.style.color = "#c00";
            status.textContent = data.message || "Usuário ou senha inválidos.";
        }
    } catch (err) {
        status.style.color = "#c00";
        status.textContent = "Erro ao conectar ao servidor.";
    }
});
