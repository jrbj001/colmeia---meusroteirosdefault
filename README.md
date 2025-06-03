

## Getting started

> **Prerequisites:**
> The following steps require [NodeJS](https://nodejs.org/en/) to be installed on your system, so please
> install it beforehand if you haven't already.

To get started with your project, you'll first need to install the dependencies with:

```
npm install
```

Then, you'll be able to run a development version of the project with:

```
npm run dev
```

After a few seconds, your project should be accessible at the address
[http://localhost:5173/](http://localhost:5173/)

## Configuração do Ambiente (.env e .env.local) / Environment Setup (.env and .env.local)

Antes de rodar o projeto localmente, crie um arquivo chamado `.env` na raiz do projeto com o seguinte conteúdo (preencha com suas credenciais):

Before running the project locally, create a file named `.env` in the project root with the following content (fill in with your credentials):

```env
DB_USER=seu_usuario / your_user
DB_PASSWORD=sua_senha / your_password
DB_SERVER=seu_servidor / your_server
DB_DATABASE=seu_banco / your_database

API_PORT=3001
NODE_ENV=development
```

Exemplo para Azure SQL / Example for Azure SQL:
```env
DB_USER=ReaderUser_be180
DB_PASSWORD=********
DB_SERVER=mct-serv-prd-0001.database.windows.net
DB_DATABASE=db-azr-sql-clients-0001
```

> **Atenção / Attention:**
> - Você pode precisar de VPN ou liberar seu IP no firewall do Azure SQL para acessar o banco.
> - You may need VPN or to whitelist your IP in Azure SQL firewall to access the database.

### Configuração do Frontend (.env.local)

Crie um arquivo `.env.local` na raiz do projeto para definir a URL da API usada pelo frontend:

```
VITE_API_URL=http://localhost:3001
```

No deploy de produção (Vercel), defina a variável de ambiente `VITE_API_URL` no painel da Vercel:

```
VITE_API_URL=https://seu-projeto.vercel.app/api
```

No código, a URL da API será acessada via:
```js
import.meta.env.VITE_API_URL
```

## Rodando o projeto localmente / Running the project locally

Para rodar o frontend e a API juntos:
To run both frontend and API together:

```bash
npm run dev:all
```

- O frontend estará em / The frontend will be at: [http://localhost:5173/](http://localhost:5173/)
- A API estará em / The API will be at: [http://localhost:3001/api/roteiros](http://localhost:3001/api/roteiros)

Se quiser rodar apenas o frontend:
```
npm run dev
```

Se quiser rodar apenas a API:
```
npm run start:api
```

If you are satisfied with the result, you can finally build the project for release with:

```
npm run build
```

# Deploy na Vercel

## Passos para Deploy

1. Suba seu código para o repositório remoto (GitHub, GitLab, etc).
2. Importe o projeto na Vercel.
3. Configure as variáveis de ambiente na dashboard da Vercel:
   - DB_USER
   - DB_PASSWORD
   - DB_SERVER
   - DB_DATABASE
   - NODE_ENV=production
   - VITE_API_URL=https://seu-projeto.vercel.app/api
4. Use o seguinte comando de build na Vercel:

```
npm run build
```

A Vercel irá rodar o build do front-end e copiar a API para a pasta correta.

5. O diretório de saída do front-end é `dist`.
6. A API ficará disponível em `/api/roteiros`.

Se precisar de mais detalhes, consulte o assistente ou a documentação oficial da Vercel.
