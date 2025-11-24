# 🔍 ENGENHARIA REVERSA DO LOG - ROTEIRO SIMULADO

**Data**: 2025-11-20 10:09:12  
**Grupo**: 6549  
**Cidades**: São Paulo, Rio de Janeiro, Salvador, Belo Horizonte

---

## 📊 ANÁLISE DO LOG

### 1️⃣ **CRIAÇÃO DOS PKs INDIVIDUAIS**

```
📊 [pivot-descpks] Registros encontrados: 4
   - Cidade: SAO PAULO, PK: 7720
   - Cidade: RIO DE JANEIRO, PK: 7721
   - Cidade: SALVADOR, PK: 7722
   - Cidade: BELO HORIZONTE, PK: 7723
```

✅ **CORRETO**: Foram criados 4 PKs individuais, um para cada cidade.

---

### 2️⃣ **PONTOS NO MAPA POR CIDADE**

#### 🏙️ **BELO HORIZONTE (PK: 7723)**
```
planoMidia_pk: '12400'
📍 Total de pontos: 2
   - G1D (Digital): 1 ponto - EMPENA DIGITAL (431,733 passantes)
   - G2E (Estático): 1 ponto - (87,805 passantes)
🔷 Total de hexágonos: 2
```

#### 🏙️ **RIO DE JANEIRO (PK: 7721)**
```
planoMidia_pk: '12396'
📍 Total de pontos: 1
   - G1D (Digital): 1 ponto - EMPENA DIGITAL (837,406 passantes)
🔷 Total de hexágonos: 1
```

#### 🏙️ **SÃO PAULO (PK: 7720)**
```
planoMidia_pk: '12394'
📍 Total de pontos: 1
   - G2E (Estático): 1 ponto - OUTDOOR PAPEL SIMPLES (158,485 passantes)
🔷 Total de hexágonos: 1
```

#### 🏙️ **SALVADOR (PK: 7722)**
```
planoMidia_pk: '12398'
📍 Total de pontos: 1
   - G1D (Digital): 1 ponto - EMPENA DIGITAL (232,521 passantes)
🔷 Total de hexágonos: 1
```

---

## 🎯 VALIDAÇÃO DO FLUXO

### ✅ **O QUE ESTÁ CORRETO**

1. **PKs Individuais Criados**: ✅
   - São Paulo: 7720
   - Rio de Janeiro: 7721
   - Salvador: 7722
   - Belo Horizonte: 7723

2. **Cada Cidade Tem Seu Próprio planoMidia_pk**: ✅
   - BH: 12400
   - RJ: 12396
   - SP: 12394
   - Salvador: 12398

3. **Pontos Separados Por Cidade**: ✅
   - Cada cidade mostra apenas seus próprios pontos
   - Não há mistura de dados entre cidades

4. **Tipos de Mídia Identificados Corretamente**: ✅
   - Digital (D): EMPENA DIGITAL
   - Estático (E): OUTDOOR PAPEL SIMPLES

---

## 📋 RESUMO DAS CHAMADAS (ENGENHARIA REVERSA)

### **CHAMADA 1: Criar PKs Individuais**
```javascript
POST /plano-midia-desc
{
  planoMidiaGrupo_pk: 6549,
  recordsJson: [
    { planoMidiaDesc_st: "...", ibgeCode_vl: 3550308 }, // SP
    { planoMidiaDesc_st: "...", ibgeCode_vl: 3304557 }, // RJ
    { planoMidiaDesc_st: "...", ibgeCode_vl: 2927408 }, // Salvador
    { planoMidiaDesc_st: "...", ibgeCode_vl: 3106200 }  // BH
  ]
}

RETORNO: [
  { new_pk: 7720 }, // SP
  { new_pk: 7721 }, // RJ
  { new_pk: 7722 }, // Salvador
  { new_pk: 7723 }  // BH
]
```

---

