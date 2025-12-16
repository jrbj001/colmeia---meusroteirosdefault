# ✅ FLUXO CORRETO DO ROTEIRO SIMULADO

## 🎯 RESUMO EXECUTIVO

**O roteiro simulado tem 4 etapas principais:**

1. **Criar planoMidiaDesc_pk** → UMA chamada com TODAS as cidades
2. **Salvar dados simulados** → LOOP (uma chamada por cidade)
3. **Executar Databricks** → UMA chamada com o planoMidiaGrupo_pk
4. **Visualizar resultados** → Aba 6

---

## 📋 FLUXO DETALHADO

### **ETAPA 1: Criar planoMidiaDesc_pk**

**Chamadas**: 1 (uma única chamada para todas as cidades)

**Frontend envia:**
```javascript
await axios.post('/plano-midia-desc', {
  planoMidiaGrupo_pk: 6812,  // ← PK do GRUPO
  recordsJson: [
    { cidade_st: "SAO PAULO", estado_st: "SP", sex_st: "MF", age_st: "18+", ibgeCode_vl: 3550308 },
    { cidade_st: "RIO DE JANEIRO", estado_st: "RJ", sex_st: "MF", age_st: "18+", ibgeCode_vl: 3304557 },
    { cidade_st: "BELO HORIZONTE", estado_st: "MG", sex_st: "MF", age_st: "18+", ibgeCode_vl: 3106200 }
  ]
});
```

**Backend executa:**
```javascript
// api/plano-midia-desc.js
const result = await pool.request()
  .input('planoMidiaGrupo_pk', 6812)
  .input('recordsJson', JSON.stringify(recordsJson))
  .execute('[serv_product_be180].[sp_planoMidiaDescInsert]');
```

**Stored Procedure:**
- `sp_planoMidiaDescInsert`
- Cria um `planoMidiaDesc_pk` para cada cidade
- Atualiza `planoMidia_dm_vw.planoMidiaDescPk_st` com todos os PKs concatenados

**Retorno:**
```json
[
  { "new_pk": 7698 },  // São Paulo
  { "new_pk": 7699 },  // Rio de Janeiro
  { "new_pk": 7700 }   // Belo Horizonte
]
```

---

### **ETAPA 2: Salvar Roteiro Simulado**

**Chamadas**: N (uma para cada cidade)

**Frontend envia (LOOP):**
```javascript
for (let i = 0; i < pracasComIbge.length; i++) {
  const planoMidiaDesc_pk = planosMidiaDescPk[i];  // 7698, 7699, 7700...
  const praca = pracasComIbge[i].praca;
  
  await axios.post('/roteiro-simulado', {
    planoMidiaDesc_pk: planoMidiaDesc_pk,  // ← PK INDIVIDUAL da cidade
    dadosTabela: [
      {
        grupoSub_st: "G2D",
        visibilidade: "100",
        seDigitalInsercoes_vl: 50,
        seDigitalMaximoInsercoes_vl: 150,
        semanas: [
          { insercaoComprada: 100, seDigitalInsercoes_vl: 50, seDigitalMaximoInsercoes_vl: 150 },
          { insercaoComprada: 120, seDigitalInsercoes_vl: 60, seDigitalMaximoInsercoes_vl: 180 }
        ]
      }
    ],
    pracasSelecionadas: [praca],
    quantidadeSemanas: 2
  });
}
```

**Backend executa:**
```javascript
// api/roteiro-simulado.js
const result = await pool.request()
  .input('planoMidiaDesc_pk', 7698)  // ← PK individual
  .input('recordsJson', JSON.stringify(recordsJson))
  .execute('serv_product_be180.sp_planoColmeiaSimuladoInsert');
```

**Stored Procedure:**
- `sp_planoColmeiaSimuladoInsert`
- Deleta dados antigos do `planoMidiaDesc_pk`
- Insere novos registros em `uploadRoteiros_ft`

**Dados salvos em `uploadRoteiros_ft`:**
```
planoMidiaDesc_pk | week_vl | grupoSub_st | contagem_vl | seDigitalInsercoes_vl | seDigitalMaximoInsercoes_vl
7698              | 1       | G2D         | 100         | 50                    | 150
7698              | 2       | G2D         | 120         | 60                    | 180
7699              | 1       | G2D         | 100         | 50                    | 150
7699              | 2       | G2D         | 120         | 60                    | 180
7700              | 1       | G2D         | 100         | 50                    | 150
7700              | 2       | G2D         | 120         | 60                    | 180
```

---

### **ETAPA 3: Executar Databricks**

**Chamadas**: 1 (uma única chamada para o grupo inteiro)

**Frontend envia:**
```javascript
await axios.post('/databricks-roteiro-simulado', {
  planoMidiaDesc_pk: 6812,  // ← PK do GRUPO! (não os PKs individuais)
  date_dh: "2025-11-19 22:40:39",
  date_dt: "2025-11-19"
});
```

