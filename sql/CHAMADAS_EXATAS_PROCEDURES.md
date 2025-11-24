# 📞 CHAMADAS EXATAS PARA AS STORED PROCEDURES

## 🔵 PROCEDURE 1: sp_planoMidiaDescInsert

### **Arquivo:** `api/plano-midia-desc.js` (linhas 22-25)

### **Chamada:**
```javascript
const result = await pool.request()
  .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
  .input('recordsJson', JSON.stringify(recordsJson))
  .execute('[serv_product_be180].[sp_planoMidiaDescInsert]');
```

### **Parâmetros de entrada:**

#### **1. planoMidiaGrupo_pk** (INT)
```javascript
6812  // PK do grupo/campanha
```

#### **2. recordsJson** (NVARCHAR(MAX) - JSON string)
```json
[
  {
    "planoMidiaDesc_st": "CAMPANHA_SAO_PAULO",
    "usuarioId_st": "auth0|123456",
    "usuarioName_st": "João Silva",
    "gender_st": "MF",
    "class_st": "ABC",
    "age_st": "18+",
    "ibgeCode_vl": 3550308
  },
  {
    "planoMidiaDesc_st": "CAMPANHA_RIO_DE_JANEIRO",
    "usuarioId_st": "auth0|123456",
    "usuarioName_st": "João Silva",
    "gender_st": "MF",
    "class_st": "ABC",
    "age_st": "18+",
    "ibgeCode_vl": 3304557
  },
  {
    "planoMidiaDesc_st": "CAMPANHA_BELO_HORIZONTE",
    "usuarioId_st": "auth0|123456",
    "usuarioName_st": "João Silva",
    "gender_st": "MF",
    "class_st": "ABC",
    "age_st": "18+",
    "ibgeCode_vl": 3106200
  }
]
```

### **Retorno esperado:**
```json
[
  { "new_pk": 7698 },
  { "new_pk": 7699 },
  { "new_pk": 7700 }
]
```

### **Exemplo completo de execução SQL:**
```sql
EXEC [serv_product_be180].[sp_planoMidiaDescInsert]
  @planoMidiaGrupo_pk = 6812,
  @recordsJson = '[
    {
      "planoMidiaDesc_st": "CAMPANHA_SAO_PAULO",
      "usuarioId_st": "auth0|123456",
      "usuarioName_st": "João Silva",
      "gender_st": "MF",
      "class_st": "ABC",
      "age_st": "18+",
      "ibgeCode_vl": 3550308
    },
    {
      "planoMidiaDesc_st": "CAMPANHA_RIO_DE_JANEIRO",
      "usuarioId_st": "auth0|123456",
      "usuarioName_st": "João Silva",
      "gender_st": "MF",
      "class_st": "ABC",
      "age_st": "18+",
      "ibgeCode_vl": 3304557
    }
  ]'
```

---

## 🔵 PROCEDURE 2: sp_planoColmeiaSimuladoInsert

### **Arquivo:** `api/roteiro-simulado.js` (linhas 148-151)

### **Chamada:**
```javascript
const result = await pool.request()
  .input('planoMidiaDesc_pk', planoMidiaDesc_pk)
  .input('recordsJson', JSON.stringify(recordsJson))
  .execute('serv_product_be180.sp_planoColmeiaSimuladoInsert');
```

### **Parâmetros de entrada:**

#### **1. planoMidiaDesc_pk** (INT)
```javascript
7698  // PK individual da cidade (São Paulo)
```

#### **2. recordsJson** (NVARCHAR(MAX) - JSON string)
```json
[
  {
    "week_vl": 1,
    "grupoSub_st": "G2D",
    "contagem_vl": 100,
    "seDigitalInsercoes_vl": 50,
    "seDigitalMaximoInsercoes_vl": 150
  },
  {
    "week_vl": 2,
    "grupoSub_st": "G2D",
    "contagem_vl": 120,
    "seDigitalInsercoes_vl": 60,
    "seDigitalMaximoInsercoes_vl": 180
  },
  {
    "week_vl": 1,
    "grupoSub_st": "G3ME",
    "contagem_vl": 80,
    "seDigitalInsercoes_vl": 40,
    "seDigitalMaximoInsercoes_vl": 120
  },
  {
    "week_vl": 2,
    "grupoSub_st": "G3ME",
    "contagem_vl": 90,
    "seDigitalInsercoes_vl": 45,
    "seDigitalMaximoInsercoes_vl": 135
  }
]
```

### **Retorno esperado:**
```javascript
// Nenhum recordset específico, apenas sucesso/erro
```

