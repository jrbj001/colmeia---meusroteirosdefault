# 🚨 PROBLEMA: São Paulo sem pontos no mapa

**Data**: 2025-11-20 10:35:14  
**Grupo**: 6550  
**Cidades**: São Paulo (7724), Rio de Janeiro (7725)

---

## 📊 ANÁLISE DO LOG

### ✅ **Rio de Janeiro (PK: 7725) - FUNCIONANDO**

```
📊 PARÂMETRO 1 - planoMidiaDesc_pk: 7725
📊 PARÂMETRO 2 - recordsJson (total de registros): 9

Registros enviados:
- G1D: contagem_vl = 2 ✅
- G1E: contagem_vl = 0
- G2D: contagem_vl = 0
- G2E: contagem_vl = 0
- G3ME: contagem_vl = 0
- G3RE: contagem_vl = 0
- G5MD: contagem_vl = 0
- G5RD: contagem_vl = 0
- G6: contagem_vl = 0

Resultado:
✅ insertedCount_vl: 36
✅ 2 pontos apareceram no mapa (G1D)
```

---

### ❌ **São Paulo (PK: 7724) - NÃO FUNCIONANDO**

```
❌ NÃO ENCONTREI NO LOG a chamada POST /roteiro-simulado para PK 7724
❌ 0 pontos no mapa
```

---

## 🔍 **HIPÓTESES**

### **Hipótese 1: Frontend não enviou dados para SP**
- O frontend pode ter pulado a chamada para São Paulo
- Ou a chamada falhou silenciosamente

### **Hipótese 2: SP não tinha dados para enviar**
- O Excel pode não ter dados para São Paulo
- Ou todos os grupos tinham `contagem_vl = 0`

### **Hipótese 3: Erro na criação do PK**
- O PK 7724 pode não ter sido criado corretamente
- Ou foi criado mas não foi associado ao grupo correto

---

## 🔧 **O QUE VERIFICAR**

1. **Verificar se o frontend está enviando dados para AMBAS as cidades**
   - Preciso ver o log da chamada `/plano-midia-desc`
   - Preciso ver quantas chamadas `/roteiro-simulado` foram feitas

2. **Verificar se o Excel tinha dados para São Paulo**
   - Verificar se havia linhas com `contagem_vl > 0` para SP

3. **Verificar se o PK 7724 existe no banco**
   - Query: `SELECT * FROM planoMidiaDesc_dm WHERE pk = 7724`

---

## 📝 **AÇÃO NECESSÁRIA**

Preciso ver o log COMPLETO desde o início, incluindo:
1. ✅ Chamada `/plano-midia-desc` (FALTA NO LOG)
2. ❌ Chamada `/roteiro-simulado` para SP (7724) - **NÃO APARECE**
3. ✅ Chamada `/roteiro-simulado` para RJ (7725) - OK
4. ✅ Chamada `/databricks-roteiro-simulado` - OK

---

## 🎯 **CONCLUSÃO PRELIMINAR**

O problema é que **o frontend não está enviando dados para São Paulo (7724)**.

Possíveis causas:
1. O Excel não tinha dados para SP
2. O frontend está filtrando/pulando SP
3. Houve erro na lógica de loop das cidades

**PRÓXIMO PASSO**: Verificar o código do frontend que faz o loop das cidades e envia para `/roteiro-simulado`.

