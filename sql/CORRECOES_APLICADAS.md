# ✅ CORREÇÕES APLICADAS - Roteiro Simulado

**Data**: 2025-11-19  
**Branch**: `fix-roteiro-simulado`

---

## 🎯 OBJETIVO

Alinhar o código com a documentação oficial do fluxo de Roteiro Simulado.

---

## 🔧 CORREÇÕES REALIZADAS

### **1. Adicionado campo `seEstaticoVisibilidade_vl`**

**Arquivo**: `api/roteiro-simulado.js`

**Problema**: O JSON enviado para `sp_planoColmeiaSimuladoInsert` não incluía o campo `seEstaticoVisibilidade_vl`.

**Antes:**
```javascript
recordsJson.push({
  week_vl,
  grupoSub_st: codigoGrupo,
  contagem_vl: contagem,
  seDigitalInsercoes_vl: digInsercoes,
  seDigitalMaximoInsercoes_vl: digMaxInsercoes
  // ❌ Faltava seEstaticoVisibilidade_vl
});
```

**Depois:**
```javascript
const estaticoVisibilidade = parseInt(visibilidade) || 0;

recordsJson.push({
  week_vl,
  grupoSub_st: codigoGrupo,
  contagem_vl: contagem,
  seDigitalInsercoes_vl: digInsercoes,
  seDigitalMaximoInsercoes_vl: digMaxInsercoes,
  seEstaticoVisibilidade_vl: estaticoVisibilidade  // ✅ Adicionado
});
```

**Resultado**: Agora o JSON está completo conforme esperado pela stored procedure.

---

### **2. Removidos parâmetros extras do Databricks**

**Arquivos**: 
- `api/databricks-roteiro-simulado.js`
- `src/screens/CriarRoteiro/CriarRoteiro.tsx`

**Problema**: O Databricks estava recebendo parâmetros extras (`date_dh`, `date_dt`) que não estão na documentação.

**Antes (Frontend):**
```javascript
const databricksResponse = await axios.post('/databricks-roteiro-simulado', {
  planoMidiaDesc_pk: planoMidiaGrupo_pk,
  date_dh: new Date().toISOString().slice(0, 19).replace('T', ' '),  // ❌ Extra
  date_dt: new Date().toISOString().slice(0, 10)  // ❌ Extra
});
```

**Depois (Frontend):**
```javascript
const databricksResponse = await axios.post('/databricks-roteiro-simulado', {
  planoMidiaDesc_pk: planoMidiaGrupo_pk  // ✅ Apenas o necessário
});
```

**Antes (Backend):**
```javascript
const requestBody = {
  job_id: parseInt(databricksJobId),
  notebook_params: {
    planoMidiaGrupo_pk: planoMidiaDesc_pk.toString(),
    date_dh: date_dh,  // ❌ Extra
    date_dt: date_dt   // ❌ Extra
  }
};
```

**Depois (Backend):**
```javascript
const requestBody = {
  job_id: parseInt(databricksJobId),
  notebook_params: {
    planoMidiaGrupo_pk: planoMidiaDesc_pk.toString()  // ✅ Apenas o necessário
  }
};
```

**Resultado**: Databricks agora recebe exatamente o que está documentado.

---

### **3. Removida validação de parâmetros desnecessários**

**Arquivo**: `api/databricks-roteiro-simulado.js`

**Problema**: Backend validava `date_dh` e `date_dt` que não são mais necessários.

**Antes:**
```javascript
const { planoMidiaDesc_pk, date_dh, date_dt } = req.body;

if (!date_dh || !date_dt) {
  return res.status(400).json({
    success: false,
    message: 'date_dh e date_dt são obrigatórios'  // ❌ Validação desnecessária
  });
}
```

**Depois:**
```javascript
const { planoMidiaDesc_pk } = req.body;

// ✅ Validação removida
```

**Resultado**: Backend mais simples e alinhado com a documentação.

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### **JSON enviado para sp_planoColmeiaSimuladoInsert**

| Campo | Antes | Depois |
|-------|-------|--------|
| `week_vl` | ✅ | ✅ |
| `grupoSub_st` | ✅ | ✅ |
| `contagem_vl` | ✅ | ✅ |
| `seDigitalInsercoes_vl` | ✅ | ✅ |
| `seDigitalMaximoInsercoes_vl` | ✅ | ✅ |
| `seEstaticoVisibilidade_vl` | ❌ | ✅ |

### **Parâmetros enviados para Databricks**

| Parâmetro | Antes | Depois |
|-----------|-------|--------|
| `planoMidiaGrupo_pk` | ✅ | ✅ |
| `date_dh` | ❌ (extra) | ✅ (removido) |
| `date_dt` | ❌ (extra) | ✅ (removido) |

---

## ✅ FLUXO FINAL (CORRETO)

### **STEP 1: sp_planoColmeiaSimuladoInsert**
```sql
EXEC [serv_product_be180].[sp_planoColmeiaSimuladoInsert]
  @planoMidiaDesc_pk = 7698,
  @recordsJson = '[
    {
      "week_vl": 1,
      "grupoSub_st": "G2D",
      "contagem_vl": 40,
      "seDigitalInsercoes_vl": 100,
      "seDigitalMaximoInsercoes_vl": 200,
      "seEstaticoVisibilidade_vl": 50
    }
  ]'
```

### **STEP 2: Databricks Job**
```bash
curl -X POST "https://adb-2295476797686466.6.azuredatabricks.net/api/2.1/jobs/run-now"
  -H "Authorization: Bearer YOUR_DATABRICKS_TOKEN"
  -H "Content-Type: application/json"
  -d '{
    "job_id": 253075688202926,
    "notebook_params": {
      "planoMidiaGrupo_pk": "6812"
    }
  }'
```

---

## 🧪 PRÓXIMOS PASSOS

1. ✅ Correções aplicadas
2. ⏳ **TESTAR** com múltiplas cidades
3. ⏳ Verificar se a duplicação de pontos foi resolvida
4. ⏳ Commit após confirmação dos testes

---

**Status**: ✅ Código alinhado com a documentação oficial

