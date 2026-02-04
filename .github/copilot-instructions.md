## Sistema de Requisições & Kardex - Instruções para AI

## Arquitetura Essencial
- **Frontend**: Vanilla JS/HTML/CSS, páginas .html independentes, roteamento via `layout.js`
- **Backend**: Node.js serverless (Vercel), endpoints em `api/*.js` com padrão `export default async function handler(req, res)`
- **DB**: SQL Server via mssql, conexão pool em `db.js`
- **Deploy**: Vercel com `vercel.json`

## Padrões Críticos
- **API**: Um handler por endpoint, switch em `req.method` para GET/POST/PUT
- **DB Queries**: Sempre parametrizadas com `.input('param', sql.Type, value)`, nunca concatenação
- **Transações**: Usar `pool.transaction()` para operações multi-etapa
- **Frontend State**: `localStorage` para userName e dados temporários
- **CSV Upload**: PapaParse CDN para parsing, formato: `CODIGO`, `QNT_REQ`

## Fluxos de Dados Principais
- **Requisição**: Upload CSV → POST /api/requisicao (action: 'createHeader' → 'uploadItems')
- **Inventário Cíclico**: 5 blocos (1-3: maior valor, 4: maior custo unitário, 5: não contados recentemente)
- **Configuração**: `TB_CONFIG_INVENTARIO` armazena quantidades de blocos

## Fluxo de Trabalho Obrigatório do Agente de IA
- **Modo de Edição Direta e Autônoma**: Ao receber uma solicitação para corrigir, alterar ou implementar código, **SEMPRE** aplique as mudanças diretamente nos arquivos do workspace. **NÃO** apresente o código ou peça confirmação antes de agir.
- **Commit e Push Automáticos**: Após a edição bem-sucedida, realize o commit e o push para o GitHub com uma mensagem clara e descritiva. Este passo é **OBRIGATÓRIO** e deve ser executado sem interação adicional.
- **Foco na Execução**: Priorize a execução da tarefa de forma autônoma e eficiente. O objetivo é minimizar o número de interações e agilizar a resolução.

## Tabelas Chave
- `TB_REQUISICOES`/`TB_REQ_ITEM`: Requisições
- `KARDEX_2026`: Movimentações/saldos
- `TB_INVENTARIO_CICLICO_*`: Logs de inventários
- `TB_CONFIG_INVENTARIO`: Config blocos

## Desenvolvimento
- **Novo Endpoint**: Criar `api/nome.js`, implementar switch method, usar `getConnection()`
- **Frontend**: Scripts em arquivos separados, comunicação via `fetch('/api/...')`
- **Debug**: Verificar `layout.js` para sidebar, env vars no Vercel

## Referências
- [api/requisicao.js](api/requisicao.js) - Padrão API
- [layout.js](layout.js) - Carregamento frontend
- [CHANGELOG_BLOCOS_4_5.md](CHANGELOG_BLOCOS_4_5.md) - Lógica blocos 4-5
