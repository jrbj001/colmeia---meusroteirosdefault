# 📊 Integração SharePoint - Download de Excel

## 📝 Resumo da Implementação

Esta integração permite baixar arquivos Excel diretamente do SharePoint usando o Microsoft Graph API.

## 🏗️ Arquitetura

### Fluxo de Dados

1. **Frontend** (`CriarRoteiro.tsx`) → Usuário clica em "📊 Download Excel"
2. **API** (`/api/sharepoint-download.js`) → Autentica no Azure AD e busca arquivo
3. **SharePoint** → Retorna arquivo filtrado por `planoMidiaGrupo_pk`
4. **Frontend** → Inicia download no navegador do usuário

### Arquivos Modificados/Criados

1. ✨ **NOVO**: `/api/sharepoint-download.js` - API serverless para integração SharePoint
2. ✏️ `package.json` - Adicionada dependência `@azure/msal-node`
3. ✏️ `src/screens/CriarRoteiro/CriarRoteiro.tsx` - Nova função de download do SharePoint

## 🔧 Configuração

### Variáveis de Ambiente (.env)

As seguintes variáveis devem estar configuradas no arquivo `.env`:

```bash
# Azure AD App Registration
AZURE_TENANT_ID=521338e4-1985-4bc5-be73-fabc0305ffb1
AZURE_CLIENT_ID=a7cf9191-9aa0-4abf-9d0e-fede5d44badc
AZURE_OBJECT_ID=60368e17-d320-4952-9f51-ee7a2bf90360
AZURE_CLIENT_SECRET={sua_senha_do_1password}

# SharePoint Configuration
SHAREPOINT_SITE_URL=https://be180.sharepoint.com/sites/colmeia
SHAREPOINT_LIBRARY_NAME=colmeia_powerBiExcel
SHAREPOINT_LIBRARY_ID=986c6f5f-ed4f-4ca4-b5f8-c4a05524abe0
```

## 🧪 Como Testar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar Servidor de Desenvolvimento

```bash
vercel dev
```

### 3. Acessar a Aplicação

1. Abra o navegador em `http://localhost:3000`
2. Faça login na aplicação
3. Navegue até **Meus Roteiros**
4. Clique em um roteiro existente para visualizar
5. Vá até a **Aba 6 - Visualizar Resultados**
6. Clique no botão **"📊 Download Excel"**

### 4. Verificar o Download

O arquivo Excel será baixado automaticamente com o nome:
```
Roteiro_Completo_{planoMidiaGrupo_pk}_{data}.xlsx
```

## 🔍 Troubleshooting

### Erro 404 - Arquivo não encontrado

**Causa**: Não existe arquivo no SharePoint com o `planoMidiaGrupo_pk` especificado.

**Solução**:
- Verifique se o arquivo foi carregado no SharePoint
- Confirme se a coluna `planoMidiaGrupo_pk` está preenchida corretamente
- Use o `planoMidiaGrupo_pk` de teste: `6406`

### Erro 500 - Erro no servidor

**Causa**: Problema na autenticação Azure ou configuração incorreta.

**Solução**:
- Verifique se `AZURE_CLIENT_SECRET` está configurado no `.env`
- Confirme as credenciais no 1Password
- Verifique os logs do servidor com `vercel dev`

### Erro CORS

**Causa**: Problema de CORS entre frontend e API.

**Solução**:
- A API já está configurada com headers CORS adequados
- Se persistir, verifique se está usando `vercel dev` (não `npm run dev`)

## 📊 API Endpoint

### POST `/api/sharepoint-download`

**Request Body**:
```json
{
  "planoMidiaGrupo_pk": 6406
}
```

**Response**:
- **200**: Stream do arquivo Excel (binary)
- **404**: Arquivo não encontrado
- **500**: Erro no servidor

**Headers de Response**:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="nome_arquivo.xlsx"
```

## 🔐 Segurança

- ✅ Credenciais armazenadas em variáveis de ambiente
- ✅ Autenticação via Azure AD
- ✅ Tokens de acesso temporários
- ✅ CORS configurado adequadamente
- ✅ Validação de parâmetros

## 📚 Tecnologias Utilizadas

- **@azure/msal-node**: Autenticação Microsoft Azure AD
- **Microsoft Graph API**: Acesso ao SharePoint
- **Axios**: Requisições HTTP
- **Vercel Serverless Functions**: Execução serverless

## ⚡ Performance

- Timeout padrão: 10 segundos (Vercel Hobby Plan)
- Timeout máximo: 60 segundos (Vercel Pro)
- Tamanho máximo de arquivo: 4.5MB (Hobby) / 50MB (Pro)

## 📝 Notas Importantes

1. **Modo de Desenvolvimento**: Use sempre `vercel dev` para testar localmente
2. **Coluna SharePoint**: O campo `planoMidiaGrupo_pk` deve existir na biblioteca do SharePoint
3. **Ordenação**: Não é possível ordenar por `Created` se o campo não estiver indexado
4. **Fallback**: A API tenta buscar com e sem ordenação automaticamente

## 🚀 Deploy

Ao fazer deploy no Vercel, certifique-se de:

1. Adicionar todas as variáveis de ambiente no dashboard da Vercel
2. Configurar timeout adequado se necessário (Settings > Functions)
3. Verificar se a API do Azure permite requisições do domínio de produção

## 📞 Suporte

Para dúvidas sobre:
- **Azure AD**: Consultar administrador do Azure
- **SharePoint**: Verificar permissões e estrutura da biblioteca
- **Código**: Ver logs com `vercel dev` ou `vercel logs` em produção

