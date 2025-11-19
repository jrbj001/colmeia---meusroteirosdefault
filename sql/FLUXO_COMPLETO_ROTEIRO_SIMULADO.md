# 🔄 FLUXO COMPLETO DO ROTEIRO SIMULADO

## 📋 VISÃO GERAL

O roteiro simulado permite criar planejamentos de mídia com dados fictícios para teste. O fluxo envolve:
1. **Frontend**: Coleta dados do usuário e prepara requisições
2. **Backend**: Processa e salva dados no banco
3. **Databricks**: Executa cálculos e gera resultados

---

## 🎯 FLUXO DETALHADO

### **ETAPA 1: Preparação no Frontend**

**Arquivo**: `src/screens/CriarRoteiro/CriarRoteiro.tsx`

**Função**: `salvarRoteiroSimulado()` (linha ~486)

#### 1.1. Coleta de Dados
```typescript
// Usuário seleciona:
- pracasSelecionadasSimulado: Array de cidades
- quantidadeSemanas: Número de semanas
- tabelaSimulado: Dados de cada grupo/subgrupo por cidade
```

#### 1.2. Preparação das Praças (linhas 600-638)
```typescript
for (cada praça selecionada) {
  // Buscar código IBGE da cidade
  const ibgeCode = await buscarCodigoIBGE(cidade, estado);
  
  // Montar objeto para criar planoMidiaDesc_pk
  allRecordsJson.push({
    cidade_st: cidadeFormatada,
    estado_st: praca.estado,
    sex_st: targetSalvoLocal.sexo,
    age_st: targetSalvoLocal.faixaEtaria,
    ibgeCode_vl: ibgeCode
  });
  
  pracasComIbge.push({ praca, ibgeCode, cidadeFormatada });
}
```

---

### **ETAPA 2: Criação dos planoMidiaDesc_pk**

**Arquivo Backend**: `api/plano-midia-desc.js`

**Stored Procedure**: `sp_planoMidiaDescInsert`

#### 2.1. Frontend envia TODAS as cidades de uma vez (linhas 648-651)
```typescript
const descResponse = await axios.post('/plano-midia-desc', {
  planoMidiaGrupo_pk: planoMidiaGrupo_pk,
  recordsJson: allRecordsJson  // ← TODAS AS CIDADES!
});
```

#### 2.2. Backend processa (api/plano-midia-desc.js)
```javascript
const result = await pool.request()
  .input('planoMidiaGrupo_pk', planoMidiaGrupo_pk)
  .input('recordsJson', JSON.stringify(recordsJson))
  .execute('[serv_product_be180].[sp_planoMidiaDescInsert]');
```

#### 2.3. Stored Procedure: `sp_planoMidiaDescInsert`

**⚠️ PROBLEMA IDENTIFICADO**: Esta SP está **sobrescrevendo** o `planoMidiaDescPk_st` em vez de concatenar!

**Comportamento Atual (ERRADO)**:
```sql
-- Para cada cidade no JSON:
UPDATE planoMidia_dm_vw
SET planoMidiaDescPk_st = '12345'  -- ← SOBRESCREVE!
WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
```

**Comportamento Esperado (CORRETO)**:
```sql
-- Para cada cidade no JSON:
UPDATE planoMidia_dm_vw
SET planoMidiaDescPk_st = CONCAT(planoMidiaDescPk_st, ',12345')  -- ← CONCATENA!
WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
```

#### 2.4. Frontend recebe os PKs criados (linhas 658-664)
```typescript
descResponse.data.forEach((item, idx) => {
  planosMidiaDescPk.push(item.new_pk);
  console.log(`✅ planoMidiaDesc_pk criado para ${pracasComIbge[idx].praca.nome_cidade}: ${item.new_pk}`);
});
```

