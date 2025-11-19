# 🐛 PROBLEMA: Databricks processando pontos de todas as cidades

## 📋 SITUAÇÃO ATUAL

### **O que está acontecendo:**
1. Frontend envia `planoMidiaDesc_pk` individual para cada cidade (7698, 7699, 7700, 7701) ✅
2. Cada cidade salva seus dados em `uploadRoteiros_ft` com seu `planoMidiaDesc_pk` específico ✅
3. Databricks recebe o `planoMidiaDesc_pk` individual (ex: 7698) ✅
4. **MAS** o script do Databricks está buscando pontos usando `planoMidiaGrupo_pk` em vez de `planoMidiaDesc_pk` ❌

### **Resultado:**
Todas as cidades acabam processando **TODOS os pontos do grupo** em vez de apenas seus próprios pontos!

---

## 🔍 ANÁLISE DO FLUXO

### **1. Dados salvos corretamente:**
```sql
-- Tabela: uploadRoteiros_ft
planoMidiaDesc_pk | week_vl | grupoSub_st | contagem_vl
7698              | 1       | G2D         | 100         ← São Paulo
7699              | 1       | G2D         | 100         ← Rio de Janeiro
7700              | 1       | G2D         | 100         ← Belo Horizonte
7701              | 1       | G2D         | 100         ← Curitiba
```

### **2. Databricks recebe:**
```json
{
  "job_id": 253075688202926,
  "notebook_params": {
    "planoMidiaGrupo_pk": "7698",  ← PK individual (mas nome do param está errado!)
    "date_dh": "2025-11-19 22:40:39",
    "date_dt": "2025-11-19"
  }
}
```

### **3. Script Databricks faz (HIPÓTESE):**
```python
# Script: be180_product_sampleMaxAllInbound.py

# Recebe o parâmetro
planoMidiaGrupo_pk = dbutils.widgets.get("planoMidiaGrupo_pk")  # "7698"

# ❌ PROBLEMA: Busca TODOS os planoMidiaDesc_pk do GRUPO
query = f"""
  SELECT planoMidiaDesc_pk 
  FROM planoMidia_dm_vw 
  WHERE planoMidiaGrupo_pk = {planoMidiaGrupo_pk}  ← Aqui está o erro!
"""

# Resultado: Retorna [7698, 7699, 7700, 7701] (TODOS do grupo!)
# Então processa TODOS os pontos de TODAS as cidades!
```

---

## 🎯 CAUSA RAIZ

O problema está em **2 lugares**:

### **1. Nome do parâmetro no backend está errado:**
```javascript
// api/databricks-roteiro-simulado.js (linha 58)
notebook_params: {
  planoMidiaGrupo_pk: planoMidiaDesc_pk.toString(),  ← Nome errado!
  date_dh: date_dh,
  date_dt: date_dt
}
```

**Deveria ser:**
```javascript
notebook_params: {
  planoMidiaDesc_pk: planoMidiaDesc_pk.toString(),  ← Nome correto!
  date_dh: date_dh,
  date_dt: date_dt
}
```

### **2. Script Databricks precisa usar o parâmetro correto:**
```python
# ❌ ERRADO: Busca todos os planoMidiaDesc_pk do grupo
planoMidiaGrupo_pk = dbutils.widgets.get("planoMidiaGrupo_pk")
query = f"SELECT * FROM planoMidia_dm_vw WHERE planoMidiaGrupo_pk = {planoMidiaGrupo_pk}"

# ✅ CORRETO: Usa o planoMidiaDesc_pk específico diretamente
planoMidiaDesc_pk = dbutils.widgets.get("planoMidiaDesc_pk")
query = f"SELECT * FROM uploadRoteiros_ft WHERE planoMidiaDesc_pk = {planoMidiaDesc_pk}"
```

---

## ✅ SOLUÇÃO

### **Passo 1: Corrigir o backend**
Alterar `api/databricks-roteiro-simulado.js` para enviar o nome correto do parâmetro:

```javascript
const requestBody = {
  job_id: parseInt(databricksJobId),
  notebook_params: {
    planoMidiaDesc_pk: planoMidiaDesc_pk.toString(),  ← Corrigir nome!
    date_dh: date_dh,
    date_dt: date_dt
  }
};
```

### **Passo 2: Verificar/Corrigir o script Databricks**
O script `be180_product_sampleMaxAllInbound.py` precisa:

1. **Receber o parâmetro correto:**
```python
planoMidiaDesc_pk = dbutils.widgets.get("planoMidiaDesc_pk")
```

2. **Buscar apenas os dados deste planoMidiaDesc_pk:**
```python
# Buscar dados do roteiro simulado
df_roteiro = spark.sql(f"""
  SELECT * 
  FROM uploadRoteiros_ft 
  WHERE planoMidiaDesc_pk = {planoMidiaDesc_pk}
""")

# Buscar pontos de mídia desta cidade específica
df_pontos = spark.sql(f"""
  SELECT * 
  FROM baseCalculadoraLastPlanoMidia_ft_vw 
  WHERE planoMidia_pk IN (
    SELECT pk 
    FROM planoMidia_dm_vw 
    WHERE planoMidiaDescPk_st LIKE '%{planoMidiaDesc_pk}%'
  )
""")
```

---

## 🔬 PRÓXIMOS PASSOS

1. ✅ Identificar problema
2. ⏳ Corrigir nome do parâmetro no backend
3. ⏳ Verificar script Databricks
4. ⏳ Testar com múltiplas cidades
5. ⏳ Validar que cada cidade processa apenas seus pontos

---

**Data**: 2025-11-19
**Branch**: `fix-roteiro-simulado`
**Status**: 🔍 Problema identificado - correção em andamento