**Backend transforma e envia para Databricks:**
```javascript
// api/databricks-roteiro-simulado.js
const requestBody = {
  job_id: 253075688202926,
  notebook_params: {
    planoMidiaGrupo_pk: "6812",  // ← PK do GRUPO (nome mantido para compatibilidade)
    date_dh: "2025-11-19 22:40:39",
    date_dt: "2025-11-19"
  }
};

await axios.post(
  'https://adb-2295476797686466.6.azuredatabricks.net/api/2.1/jobs/run-now',
  requestBody,
  { headers: { 'Authorization': `Bearer ${authToken}` } }
);
```

**Databricks processa:**
- Script: `be180_product_sampleMaxAllInbound.py`
- Job ID: `253075688202926`
- Busca TODOS os `planoMidiaDesc_pk` do grupo (7698, 7699, 7700)
- Processa cada cidade com seus dados específicos de `uploadRoteiros_ft`
- Gera resultados em `reportDataPlanoMidiaWeekResultGb_dm_vw`

---

## 🔑 PONTOS-CHAVE

### **1. planoMidiaDesc_pk vs planoMidiaGrupo_pk**

| Parâmetro | Quando usar | Exemplo |
|-----------|-------------|---------|
| `planoMidiaGrupo_pk` | Identificar o grupo/campanha | 6812 |
| `planoMidiaDesc_pk` | Identificar cidade específica | 7698, 7699, 7700 |

### **2. Número de chamadas por etapa**

| Etapa | Chamadas | O que enviar |
|-------|----------|--------------|
| Criar planoMidiaDesc_pk | 1 | `planoMidiaGrupo_pk` + array de cidades |
| Salvar roteiro simulado | N (loop) | `planoMidiaDesc_pk` individual |
| Executar Databricks | 1 | `planoMidiaGrupo_pk` |

### **3. Fluxo de dados**

```
planoMidiaGrupo_pk (6812)
    ↓
sp_planoMidiaDescInsert
    ↓
planoMidiaDesc_pk (7698, 7699, 7700) ← Um para cada cidade
    ↓
sp_planoColmeiaSimuladoInsert (loop)
    ↓
uploadRoteiros_ft (dados separados por planoMidiaDesc_pk)
    ↓
Databricks recebe planoMidiaGrupo_pk (6812)
    ↓
Databricks busca TODOS os planoMidiaDesc_pk do grupo
    ↓
Databricks processa cada cidade com seus dados específicos
    ↓
Resultados em reportDataPlanoMidiaWeekResultGb_dm_vw
```

---

## ❌ ERROS COMUNS

### **Erro 1: Enviar planoMidiaDesc_pk individual para Databricks**
```javascript
// ❌ ERRADO
for (cada cidade) {
  await axios.post('/databricks-roteiro-simulado', {
    planoMidiaDesc_pk: 7698  // ← Errado! Não deve ser em loop
  });
}

// ✅ CORRETO
await axios.post('/databricks-roteiro-simulado', {
  planoMidiaDesc_pk: 6812  // ← PK do GRUPO, uma vez só
});
```

### **Erro 2: Enviar planoMidiaGrupo_pk para sp_planoColmeiaSimuladoInsert**
```javascript
// ❌ ERRADO
await axios.post('/roteiro-simulado', {
  planoMidiaDesc_pk: 6812  // ← Errado! Deve ser o PK individual
});

// ✅ CORRETO
await axios.post('/roteiro-simulado', {
  planoMidiaDesc_pk: 7698  // ← PK individual da cidade
});
```

---

## 📊 TABELAS ENVOLVIDAS

### **1. planoMidiaDesc_dm**
- Armazena descrições de planos de mídia
- Um registro por cidade
- Campos: `pk`, `cidade_st`, `estado_st`, `sex_st`, `age_st`, `ibgeCode_vl`

### **2. planoMidia_dm_vw**
- Relaciona grupos com descrições
- `planoMidiaGrupo_pk`: PK do grupo (ex: 6812)
- `planoMidiaDescPk_st`: CSV de PKs individuais (ex: "7698,7699,7700")

### **3. uploadRoteiros_ft**
- Armazena dados do roteiro simulado
- Um registro por semana/grupo/cidade
- Campos: `planoMidiaDesc_pk`, `week_vl`, `grupoSub_st`, `contagem_vl`, etc.

### **4. reportDataPlanoMidiaWeekResultGb_dm_vw**
- Resultados finais após processamento Databricks
- Campos: `report_pk`, `cidade_st`, `week_vl`, `impactos_vl`, `coberturaPessoas_vl`

---

**Data**: 2025-11-19  
**Branch**: `fix-roteiro-simulado`  
**Status**: ✅ Fluxo corrigido e documentado

