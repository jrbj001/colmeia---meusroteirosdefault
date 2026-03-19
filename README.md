# Colmeia - Meus Roteiros

Aplicacao 100% Serverless na Vercel — Frontend React + API Serverless Functions.

Sistema de gestao de roteiros de midia desenvolvido com React (Vite + TypeScript) no frontend e Node.js serverless functions no backend.

## Arquitetura

```
colmeia---meusroteirosdefault/
├── api/                        # 10 Serverless Function Routers (Vercel)
│   ├── roteiros.js             # Listagem, busca, delete, status, simulado (7 handlers)
│   ├── plano-midia.js          # Criar plano, desc, grupo, cleanup (6 handlers)
│   ├── uploads.js              # Upload roteiros, pontos unicos (4 handlers)
│   ├── databricks.js           # Run job, roteiro simulado (2 handlers)
│   ├── mapa.js                 # Cidades, semanas, hexagonos, pontos (6 handlers)
│   ├── reports.js              # Indicadores, matrix data (11 handlers)
│   ├── banco-ativos.js         # Dashboard, mapa, busca, relatorios (5 handlers)
│   ├── referencia.js           # Agencia, marca, target, cidades (15 handlers)
│   ├── admin.js                # Usuarios, perfis, permissoes (6 handlers)
│   └── integracoes.js          # SharePoint, endereco, user-profile (3 handlers)
│
├── handlers/                   # Logica de negocio (65 handlers + 3 utilitarios)
│   ├── db.js                   # Pool de conexao SQL Server
│   ├── auth-middleware.js       # Middleware de autenticacao JWT
│   ├── banco-ativos-passantes.js  # Pool PostgreSQL
│   ├── roteiros.js             # Handler: listar roteiros
│   ├── cidades.js              # Handler: buscar cidades
│   └── ...                     # (demais handlers)
│
├── src/                        # Frontend React
│   ├── components/             # Componentes reutilizaveis
│   ├── screens/                # Paginas da aplicacao
│   ├── hooks/                  # Custom hooks
│   ├── contexts/               # React contexts (Auth)
│   ├── config/                 # Configuracao Axios
│   ├── icons/                  # Icones SVG
│   └── index.tsx               # Entry point + rotas
│
├── public/                     # Assets estaticos
├── docs/                       # Documentacao tecnica
├── sql/                        # Scripts SQL e procedures
├── vercel.json                 # Configuracao Vercel (rewrites, functions)
└── package.json                # Dependencias e scripts
```

### Como funciona o roteamento

Cada router em `api/` recebe um parametro `?action=` via rewrites do `vercel.json` e despacha para o handler correspondente em `handlers/`:

```
Frontend: GET /api/roteiros-search?q=teste
  → Vercel rewrite: /api/roteiros?action=search&q=teste
    → api/roteiros.js: dispatch para handlers/roteiros-search.js
```

Os 68 handlers originais estao em `handlers/` sem nenhuma modificacao — apenas os 10 routers em `api/` sao deployados como serverless functions.

## Desenvolvimento Local

### Pre-requisitos
- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- Acesso ao SQL Server e PostgreSQL (variaveis de ambiente)

### Configurar

```bash
# Instalar dependencias
npm install

# Criar .env na raiz (veja docs/ENV_TEMPLATE.md)
```

### Rodar

```bash
# Desenvolvimento full-stack (recomendado)
vercel dev

# Acesse http://localhost:3000
```

## Deploy

```bash
# Preview
vercel

# Producao
vercel --prod
```

### Variaveis de Ambiente (Vercel Dashboard)

**SQL Server:**
- `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`

**PostgreSQL (Banco de Ativos):**
- `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`

**Databricks:**
- `DATABRICKS_URL`, `DATABRICKS_JOB_ID`, `DATABRICKS_AUTH_TOKEN`

**Azure/SharePoint:**
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`

## Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Leaflet, Axios

**Backend:** Node.js Serverless Functions, mssql, pg, jsonwebtoken, xlsx

**Infra:** Vercel (hosting + serverless), SQL Server, PostgreSQL, Databricks, SharePoint

## Scripts

```bash
npm run dev      # Vite dev (apenas frontend)
npm run build    # Build para producao
npm run preview  # Preview do build local
vercel dev       # Full-stack local (recomendado)
```