### **Exemplo completo de execução SQL:**
```sql
EXEC [serv_product_be180].[sp_planoColmeiaSimuladoInsert]
  @planoMidiaDesc_pk = 7698,
  @recordsJson = '[
    {
      "week_vl": 1,
      "grupoSub_st": "G2D",
      "contagem_vl": 100,
      "seDigitalInsercoes_vl": 50,
      "seDigitalMaximoInsercoes_vl": 150
    },
    {
      "week_vl": 2,
      "grupoSub_st": "G2D",
      "contagem_vl": 120,
      "seDigitalInsercoes_vl": 60,
      "seDigitalMaximoInsercoes_vl": 180
    }
  ]'
```

---

## 📊 SEQUÊNCIA COMPLETA DE CHAMADAS

### **Cenário: 3 cidades (São Paulo, Rio de Janeiro, Belo Horizonte)**

### **1ª CHAMADA - Criar planoMidiaDesc_pk (UMA VEZ)**
```sql
EXEC [serv_product_be180].[sp_planoMidiaDescInsert]
  @planoMidiaGrupo_pk = 6812,
  @recordsJson = '[
    {"planoMidiaDesc_st": "CAMPANHA_SAO_PAULO", "ibgeCode_vl": 3550308, ...},
    {"planoMidiaDesc_st": "CAMPANHA_RIO_DE_JANEIRO", "ibgeCode_vl": 3304557, ...},
    {"planoMidiaDesc_st": "CAMPANHA_BELO_HORIZONTE", "ibgeCode_vl": 3106200, ...}
  ]'

-- Retorna: [{"new_pk": 7698}, {"new_pk": 7699}, {"new_pk": 7700}]
```

---

### **2ª CHAMADA - Salvar dados São Paulo**
```sql
EXEC [serv_product_be180].[sp_planoColmeiaSimuladoInsert]
  @planoMidiaDesc_pk = 7698,
  @recordsJson = '[
    {"week_vl": 1, "grupoSub_st": "G2D", "contagem_vl": 100, "seDigitalInsercoes_vl": 50, "seDigitalMaximoInsercoes_vl": 150},
    {"week_vl": 2, "grupoSub_st": "G2D", "contagem_vl": 120, "seDigitalInsercoes_vl": 60, "seDigitalMaximoInsercoes_vl": 180}
  ]'
```

---

### **3ª CHAMADA - Salvar dados Rio de Janeiro**
```sql
EXEC [serv_product_be180].[sp_planoColmeiaSimuladoInsert]
  @planoMidiaDesc_pk = 7699,
  @recordsJson = '[
    {"week_vl": 1, "grupoSub_st": "G2D", "contagem_vl": 100, "seDigitalInsercoes_vl": 50, "seDigitalMaximoInsercoes_vl": 150},
    {"week_vl": 2, "grupoSub_st": "G2D", "contagem_vl": 120, "seDigitalInsercoes_vl": 60, "seDigitalMaximoInsercoes_vl": 180}
  ]'
```

---

### **4ª CHAMADA - Salvar dados Belo Horizonte**
```sql
EXEC [serv_product_be180].[sp_planoColmeiaSimuladoInsert]
  @planoMidiaDesc_pk = 7700,
  @recordsJson = '[
    {"week_vl": 1, "grupoSub_st": "G2D", "contagem_vl": 100, "seDigitalInsercoes_vl": 50, "seDigitalMaximoInsercoes_vl": 150},
    {"week_vl": 2, "grupoSub_st": "G2D", "contagem_vl": 120, "seDigitalInsercoes_vl": 60, "seDigitalMaximoInsercoes_vl": 180}
  ]'
```

---

## 🎯 RESUMO

| Ordem | Procedure | Chamadas | Parâmetro principal | Valor |
|-------|-----------|----------|---------------------|-------|
| 1 | `sp_planoMidiaDescInsert` | 1 | `planoMidiaGrupo_pk` | 6812 |
| 2 | `sp_planoColmeiaSimuladoInsert` | 3 (loop) | `planoMidiaDesc_pk` | 7698 |
| 3 | `sp_planoColmeiaSimuladoInsert` | (continuação) | `planoMidiaDesc_pk` | 7699 |
| 4 | `sp_planoColmeiaSimuladoInsert` | (continuação) | `planoMidiaDesc_pk` | 7700 |

**Total de chamadas SQL:** 4 (1 + N cidades)

---

**Data**: 2025-11-19  
**Branch**: `fix-roteiro-simulado`

