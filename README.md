# 🍯 Colmeia - Meus Roteiros

**Aplicação 100% Serverless na Vercel** - Frontend React + API Serverless Functions

## 📋 Visão Geral

Sistema de gestão de roteiros de mídia desenvolvido com React (Vite + TypeScript) no frontend e Node.js serverless functions no backend, totalmente hospedado na Vercel.

### 🏗️ Arquitetura

```
├── api/                    # 🚀 Serverless Functions (Vercel)
│   ├── debug.js           # Endpoint de debug/health check
│   ├── roteiros.js        # Listagem de roteiros paginada
│   ├── cidades.js         # Busca cidades por grupo
│   ├── semanas.js         # Busca semanas por desc_pk
│   ├── pivot-descpks.js   # Pivot de descrições
│   └── db.js              # Configuração do SQL Server
├── src/                   # 🎨 Frontend React
│   ├── components/        # Componentes reutilizáveis
│   ├── screens/           # Páginas principais
│   ├── icons/             # Ícones SVG
│   └── config/            # Configuração Axios
├── vercel.json            # ⚙️ Configuração Vercel (vazio = convenções padrão)
└── package.json           # 📦 Dependências e scripts
```

## 🚀 Deploy Rápido

**1 comando para publicar na Vercel:**

```bash
vercel --prod
```

## 🛠️ Desenvolvimento Local

### **Pré-requisitos**
- Node.js 18+
- Acesso ao SQL Server (variáveis de ambiente)

### **1. Configurar Variáveis de Ambiente**
Crie `.env.local` na raiz:
```env
DB_SERVER=seu_servidor_sql
DB_DATABASE=seu_banco
DB_USER=seu_usuario  
DB_PASSWORD=sua_senha
```

### **2. Instalar e Rodar**
```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
vercel dev
```

✅ **Acesse:** http://localhost:3000  
✅ **APIs:** http://localhost:3000/api/*

## 📡 API Endpoints

### **GET /api/debug**
```json
{
  "ok": true,
  "msg": "Debug endpoint funcionando!",
  "timestamp": "2025-07-10T12:17:52.052Z"
}
```

### **GET /api/roteiros?page=1**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 25,
    "totalItems": 1234,
    "pageSize": 50
  }
}
```

### **GET /api/cidades?grupo=GRUPO_ID**
```json
{
  "cidades": ["CIDADE1", "CIDADE2"],
  "nomeGrupo": "Nome do Grupo"
}
```

### **GET /api/semanas?desc_pk=123**
```json
{
  "semanas": [
    {"semanaInicial_vl": 1, "semanaFinal_vl": 4}
  ]
}
```

## 🗄️ Banco de Dados

**SQL Server** - Views utilizadas:
- `serv_product_be180.planoMidiaGrupo_dm_vw`
- Outras views relacionadas para cidades e semanas

## 📱 Frontend

**Tecnologias:**
- ⚛️ React 18 + TypeScript  
- 🏗️ Vite (build ultra-rápido)
- 🎨 Tailwind CSS
- 🧭 React Router
- 📡 Axios (requisições API)

**Páginas:**
- `/` - Lista de roteiros (tabela paginada)
- `/mapa?grupo=ID` - Visualização em mapa

## 🚀 Vercel Deploy

### **Configuração Automática**
```bash
# Deploy de produção
vercel --prod

# Deploy de preview
vercel
```

### **Variáveis de Ambiente na Vercel**
Configure no dashboard da Vercel:
- `DB_SERVER`
- `DB_DATABASE` 
- `DB_USER`
- `DB_PASSWORD`

### **URLs de Deploy**
- **Produção:** `https://colmeia-meusroteirosdefault.vercel.app`
- **Preview:** `https://colmeia-meusroteirosdefault-*.vercel.app`

## 🔧 Scripts Disponíveis

```bash
npm run dev      # Vite dev (apenas frontend)
npm run build    # Build para produção
npm run preview  # Preview do build local
vercel dev       # Desenvolvimento full-stack (recomendado)
```

## 📦 Dependências

**Frontend:**
- `react`, `react-dom`, `react-router-dom`
- `axios` (HTTP client)
- `tailwindcss` (CSS framework)

**Backend:**
- `mssql` (SQL Server driver)

**Dev:**
- `vite`, `typescript`
- `@types/*` (tipos TypeScript)

## 🎯 Funcionalidades

✅ **Listagem de roteiros paginada**  
✅ **Busca de cidades por grupo**  
✅ **Visualização de semanas**  
✅ **Interface responsiva**  
✅ **100% Serverless (Vercel)**  
✅ **TypeScript**  
✅ **Hot reload em desenvolvimento**

## 🔄 Fluxo de Desenvolvimento

1. **Desenvolvimento:** `vercel dev` (frontend + API local)
2. **Test:** Deploy preview com `vercel`  
3. **Produção:** Deploy com `vercel --prod`

## 🆘 Troubleshooting

### **API não funciona localmente**
```bash
# Verificar se vercel dev está rodando
vercel dev

# Testar endpoint
curl http://localhost:3000/api/debug
```

### **Erro de banco**
- Verificar variáveis de ambiente em `.env.local`
- Confirmar acesso ao SQL Server
- Verificar firewall/VPN

### **Build falha**
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

**💡 Dica:** Este projeto usa as convenções padrão da Vercel, mantendo a configuração mínima para máxima compatibilidade.