### **CHAMADA 2: Salvar Dados - São Paulo (PK: 7720)**
```javascript
POST /roteiro-simulado
{
  planoMidiaDesc_pk: 7720,
  dadosTabela: [
    {
      grupoSub_st: "G2E",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [{ insercaoComprada: 1 }]
    }
  ]
}

RESULTADO NO BANCO:
- planoMidia_pk: 12394
- 1 ponto estático (G2E)
- 1 hexágono
```

---

### **CHAMADA 3: Salvar Dados - Rio de Janeiro (PK: 7721)**
```javascript
POST /roteiro-simulado
{
  planoMidiaDesc_pk: 7721,
  dadosTabela: [
    {
      grupoSub_st: "G1D",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [{ insercaoComprada: 1 }]
    }
  ]
}

RESULTADO NO BANCO:
- planoMidia_pk: 12396
- 1 ponto digital (G1D)
- 1 hexágono
```

---

### **CHAMADA 4: Salvar Dados - Salvador (PK: 7722)**
```javascript
POST /roteiro-simulado
{
  planoMidiaDesc_pk: 7722,
  dadosTabela: [
    {
      grupoSub_st: "G1D",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [{ insercaoComprada: 1 }]
    }
  ]
}

RESULTADO NO BANCO:
- planoMidia_pk: 12398
- 1 ponto digital (G1D)
- 1 hexágono
```

---

### **CHAMADA 5: Salvar Dados - Belo Horizonte (PK: 7723)**
```javascript
POST /roteiro-simulado
{
  planoMidiaDesc_pk: 7723,
  dadosTabela: [
    {
      grupoSub_st: "G1D",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [{ insercaoComprada: 1 }]
    },
    {
      grupoSub_st: "G2E",
      visibilidade: "100",
      seDigitalInsercoes_vl: 0,
      seDigitalMaximoInsercoes_vl: 0,
      semanas: [{ insercaoComprada: 1 }]
    }
  ]
}

RESULTADO NO BANCO:
- planoMidia_pk: 12400
- 2 pontos (1 digital G1D + 1 estático G2E)
- 2 hexágonos
```

---

### **CHAMADA 6: Executar Databricks (GRUPO INTEIRO)**
```javascript
POST /databricks-roteiro-simulado
{
  planoMidiaGrupo_pk: 6549,  // ← PK do GRUPO (não os individuais!)
  date_dh: "2025-11-20 10:09:12",
  date_dt: "2025-11-20"
}

DATABRICKS PROCESSA:
- Todas as 4 cidades do grupo 6549
- Gera planoMidia_pk para cada cidade:
  * SP: 12394
  * RJ: 12396
  * Salvador: 12398
  * BH: 12400
```

---

## 🎯 CONCLUSÃO

### ✅ **TUDO ESTÁ FUNCIONANDO CORRETAMENTE!**

1. ✅ **PKs individuais criados** (7720, 7721, 7722, 7723)
2. ✅ **Dados salvos separadamente** para cada cidade
3. ✅ **Databricks processou o grupo** (6549) e gerou planoMidia_pk para cada cidade
4. ✅ **Pontos aparecem no mapa** corretamente separados por cidade
5. ✅ **Não há mistura de dados** entre cidades

### 📊 **TOTAL DE CHAMADAS: 6**

| # | Endpoint | Parâmetro | Valor | Status |
|---|----------|-----------|-------|--------|
| 1 | `/plano-midia-desc` | `planoMidiaGrupo_pk` | 6549 | ✅ |
| 2 | `/roteiro-simulado` | `planoMidiaDesc_pk` | 7720 (SP) | ✅ |
| 3 | `/roteiro-simulado` | `planoMidiaDesc_pk` | 7721 (RJ) | ✅ |
| 4 | `/roteiro-simulado` | `planoMidiaDesc_pk` | 7722 (Salvador) | ✅ |
| 5 | `/roteiro-simulado` | `planoMidiaDesc_pk` | 7723 (BH) | ✅ |
| 6 | `/databricks-roteiro-simulado` | `planoMidiaGrupo_pk` | 6549 | ✅ |

---

## 🚀 **STATUS FINAL: TUDO OK!**

O fluxo está funcionando perfeitamente! Cada cidade tem seus próprios pontos e não há mais sobreposição de dados. 🎉

