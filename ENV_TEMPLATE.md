# 🔐 Template de Variáveis de Ambiente (.env)

Copie este conteúdo para o seu arquivo `.env` na raiz do projeto.

```bash
# ========================================
# 🔐 CREDENCIAIS DO BANCO DE DADOS SQL SERVER (Principal)
# ========================================

DB_SERVER=seu-servidor.database.windows.net
DB_DATABASE=seu-banco
DB_USER=seu-usuario
DB_PASSWORD=sua-senha

# ========================================
# 🔐 CREDENCIAIS DO BANCO DE ATIVOS (PostgreSQL)
# ========================================

POSTGRES_HOST=pg-be180-bancoativos-eastus2.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_DATABASE=banco_ativos_be180
POSTGRES_USER=readeruser_bancoativos
POSTGRES_PASSWORD=commons-unlucky-SIGHING427

# ========================================
# 🔐 DATABRICKS
# ========================================

DATABRICKS_URL=https://seu-databricks.azuredatabricks.net/api/2.1/jobs/run-now
DATABRICKS_AUTH_TOKEN=seu-token
DATABRICKS_JOB_ID=seu-job-id
DATABRICKS_JOB_ID_ROTEIRO_SIMULADO=seu-job-id-roteiro-simulado

# ========================================
# 🔐 AUTH0
# ========================================

# Frontend (VITE_*)
VITE_AUTH0_DOMAIN=seu-dominio.auth0.com
VITE_AUTH0_CLIENT_ID=seu-client-id
VITE_AUTH0_CALLBACK_URL=http://localhost:3000/callback
VITE_AUTH0_LOGOUT_URL=http://localhost:3000

# Backend (API)
AUTH0_DOMAIN=seu-dominio.auth0.com
AUTH0_CLIENT_ID=seu-client-id
```

## 📋 Instruções:

1. Crie um arquivo `.env` na raiz do projeto
2. Copie o conteúdo acima
3. Preencha as credenciais do SQL Server (DB_SERVER, DB_DATABASE, etc)
4. As credenciais do PostgreSQL já estão preenchidas com os novos valores
5. Preencha as credenciais do Databricks e Auth0 conforme necessário

## ⚠️ Importante:

- **NUNCA** commite o arquivo `.env` no Git
- O arquivo `.env` já está no `.gitignore`
- Use este template apenas como referência

