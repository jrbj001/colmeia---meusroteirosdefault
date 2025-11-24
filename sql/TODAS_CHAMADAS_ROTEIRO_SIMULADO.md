# 📞 TODAS AS CHAMADAS DO ROTEIRO SIMULADO

## 🔄 FLUXO COMPLETO

---

## 1️⃣ **CRIAR planoMidiaDesc_pk**

### **Frontend → Backend**
```javascript
// Arquivo: src/screens/CriarRoteiro/CriarRoteiro.tsx (linha ~648)
await axios.post('/plano-midia-desc', {
  planoMidiaGrupo_pk: 6547,  // PK do GRUPO
  recordsJson: [
    {
      planoMidiaDesc_st: "CAMPANHA_SAO_PAULO",
      usuarioId_st: "auth0|123",
      usuarioName_st: "João",
      gender_st: "MF",
      class_st: "ABC",
      age_st: "18+",
      ibgeCode_vl: 3550308
    },
    {
      planoMidiaDesc_st: "CAMPANHA_RIO_DE_JANEIRO",
      usuarioId_st: "auth0|123",
      usuarioName_st: "João",
      gender_st: "MF",
      class_st: "ABC",
      age_st: "18+",
      ibgeCode_vl: 3304557
    }
  ]
});
```

### **Backend → SQL**
```javascript
// Arquivo: api/plano-midia-desc.js (linha ~22)
const result = await pool.request()
  .input('planoMidiaGrupo_pk', 6547)
  .input('recordsJson', JSON.stringify(recordsJson))
  .execute('[serv_product_be180].[sp_planoMidiaDescInsert]');
```

### **Retorno**
```json
[
  { "new_pk": 7716 },  // São Paulo
  { "new_pk": 7717 }   // Rio de Janeiro
]
```

---

## 2️⃣ **SALVAR DADOS - São Paulo**

### **Frontend → Backend**
```javascript
// Arquivo: src/screens/CriarRoteiro/CriarRoteiro.tsx (linha ~753)
await axios.post('/roteiro-simulado', {
  planoMidiaDesc_pk: 7716,  // PK individual de São Paulo
  dadosTabela: [
    {
      grupoSub_st: "G1D",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [
        {
          insercaoComprada: 1,
          seDigitalInsercoes_vl: 0,
          seDigitalMaximoInsercoes_vl: 0
        }
      ]
    },
    // ... mais grupos
  ],
  pracasSelecionadas: [{ nome_cidade: "SAO PAULO", ... }],
  quantidadeSemanas: 1
});
```

### **Backend → SQL**
```javascript
// Arquivo: api/roteiro-simulado.js (linha ~148)
const result = await pool.request()
  .input('planoMidiaDesc_pk', 7716)
  .input('recordsJson', JSON.stringify([
    {
      week_vl: 1,
      grupoSub_st: "G1D",
      contagem_vl: 1,
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      seEstaticoVisibilidade_vl: 100
    },
    // ... mais registros
  ]))
  .execute('serv_product_be180.sp_planoColmeiaSimuladoInsert');
```

---

## 3️⃣ **SALVAR DADOS - Rio de Janeiro**

### **Frontend → Backend**
```javascript
// Arquivo: src/screens/CriarRoteiro/CriarRoteiro.tsx (linha ~753)
await axios.post('/roteiro-simulado', {
  planoMidiaDesc_pk: 7717,  // PK individual do Rio de Janeiro
  dadosTabela: [
    {
      grupoSub_st: "G1D",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [
        {
          insercaoComprada: 1,
          seDigitalInsercoes_vl: 0,
          seDigitalMaximoInsercoes_vl: 0
        }
      ]
    },
    {
      grupoSub_st: "G1E",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [
        {
          insercaoComprada: 1,
          seDigitalInsercoes_vl: 0,
          seDigitalMaximoInsercoes_vl: 0
        }
      ]
    },
    // ... mais grupos
  ],
  pracasSelecionadas: [{ nome_cidade: "RIO DE JANEIRO", ... }],
  quantidadeSemanas: 1
});
```

### **Backend → SQL**
```javascript
// Arquivo: api/roteiro-simulado.js (linha ~148)
const result = await pool.request()
  .input('planoMidiaDesc_pk', 7717)
  .input('recordsJson', JSON.stringify([
    {
      week_vl: 1,
      grupoSub_st: "G1D",
      contagem_vl: 1,
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      seEstaticoVisibilidade_vl: 100
    },
    {
      week_vl: 1,
      grupoSub_st: "G1E",
      contagem_vl: 1,
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      seEstaticoVisibilidade_vl: 100
    },
    // ... mais registros
  ]))
  .execute('serv_product_be180.sp_planoColmeiaSimuladoInsert');
```

---

## 4️⃣ **EXECUTAR DATABRICKS**

### **Frontend → Backend**
```javascript
// Arquivo: src/screens/CriarRoteiro/CriarRoteiro.tsx (linha ~813)
await axios.post('/databricks-roteiro-simulado', {
  planoMidiaGrupo_pk: 6547,  // PK do GRUPO (não os individuais!)
  date_dh: "2025-11-20 13:00:48",
  date_dt: "2025-11-20"
});
```

### **Backend → Databricks**
```javascript
// Arquivo: api/databricks-roteiro-simulado.js (linha ~69)
await axios.post(
  'https://adb-2295476797686466.6.azuredatabricks.net/api/2.1/jobs/run-now',
  {
    job_id: 253075688202926,
    notebook_params: {
      planoMidiaGrupo_pk: "6547",
      date_dh: "2025-11-20 13:00:48",
      date_dt: "2025-11-20"
    }
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_DATABRICKS_TOKEN',
      'Content-Type': 'application/json'
    }
  }
);
```

---

## 📊 RESUMO

| Etapa | Endpoint | Parâmetro Principal | Valor | Chamadas |
|-------|----------|---------------------|-------|----------|
| 1 | `/plano-midia-desc` | `planoMidiaGrupo_pk` | 6547 | 1 |
| 2 | `/roteiro-simulado` | `planoMidiaDesc_pk` | 7716 (SP) | 1 |
| 3 | `/roteiro-simulado` | `planoMidiaDesc_pk` | 7717 (RJ) | 1 |
| 4 | `/databricks-roteiro-simulado` | `planoMidiaGrupo_pk` | 6547 | 1 |

**Total de chamadas:** 4 (1 + 2 + 1)

---

## 🔑 PONTOS-CHAVE

1. **planoMidiaGrupo_pk** = PK do grupo/campanha (ex: 6547)
2. **planoMidiaDesc_pk** = PK individual de cada cidade (ex: 7716, 7717)
3. **Etapa 1**: Cria PKs individuais para cada cidade
4. **Etapas 2-3**: Salva dados para cada cidade separadamente
5. **Etapa 4**: Databricks processa o GRUPO inteiro (todas as cidades)

---

**Data**: 2025-11-20
**Branch**: `fix-roteiro-simulado`

