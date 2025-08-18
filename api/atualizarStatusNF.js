// filepath: api/atualizarStatusNF.js
import { getConnection, closeConnection } from "./db.js";
import sql from "mssql";

export default async function handler(req, res) {
    console.log(`DIAGNÓSTICO: Endpoint /api/atualizarStatusNF foi chamado com o método ${req.method}`);

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Método não permitido" });
    }

    const { nf, codigo, processo, usuario } = req.body;

    if (!nf || !codigo || !processo || !usuario) {
        return res.status(400).json({ message: "Todos os campos (nf, codigo, processo, usuario) são obrigatórios." });
    }

    try {
        const pool = await getConnection();
        
        // --- ALTERAÇÃO APLICADA AQUI ---
        // Adicionamos a opção 'timeZone' para forçar o fuso horário de Brasília (UTC-3)
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false,
            timeZone: 'America/Sao_Paulo' // <-- Linha adicionada para corrigir o fuso
        });

        // O objeto "new Date()" para a coluna DT é interpretado corretamente pelo driver do SQL Server,
        // mas a formatação da string de hora precisava do ajuste explícito de fuso.
        await pool.request()
            .input('NF', sql.NVarChar, nf)
            .input('CODIGO', sql.NVarChar, codigo)
            .input('USUARIO', sql.NVarChar, usuario)
            .input('DT', sql.Date, new Date())
            .input('HH', sql.NVarChar, horaAtual)
            .input('PROCESSO', sql.NVarChar, processo)
            .query(`
                INSERT INTO [dbo].[TB_LOG_NF] 
                ([NF], [CODIGO], [USUARIO], [DT], [HH], [PROCESSO])
                VALUES 
                (@NF, @CODIGO, @USUARIO, @DT, @HH, @PROCESSO);
            `);

        res.status(200).json({ message: `Status da NF ${nf} / Produto ${codigo} atualizado para "${processo}" com sucesso!` });

    } catch (err) {
        console.error("ERRO NO ENDPOINT /api/atualizarStatusNF:", err);
        res.status(500).json({ message: "Erro ao inserir novo log de NF", error: err.message });
    } finally {
        await closeConnection();
    }
}