**Resultado Esperado**:
```
✅ planoMidiaDesc_pk criado para SAO PAULO: 12345
✅ planoMidiaDesc_pk criado para RIO DE JANEIRO: 12346
✅ planoMidiaDesc_pk criado para BELO HORIZONTE: 12347
```

---

### **ETAPA 3: Salvar Roteiro Simulado (Loop por Cidade)**

**Arquivo Frontend**: `src/screens/CriarRoteiro/CriarRoteiro.tsx` (linhas 667-789)

**Arquivo Backend**: `api/roteiro-simulado.js`

**Stored Procedure**: `sp_planoColmeiaSimuladoInsert`

#### 3.1. Frontend envia dados de CADA cidade separadamente
```typescript
for (let i = 0; i < pracasComIbge.length; i++) {
  const { praca } = pracasComIbge[i];
  const planoMidiaDesc_pk = planosMidiaDescPk[i];  // ← PK específico da cidade
  
  // Buscar tabela desta cidade específica
  const tabelaDaPraca = tabelaSimulado[praca.id_cidade];
  
  // Preparar dados
  const dadosTabela = tabelaDaPraca.map(linha => ({
    grupoSub_st: linha.grupoSub_st,
    visibilidade: linha.visibilidade,
    seDigitalInsercoes_vl: linha.seDigitalInsercoes_vl || 0,
    seDigitalMaximoInsercoes_vl: linha.seDigitalMaximoInsercoes_vl || 0,
    semanas: linha.semanas || []
  }));
  
  // Enviar para API
  await axios.post('/roteiro-simulado', {
    planoMidiaDesc_pk,      // ← PK específico desta cidade
    dadosTabela,            // ← Dados desta cidade
    pracasSelecionadas: [praca],
    quantidadeSemanas
  });
}
```

#### 3.2. Backend processa (api/roteiro-simulado.js, linhas 49-106)
```javascript
// Transformar dados para formato da SP
const recordsJson = [];

dadosTabela.forEach(linha => {
  const { grupoSub_st, visibilidade, seDigitalInsercoes_vl, seDigitalMaximoInsercoes_vl, semanas } = linha;
  
  // Se houver semanas configuradas
  if (semanas.length > 0) {
    semanas.forEach((semana, index) => {
      recordsJson.push({
        week_vl: index + 1,
        grupoSub_st: grupoSub_st,
        contagem_vl: parseInt(semana.insercaoComprada) || 0,
        seDigitalInsercoes_vl: parseInt(semana.seDigitalInsercoes_vl) || seDigitalInsercoes_vl || 0,
        seDigitalMaximoInsercoes_vl: parseInt(semana.seDigitalMaximoInsercoes_vl) || seDigitalMaximoInsercoes_vl || 0
      });
    });
  } else {
    // Sem semanas = registro padrão
    recordsJson.push({
      week_vl: 1,
      grupoSub_st: grupoSub_st,
      contagem_vl: 0,
      seDigitalInsercoes_vl: seDigitalInsercoes_vl || 0,
      seDigitalMaximoInsercoes_vl: seDigitalMaximoInsercoes_vl || 0
    });
  }
});
```

#### 3.3. Backend executa SP (api/roteiro-simulado.js, linhas 148-151)
```javascript
const result = await pool.request()
  .input('planoMidiaDesc_pk', planoMidiaDesc_pk)
  .input('recordsJson', JSON.stringify(recordsJson))
  .execute('serv_product_be180.sp_planoColmeiaSimuladoInsert');
```

#### 3.4. Stored Procedure: `sp_planoColmeiaSimuladoInsert`

**Entrada**:
```json
{
  "planoMidiaDesc_pk": 12345,
  "recordsJson": [
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
  ]
}
```

**O que faz**:
1. Deleta dados antigos do `planoMidiaDesc_pk`
2. Insere novos registros na tabela `uploadRoteiros_ft`
3. Cada linha do JSON vira uma linha na tabela

---

### **ETAPA 4: Executar Databricks**

