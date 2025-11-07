# 🔧 Troubleshooting - Download do Excel não funciona

## 📋 Checklist de Diagnóstico

Execute os passos abaixo **NA ORDEM** para identificar o problema:

### ✅ **PASSO 1: Verificar se o servidor está rodando**

```bash
# Certifique-se de que o servidor Vercel está rodando
vercel dev
```

**Aguarde** a mensagem:
```
Ready! Available at http://localhost:3000
```

---

### ✅ **PASSO 2: Abrir o Console do Navegador**

1. Abra o Chrome/Edge DevTools (F12)
2. Vá na aba **Console**
3. Clique no botão "Download Excel"
4. **COPIE TODOS OS LOGS** que aparecem no console

**Logs esperados:**
```
🔵 FUNÇÃO CHAMADA: baixarExcelSharePoint
🔵 planoMidiaGrupo_pk atual: 6406
📥 Iniciando download do SharePoint...
📊 planoMidiaGrupo_pk: 6406
🌐 URL da API: /sharepoint-download
📤 Enviando requisição para API...
```

---

### ✅ **PASSO 3: Verificar se tem planoMidiaGrupo_pk**

Se aparecer:
```
⚠️ planoMidiaGrupo_pk não encontrado
```

**SOLUÇÃO**: O roteiro não foi salvo corretamente. 
- Volte para a Aba 1 e salve novamente
- Ou use um roteiro já existente

---

### ✅ **PASSO 4: Verificar Network Error**

Se aparecer:
```
❌ Error.message: Network Error
```

**CAUSAS POSSÍVEIS:**

**4.1. Servidor não está rodando**
```bash
# Mate qualquer processo anterior
pkill -f vercel

# Inicie novamente
vercel dev
```

**4.2. Porta 3000 ocupada**
```bash
# Verificar o que está na porta 3000
lsof -ti:3000

# Matar o processo
kill -9 $(lsof -ti:3000)

# Reiniciar
vercel dev
```

**4.3. API não existe**
```bash
# Verificar se o arquivo existe
ls -la /Users/jroberto/colmeia---meusroteirosdefault/api/sharepoint-download.js
```

---

### ✅ **PASSO 5: Testar a API diretamente**

Execute o script de teste:

```bash
cd /Users/jroberto/colmeia---meusroteirosdefault
node test-sharepoint-api.js
```

**RESULTADO ESPERADO:**
```
✅ SUCESSO!
📊 Status: 200
📦 Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
📏 Tamanho do arquivo: XXXX bytes
```

**SE DER ERRO:**

**Erro: ECONNREFUSED**
```
💡 Servidor não está rodando
→ Execute: vercel dev
```

**Erro: 404**
```
💡 Arquivo não existe no SharePoint com PK = 6406
→ Use outro planoMidiaGrupo_pk ou crie o arquivo no SharePoint
```

**Erro: 500 - Failed to acquire access token**
```
💡 Problema com AZURE_CLIENT_SECRET
→ Verifique o .env
→ Confirme senha no 1Password
```

---

### ✅ **PASSO 6: Verificar variáveis de ambiente**

```bash
# Ver conteúdo do .env (SEM MOSTRAR A SENHA)
cat .env | grep -v CLIENT_SECRET
```

**DEVE APARECER:**
```
AZURE_TENANT_ID=521338e4-1985-4bc5-be73-fabc0305ffb1
AZURE_CLIENT_ID=a7cf9191-9aa0-4abf-9d0e-fede5d44badc
AZURE_OBJECT_ID=60368e17-d320-4952-9f51-ee7a2bf90360
AZURE_CLIENT_SECRET=*** (deve estar preenchido)
SHAREPOINT_SITE_URL=https://be180.sharepoint.com/sites/colmeia
SHAREPOINT_LIBRARY_NAME=colmeia_powerBiExcel
SHAREPOINT_LIBRARY_ID=986c6f5f-ed4f-4ca4-b5f8-c4a05524abe0
```

**SE FALTAR ALGUMA VARIÁVEL:**
```bash
# Edite o .env e adicione
nano .env
```

---

### ✅ **PASSO 7: Verificar aba correta**

O botão de download **só aparece na Aba 6**.

**Como chegar na Aba 6:**

1. Abra um roteiro em "Meus Roteiros"
2. Clique no roteiro (ícone de olho 👁️)
3. Você será redirecionado para CriarRoteiro
4. Clique na **aba "6 - Visualizar Resultados"**
5. Role até o final da página
6. Botão: **"📊 Download Excel"**

---

### ✅ **PASSO 8: Verificar se o botão está habilitado**

O botão fica **DESABILITADO** (cinza) se:
- `planoMidiaGrupo_pk` não existe
- Está fazendo download (spinner)

**Mensagem abaixo do botão:**
```
Salve o roteiro primeiro para habilitar o download
```

---

## 🐛 **ERROS COMUNS E SOLUÇÕES**

### ❌ Erro: "Request failed with status code 404"

**Causa**: Arquivo não existe no SharePoint

**Solução**:
1. Verifique se o arquivo foi carregado no SharePoint
2. Confirme se a coluna `planoMidiaGrupo_pk` está preenchida
3. Use PK de teste: `6406`

---

### ❌ Erro: "Request failed with status code 500"

**Causa**: Problema na autenticação Azure

**Solução**:
1. Verifique `AZURE_CLIENT_SECRET` no `.env`
2. Obtenha nova senha do 1Password
3. Reinicie o servidor: `vercel dev`

---

### ❌ Erro: "timeout of 60000ms exceeded"

**Causa**: Arquivo muito grande ou servidor lento

**Solução**:
1. Verifique sua conexão de internet
2. Tente novamente
3. Se persistir, aumente o timeout em `CriarRoteiro.tsx`:

```typescript
timeout: 120000 // 2 minutos
```

---

### ❌ Botão não aparece

**Causa**: Não está na Aba 6 ou tipo de roteiro errado

**Solução**:
1. Certifique-se de estar na **Aba 6**
2. Tipo de roteiro deve ser **"Roteiro Completo"** (não Simulado)
3. Refresh na página (F5)

---

## 📞 **Precisa de Ajuda?**

**Me envie os seguintes dados:**

1. ✅ Logs do console do navegador (F12 → Console)
2. ✅ Saída do comando: `node test-sharepoint-api.js`
3. ✅ Saída do terminal onde roda `vercel dev`
4. ✅ Screenshot do erro no navegador
5. ✅ Qual `planoMidiaGrupo_pk` está usando

---

## 🧪 **Teste Rápido - Passo a Passo**

Execute EXATAMENTE esses comandos:

```bash
# 1. Ir para a pasta do projeto
cd /Users/jroberto/colmeia---meusroteirosdefault

# 2. Verificar se arquivo da API existe
ls -la api/sharepoint-download.js

# 3. Verificar variáveis (SEM MOSTRAR SENHA)
cat .env | grep AZURE | grep -v CLIENT_SECRET

# 4. Iniciar servidor
vercel dev

# 5. Em OUTRO terminal, testar API
node test-sharepoint-api.js
```

**Me envie os resultados de cada comando!**

