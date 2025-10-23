# Configuração Auth0 - Colmeia Meus Roteiros

## Variáveis de Ambiente Necessárias

### Desenvolvimento (.env.local)
```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=dev-ifwxyydb3sdagewa.us.auth0.com
VITE_AUTH0_CLIENT_ID=D3N80da7fRYBfAZaWtvhFH4k3kAZ3MSp
AUTH0_CLIENT_SECRET=8-XuRLcHSeuHA9fu6LFyHd7MeRUzAcUDgbglvycEA-d-IYK3MqB7q3r2xq8Y0wSw

# URLs de Desenvolvimento
VITE_AUTH0_CALLBACK_URL=http://localhost:3000/callback
VITE_AUTH0_LOGOUT_URL=http://localhost:3000
```

### Produção (Vercel)
```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=dev-ifwxyydb3sdagewa.us.auth0.com
VITE_AUTH0_CLIENT_ID=D3N80da7fRYBfAZaWtvhFH4k3kAZ3MSp
AUTH0_CLIENT_SECRET=8-XuRLcHSeuHA9fu6LFyHd7MeRUzAcUDgbglvycEA-d-IYK3MqB7q3r2xq8Y0wSw

# URLs de Produção
VITE_AUTH0_CALLBACK_URL=https://colmeia-meusroteirosdefault.vercel.app/callback
VITE_AUTH0_LOGOUT_URL=https://colmeia-meusroteirosdefault.vercel.app
```

## Configuração no Auth0 Dashboard

### Application Settings
- **Domain**: `dev-ifwxyydb3sdagewa.us.auth0.com`
- **Client ID**: `D3N80da7fRYBfAZaWtvhFH4k3kAZ3MSp`
- **Client Secret**: `8-XuRLcHSeuHA9fu6LFyHd7MeRUzAcUDgbglvycEA-d-IYK3MqB7q3r2xq8Y0wSw`

### Allowed Callback URLs
```
http://localhost:3000/callback
https://colmeia-meusroteirosdefault.vercel.app/callback
```

### Allowed Logout URLs
```
http://localhost:3000
https://colmeia-meusroteirosdefault.vercel.app
```

### Allowed Web Origins
```
http://localhost:3000
https://colmeia-meusroteirosdefault.vercel.app
```

## Configuração no Vercel

1. Acesse o dashboard do Vercel
2. Vá para o projeto "colmeia-meusroteirosdefault"
3. Vá em Settings > Environment Variables
4. Adicione as seguintes variáveis:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_AUTH0_DOMAIN` | `dev-ifwxyydb3sdagewa.us.auth0.com` | Production, Preview, Development |
| `VITE_AUTH0_CLIENT_ID` | `D3N80da7fRYBfAZaWtvhFH4k3kAZ3MSp` | Production, Preview, Development |
| `AUTH0_CLIENT_SECRET` | `8-XuRLcHSeuHA9fu6LFyHd7MeRUzAcUDgbglvycEA-d-IYK3MqB7q3r2xq8Y0wSw` | Production, Preview, Development |
| `VITE_AUTH0_CALLBACK_URL` | `https://colmeia-meusroteirosdefault.vercel.app/callback` | Production |
| `VITE_AUTH0_LOGOUT_URL` | `https://colmeia-meusroteirosdefault.vercel.app` | Production |

## Funcionalidades Implementadas

### Frontend
- ✅ Auth0Provider configurado
- ✅ Tela de login com Auth0 e fallback local
- ✅ Rotas protegidas
- ✅ Logout integrado
- ✅ Callback page para Auth0
- ✅ Hook para obter tokens

### Backend
- ✅ Middleware de autenticação para API routes
- ✅ Validação de tokens JWT do Auth0
- ✅ Suporte a tokens locais (desenvolvimento)
- ✅ API de exemplo protegida (`/api/user-profile`)

## Como Testar

### Desenvolvimento
1. Configure as variáveis no `.env.local`
2. Execute `vercel dev`
3. Acesse `http://localhost:3000`
4. Teste o login Auth0 e o login local

### Produção
1. Configure as variáveis no Vercel
2. Faça deploy
3. Teste o login Auth0 em produção

## Próximos Passos

1. Configurar usuários no Auth0
2. Implementar regras de autorização
3. Adicionar mais APIs protegidas
4. Configurar refresh tokens se necessário
