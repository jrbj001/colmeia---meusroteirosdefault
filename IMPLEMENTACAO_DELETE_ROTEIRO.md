# 🗑️ Implementação: Excluir Roteiro (Soft Delete)

## 📝 Resumo

Implementação completa da funcionalidade de exclusão de roteiros na tela **Meus Roteiros**, utilizando soft delete (marcar `delete_bl = 1`).

---

## ✅ O que foi implementado

### 1️⃣ **Stored Procedure SQL** 
📁 `sql/CREATE_sp_planoMidiaGrupoDelete.sql`

**Procedure criada:**
```sql
EXEC [serv_product_be180].[sp_planoMidiaGrupoDelete] @pk = 6842;
```

**Funcionalidades:**
- ✅ Valida se o PK é válido
- ✅ Valida se o roteiro existe
- ✅ Valida se já está deletado
- ✅ Marca `delete_bl = 1` (soft delete)
- ✅ Retorna informações do registro deletado

---

### 2️⃣ **API Endpoint**
📁 `api/roteiros-delete.js`

**Endpoint:** `POST /roteiros-delete`

**Body:**
```json
{
  "pk": 6842
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Roteiro excluído com sucesso",
  "data": {
    "pk": 6842,
    "planoMidiaGrupo_st": "Nome do Roteiro",
    "delete_bl": 1,
    "date_dh": "2025-12-19T..."
  }
}
```

**Tratamento de erros:**
- 400: PK inválido ou roteiro já deletado
- 404: Roteiro não encontrado
- 500: Erro interno

---

### 3️⃣ **Filtro nas Consultas**
📁 `api/roteiros.js` e `api/roteiros-search.js`

**Modificação:**
- ✅ Adicionado `WHERE delete_bl = 0` em ambas as APIs
- ✅ Somente roteiros ativos aparecem na listagem
- ✅ Roteiros deletados (`delete_bl = 1`) não aparecem mais

---

### 4️⃣ **Modal de Confirmação**
📁 `src/components/ConfirmDeleteModal/ConfirmDeleteModal.tsx`

**Componente criado:**
- ✅ Modal bonito e responsivo
- ✅ Mostra o nome do roteiro a ser excluído
- ✅ Aviso: "Esta ação não poderá ser desfeita"
- ✅ Botões: Cancelar e Excluir
- ✅ Loading state durante exclusão
- ✅ Backdrop com overlay escuro

---

### 5️⃣ **Integração Frontend**
📁 `src/screens/MeusRoteiros/MeusRoteiros.tsx`

**Modificações:**
- ✅ Import do modal de confirmação
- ✅ Estado para controlar modal e loading
- ✅ Função `handleOpenDeleteModal()` - abre modal
- ✅ Função `handleCloseDeleteModal()` - fecha modal
- ✅ Função `handleConfirmDelete()` - executa delete via API
- ✅ Recarrega dados após exclusão bem-sucedida
- ✅ Tratamento de erros
- ✅ Ícone de delete mudou cor hover para vermelho

---

### 6️⃣ **Configuração Vercel**
📁 `vercel.json`

**Rotas adicionadas:**
- ✅ `/roteiros` → `api/roteiros.js`
- ✅ `/roteiros-search` → `api/roteiros-search.js`
- ✅ `/roteiros-delete` → `api/roteiros-delete.js`

---

## 🚀 Como aplicar no banco de dados

### **Passo 1: Executar a procedure no SQL Server**

```sql
-- 1. Abrir o arquivo sql/CREATE_sp_planoMidiaGrupoDelete.sql
-- 2. Executar todo o conteúdo no SQL Server Management Studio
-- 3. Verificar se a procedure foi criada com sucesso:

SELECT * 
FROM sys.procedures 
WHERE name = 'sp_planoMidiaGrupoDelete';
```

### **Passo 2: Testar a procedure**

```sql
-- Testar com um PK de teste (substitua 6842 por um PK real)
EXEC [serv_product_be180].[sp_planoMidiaGrupoDelete] @pk = 6842;

-- Verificar se marcou como deletado
SELECT pk, planoMidiaGrupo_st, delete_bl 
FROM [serv_product_be180].[planoMidiaGrupo_dm] 
WHERE pk = 6842;

-- Resultado esperado: delete_bl = 1
```

---

## 🧪 Como testar a implementação

### **Teste 1: Interface**
1. Acesse a tela "Meus Roteiros"
2. Clique no ícone de lixeira de um roteiro
3. Modal deve abrir mostrando o nome do roteiro
4. Clique em "Cancelar" → Modal fecha
5. Clique novamente no ícone de lixeira
6. Clique em "Excluir Roteiro" → Loading aparece
7. Roteiro deve desaparecer da lista

### **Teste 2: API**
```bash
# Testar via curl ou Postman
curl -X POST https://seu-dominio.vercel.app/roteiros-delete \
  -H "Content-Type: application/json" \
  -d '{"pk": 6842}'
```

### **Teste 3: Verificar no banco**
```sql
-- Ver roteiros deletados
SELECT * 
FROM [serv_product_be180].[planoMidiaGrupo_dm] 
WHERE delete_bl = 1
ORDER BY date_dh DESC;

-- Ver roteiros ativos
SELECT * 
FROM [serv_product_be180].[planoMidiaGrupo_dm] 
WHERE delete_bl = 0
ORDER BY date_dh DESC;
```

---

## 📊 Estrutura de Arquivos Criados/Modificados

```
📁 sql/
  └── CREATE_sp_planoMidiaGrupoDelete.sql          [NOVO]

📁 api/
  ├── roteiros.js                                  [MODIFICADO - filtro delete_bl]
  ├── roteiros-search.js                           [MODIFICADO - filtro delete_bl]
  └── roteiros-delete.js                           [NOVO]

📁 src/
  ├── components/
  │   └── ConfirmDeleteModal/
  │       └── ConfirmDeleteModal.tsx               [NOVO]
  └── screens/
      └── MeusRoteiros/
          └── MeusRoteiros.tsx                     [MODIFICADO]

📄 vercel.json                                     [MODIFICADO]
```

---

## ⚠️ Observações Importantes

1. **Soft Delete**: Os roteiros NÃO são removidos do banco, apenas marcados como deletados (`delete_bl = 1`)

2. **Recuperação**: Se precisar recuperar um roteiro deletado:
   ```sql
   UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
   SET delete_bl = 0
   WHERE pk = 6842;
   ```

3. **Registros relacionados**: Os registros de `planoMidiaDesc_dm` NÃO são marcados como deletados (conforme solicitado)

4. **Deploy**: Após fazer push para o repositório, o Vercel fará deploy automático da nova API

---

## 🎯 Próximos Passos (Opcionais)

- [ ] Adicionar toast/notificação de sucesso após exclusão
- [ ] Criar tela de "Lixeira" para recuperar roteiros deletados
- [ ] Adicionar permissão de usuário (apenas admin pode deletar)
- [ ] Log de auditoria (quem deletou e quando)

---

## 🐛 Troubleshooting

### Problema: Modal não abre
**Solução**: Verificar se o import do modal está correto

### Problema: Erro 404 na API
**Solução**: Verificar se o vercel.json foi atualizado e fazer redeploy

### Problema: Roteiro não some da lista
**Solução**: Verificar se a procedure foi criada no banco de dados

### Problema: Erro "Roteiro não encontrado"
**Solução**: Verificar se o PK está correto e se o roteiro existe

---

**Implementado em:** 19/12/2025  
**Branch:** `excluir-roteiro`  
**Status:** ✅ Completo e pronto para testes
