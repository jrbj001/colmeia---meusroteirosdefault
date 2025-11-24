# 🐛 Bug: Roteiro Simulado com Múltiplas Cidades

## 📋 **Descrição do Problema**

Quando um roteiro simulado é criado com **múltiplas cidades** (ex: SOROCABA e SANTOS), apenas a **última cidade** aparece nos resultados finais.

### **Sintoma:**
- ✅ Frontend cria 2 `planoMidiaDesc_pk` (ex: 7406, 7407)
- ✅ Dados são salvos corretamente na tabela `planoMidiaDesc_dm`
- ✅ Dados são salvos na tabela intermediária via `sp_planoColmeiaSimuladoInsert`
- ❌ Apenas 1 cidade aparece na view `planoMidiaGrupoPivot_dm_vw` após Databricks processar
- ❌ No mapa, só aparece 1 cidade em vez de 2

---

## 🔍 **Causa Raiz**

A **Stored Procedure `sp_planoMidiaDescInsert`** tem um bug na linha 40-44:

```sql
UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
SET planoMidiaDescPk_st = (
    SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',')
    FROM @InsertedPKs
)
WHERE pk = @planoMidiaGrupo_pk;
```

### **O que acontece:**

1. **Chamada 1** (SOROCABA):
   - Cria `planoMidiaDesc_pk = 7406`
   - Atualiza: `planoMidiaDescPk_st = "7406"` ✅

2. **Chamada 2** (SANTOS):
   - Cria `planoMidiaDesc_pk = 7407`
   - Atualiza: `planoMidiaDescPk_st = "7407"` ❌ **(SOBRESCREVEU!)**

### **Resultado:**
O grupo fica com `planoMidiaDescPk_st = "7407"` (perdeu o 7406), então o Databricks só processa SANTOS.

---

## ✅ **Solução Permanente**

### **Opção 1: Corrigir a SP `sp_planoMidiaDescInsert`** (RECOMENDADO)

Alterar a SP para **CONCATENAR** em vez de **SOBRESCREVER**:

```sql
UPDATE [serv_product_be180].[planoMidiaGrupo_dm]
SET planoMidiaDescPk_st = 
    CASE 
        WHEN planoMidiaDescPk_st IS NULL OR planoMidiaDescPk_st = '' 
        THEN (SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',') FROM @InsertedPKs)
        ELSE planoMidiaDescPk_st + ',' + (SELECT STRING_AGG(CAST(new_pk AS VARCHAR(10)), ',') FROM @InsertedPKs)
    END
WHERE pk = @planoMidiaGrupo_pk;
```

**Arquivo:** `sql/FIX_sp_planoMidiaDescInsert.sql`

**Executar como DBA:**
```sql
USE [db-azr-sql-clients-0001];
GO
-- Executar o conteúdo do arquivo FIX_sp_planoMidiaDescInsert.sql
```

---

## 🔧 **Workaround Temporário**

Enquanto a SP não é corrigida, implementamos um **workaround no frontend**:

### **Como funciona:**

1. Frontend cria todos os `planoMidiaDesc_pk` (7406, 7407, ...)
2. Frontend chama `/atualizar-grupo-desc-pks` com **TODOS os PKs**
3. Endpoint chama `sp_planoMidiaGrupoUpdateDescPks` (nova SP)
4. Grupo fica com `planoMidiaDescPk_st = "7406,7407"` ✅
5. Databricks processa **todas as cidades** ✅

### **Nova SP necessária:**

**Arquivo:** `sql/CREATE_sp_planoMidiaGrupoUpdateDescPks.sql`

**Executar como DBA:**
```sql
USE [db-azr-sql-clients-0001];
GO
-- Executar o conteúdo do arquivo CREATE_sp_planoMidiaGrupoUpdateDescPks.sql
```

**Permissões necessárias:**
```sql
-- Dar permissão ao usuário da aplicação para executar a SP
GRANT EXECUTE ON [serv_product_be180].[sp_planoMidiaGrupoUpdateDescPks] TO [usuario_aplicacao];
GO
```

---

## 📊 **Testes Realizados**

### **Teste 1: Verificação dos dados salvos**
```
Grupo: 6340
planoMidiaDesc_pk criados: 7406 (SOROCABA), 7407 (SANTOS)
planoMidiaDescPk_st no grupo: "7407" ❌ (apenas o último)
```

### **Teste 2: Análise da SP**
```
sp_planoMidiaDescInsert tem UPDATE que sobrescreve
Linhas 40-44: SET planoMidiaDescPk_st = (SELECT STRING_AGG...)
```

### **Teste 3: Tentativa de workaround**
```
❌ Erro: "UPDATE permission was denied on the object 'planoMidiaGrupo_dm'"
Motivo: Usuário não tem permissão para UPDATE direto
Solução: Criar SP com permissões adequadas
```

---

## 🚀 **Próximos Passos**

### **Ação Imediata (DBA):**
1. ✅ Criar a SP `sp_planoMidiaGrupoUpdateDescPks` usando o arquivo `CREATE_sp_planoMidiaGrupoUpdateDescPks.sql`
2. ✅ Dar permissão EXECUTE ao usuário da aplicação

### **Ação Permanente (DBA):**
1. ✅ Aplicar o FIX na SP `sp_planoMidiaDescInsert` usando o arquivo `FIX_sp_planoMidiaDescInsert.sql`
2. ✅ Testar criando um roteiro simulado com 2+ cidades
3. ✅ Após confirmação do fix, remover o workaround do frontend

### **Ação no Frontend (após fix da SP):**
1. ❌ Remover a chamada para `/atualizar-grupo-desc-pks` do arquivo `CriarRoteiro.tsx` (linhas 767-776)
2. ❌ Remover o endpoint `/atualizar-grupo-desc-pks.js`

---

## 📝 **Histórico**

- **30/10/2024 13:42** - Bug identificado e documentado
- **30/10/2024 13:45** - Workaround implementado (pendente criação da SP)
- **30/10/2024 XX:XX** - ⏳ Aguardando DBA criar as SPs necessárias

---

## 🔗 **Arquivos Relacionados**

### **Frontend:**
- `src/screens/CriarRoteiro/CriarRoteiro.tsx` (linhas 767-776)

### **Backend:**
- `api/atualizar-grupo-desc-pks.js` (workaround temporário)
- `api/plano-midia-desc.js` (chama a SP com bug)

### **SQL:**
- `sql/CREATE_sp_planoMidiaGrupoUpdateDescPks.sql` (SP do workaround)
- `sql/FIX_sp_planoMidiaDescInsert.sql` (correção permanente)

### **Banco de Dados:**
- Tabela: `serv_product_be180.planoMidiaGrupo_dm`
- Coluna problemática: `planoMidiaDescPk_st`
- SP com bug: `serv_product_be180.sp_planoMidiaDescInsert`

