# Colmeia Meus Roteiros - Guia Completo

## Pré-requisitos

- [NodeJS](https://nodejs.org/en/) instalado na máquina.
- Conta na [Vercel](https://vercel.com/) para deploy.

---

## 1. Instalação

```bash
npm install
```

---

## 2. Configuração de Ambiente

### Backend (.env)

Crie um arquivo `.env` na raiz com:

```env
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_SERVER=seu_servidor
DB_DATABASE=seu_banco
NODE_ENV=development
```

### Frontend (.env.local)

Para desenvolvimento local, crie `.env.local` na raiz com:

```
VITE_API_URL=/api
```

> **Em produção (Vercel), defina `VITE_API_URL=https://seu-projeto.vercel.app/api` nas variáveis de ambiente do painel da Vercel.**

---

## 3. Modos de Execução

### **A) Desenvolvimento Local (Frontend + Backend separados, hot reload)**

1. **Terminal 1:**  
   ```bash
   vercel dev
   ```
   (roda o backend serverless e simula o ambiente Vercel em http://localhost:3000)

2. **Terminal 2:**  
   ```bash
   npm run dev
   ```
   (roda o frontend Vite em http://localhost:5173)

- O proxy do Vite já está configurado para redirecionar `/api` para o backend.

---

### **B) Testar o Build de Produção Localmente**

1. Gere o build:
   ```bash
   npm run build
   ```
2. Rode o preview:
   ```bash
   npm run preview
   ```
3. Acesse: [http://localhost:4173](http://localhost:4173)

> **Obs:** O backend serverless não é simulado nesse modo, apenas o frontend estático.

---

### **C) Simular Ambiente Vercel Localmente**

```bash
vercel dev
```
- Tudo disponível em [http://localhost:3000](http://localhost:3000)
- Frontend e backend (API) juntos, igual produção.

---

## 4. Deploy na Vercel

1. Suba o código para o GitHub/GitLab.
2. Importe o projeto na Vercel.
3. Configure as variáveis de ambiente:
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_SERVER`
   - `DB_DATABASE`
   - `NODE_ENV=production`
   - `VITE_API_URL=https://seu-projeto.vercel.app/api`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy!

---

## 5. Dicas e Restrições

- **Nunca coloque segredos no frontend** (qualquer variável começando com `VITE_` vai para o browser).
- Sempre use `/api` como base para chamadas no frontend.
- O backend só funciona como serverless na Vercel ou com `vercel dev` localmente.
- Para rodar tudo igual produção, sempre use `vercel dev`.

---

## 6. Testando a API

- Teste endpoints com:
  ```bash
  curl http://localhost:3000/api/roteiros
  ```
- O frontend deve consumir a API via `/api/roteiros`.

---

Se seguir este guia, seu projeto funcionará igual localmente e em produção na Vercel!
