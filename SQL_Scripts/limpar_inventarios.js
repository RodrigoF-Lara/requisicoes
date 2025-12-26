const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function limparInventarios() {
    try {
        const pool = await sql.connect(config);
        
        console.log('Conectado ao banco de dados!');
        
        // Limpa primeiro a tabela de itens (tem FK para a tabela de cabeçalho)
        await pool.request().query(`
            DELETE FROM [dbo].[TB_INVENTARIO_CICLICO_ITEM];
            PRINT 'Tabela TB_INVENTARIO_CICLICO_ITEM limpa!';
        `);
        
        console.log('✓ Tabela TB_INVENTARIO_CICLICO_ITEM limpa');
        
        // Depois limpa a tabela de cabeçalho
        await pool.request().query(`
            DELETE FROM [dbo].[TB_INVENTARIO_CICLICO];
            PRINT 'Tabela TB_INVENTARIO_CICLICO limpa!';
        `);
        
        console.log('✓ Tabela TB_INVENTARIO_CICLICO limpa');
        
        // Reseta o IDENTITY para começar do 1 novamente
        await pool.request().query(`
            DBCC CHECKIDENT ('[dbo].[TB_INVENTARIO_CICLICO_ITEM]', RESEED, 0);
            DBCC CHECKIDENT ('[dbo].[TB_INVENTARIO_CICLICO]', RESEED, 0);
            PRINT 'IDs resetados para começar do 1!';
        `);
        
        console.log('✓ IDs resetados');
        
        await pool.close();
        console.log('\n✅ Tabelas de inventário limpas com sucesso!');
        
    } catch (err) {
        console.error('❌ Erro ao limpar tabelas:', err);
    }
}

limparInventarios();