**Arquivo Frontend**: `src/screens/CriarRoteiro/CriarRoteiro.tsx` (linha ~800+)

**Arquivo Backend**: `api/databricks-roteiro-simulado.js`

#### 4.1. Frontend dispara job Databricks PARA CADA cidade
```typescript
for (const resultado of resultadosPraças) {
  await axios.post('/databricks-roteiro-simulado', {
    planoMidiaDesc_pk: resultado.planoMidiaDesc_pk,  // ← PK específico
    date_dh: new Date().toISOString(),
    date_dt: new Date().toISOString().split('T')[0]
  });
}
```

#### 4.2. Backend chama Databricks (api/databricks-roteiro-simulado.js)
```javascript
const requestBody = {
  job_id: parseInt(databricksJobId),
  notebook_params: {
    planoMidiaGrupo_pk: planoMidiaDesc_pk.toString(),  // ← Usa o PK individual
    date_dh: date_dh,
    date_dt: date_dt
  }
};

const response = await axios.post(
  `${databricksUrl}/api/2.1/jobs/run-now`,
  requestBody,
  { headers: { 'Authorization': `Bearer ${authToken}` } }
);
```

#### 4.3. Databricks processa
- Script: `be180_product_sampleMaxAllInbound.py`
- Job ID: `253075688202926`
- Lê dados de `uploadRoteiros_ft` onde `planoMidiaDesc_pk = X`
- Executa cálculos de impacto, cobertura, etc.
- Salva resultados em tabelas de resultado

---

## 🔍 STORED PROCEDURES ENVOLVIDAS

### 1. **sp_planoMidiaDescInsert**
- **Entrada**: `planoMidiaGrupo_pk`, `recordsJson` (array de cidades)
- **Saída**: Array de `new_pk` (um para cada cidade)
- **Tabelas afetadas**: 
  - `planoMidiaDesc_dm` (INSERT)
  - `planoMidia_dm_vw` (UPDATE `planoMidiaDescPk_st`)
- **⚠️ BUG**: Sobrescreve `planoMidiaDescPk_st` em vez de concatenar

### 2. **sp_planoColmeiaSimuladoInsert**
- **Entrada**: `planoMidiaDesc_pk`, `recordsJson` (array de semanas/grupos)
- **Saída**: Sucesso/Erro
- **Tabelas afetadas**: 
  - `uploadRoteiros_ft` (DELETE + INSERT)

---

## 🐛 PROBLEMA ATUAL

### **Sintoma**:
Quando criamos roteiro simulado para múltiplas cidades (ex: São Paulo, Rio de Janeiro), o campo `planoMidiaDescPk_st` na tabela `planoMidia_dm_vw` fica com apenas o **último código** em vez de todos concatenados.

### **Exemplo**:

**Esperado**:
```
planoMidiaGrupo_pk: 6812
planoMidiaDescPk_st: "12345,12346,12347"  ← Todos os códigos
```

**Atual (ERRADO)**:
```
planoMidiaGrupo_pk: 6812
planoMidiaDescPk_st: "12347"  ← Apenas o último!
```

### **Causa Raiz**:
A stored procedure `sp_planoMidiaDescInsert` está fazendo:
```sql
UPDATE planoMidia_dm_vw
SET planoMidiaDescPk_st = @new_pk  -- ← SOBRESCREVE!
WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
```

Deveria fazer:
```sql
UPDATE planoMidia_dm_vw
SET planoMidiaDescPk_st = CASE
  WHEN planoMidiaDescPk_st IS NULL OR planoMidiaDescPk_st = '' 
    THEN CAST(@new_pk AS NVARCHAR(MAX))
  ELSE CONCAT(planoMidiaDescPk_st, ',', @new_pk)
END
WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk
```

---

## 📊 TABELAS PRINCIPAIS

### 1. **planoMidiaDesc_dm**
- Armazena descrições de planos de mídia
- Campos: `pk`, `cidade_st`, `estado_st`, `sex_st`, `age_st`, `ibgeCode_vl`

### 2. **planoMidia_dm_vw** (VIEW)
- Relaciona grupos com descrições
- Campos importantes: `planoMidiaGrupo_pk`, `planoMidiaDescPk_st`
- **⚠️ `planoMidiaDescPk_st`**: Deveria ser CSV de PKs, mas está sendo sobrescrito

### 3. **uploadRoteiros_ft**
- Armazena dados do roteiro simulado
- Campos: `planoMidiaDesc_pk`, `week_vl`, `grupoSub_st`, `contagem_vl`, etc.

### 4. **reportDataPlanoMidiaWeekResultGb_dm_vw**
- Resultados finais após processamento Databricks
- Campos: `report_pk`, `cidade_st`, `week_vl`, `impactos_vl`, `coberturaPessoas_vl`

---

## ✅ SOLUÇÃO PROPOSTA

### **Opção 1: Corrigir a SP `sp_planoMidiaDescInsert`**
Alterar o UPDATE para concatenar em vez de sobrescrever:

```sql
ALTER PROCEDURE [serv_product_be180].[sp_planoMidiaDescInsert]
  @planoMidiaGrupo_pk INT,
  @recordsJson NVARCHAR(MAX)
AS
BEGIN
  -- ... código existente ...
  
  -- Para cada registro no JSON:
  UPDATE planoMidia_dm_vw
  SET planoMidiaDescPk_st = CASE
    WHEN planoMidiaDescPk_st IS NULL OR planoMidiaDescPk_st = '' 
      THEN CAST(@new_pk AS NVARCHAR(MAX))
    ELSE CONCAT(planoMidiaDescPk_st, ',', @new_pk)  -- ← CONCATENA!
  END
  WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk;
  
  -- ... resto do código ...
END
```

### **Opção 2: Workaround no Frontend (já implementado, mas não funciona)**
O frontend já tenta enviar todas as cidades de uma vez (linhas 648-651), mas a SP ainda sobrescreve.

---

## 🔬 PRÓXIMOS PASSOS

1. ✅ Documentar fluxo completo
2. ⏳ Inspecionar código da SP `sp_planoMidiaDescInsert`
3. ⏳ Propor correção da SP
4. ⏳ Testar correção
5. ⏳ Validar em produção

---

## 📝 LOGS IMPORTANTES

### Frontend (CriarRoteiro.tsx)
```
📋 Criando 3 planoMidiaDesc_pk em UMA ÚNICA CHAMADA...
✅ planoMidiaDesc_pk criado para SAO PAULO: 12345
✅ planoMidiaDesc_pk criado para RIO DE JANEIRO: 12346
✅ planoMidiaDesc_pk criado para BELO HORIZONTE: 12347
```

### Backend (plano-midia-desc.js)
```
🔍 DEBUG plano-midia-desc - Dados recebidos:
📊 planoMidiaGrupo_pk: 6812
📊 recordsJson: [
  { cidade_st: "SAO PAULO", estado_st: "SP", ... },
  { cidade_st: "RIO DE JANEIRO", estado_st: "RJ", ... },
  { cidade_st: "BELO HORIZONTE", estado_st: "MG", ... }
]
```

### Backend (roteiro-simulado.js)
```
🎯 [roteiroSimulado] Iniciando salvamento do roteiro simulado...
📊 Dados recebidos: { planoMidiaDesc_pk: 12345, totalLinhas: 5, pracas: 1 }
📝 Registros processados: 10
🚀 Executando sp_planoColmeiaSimuladoInsert...
✅ Procedure executada com sucesso!
```

---

**Última atualização**: 2025-11-19
**Branch**: `fix-roteiro-simulado`
**Status**: 🔍 Investigando bug na SP `sp_planoMidiaDescInsert`

