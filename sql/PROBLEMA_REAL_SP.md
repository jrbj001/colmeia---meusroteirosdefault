# 🎯 PROBLEMA REAL: São Paulo sem pontos no mapa

**Data**: 2025-11-20  
**Grupo**: 6550  
**Cidades**: São Paulo (7724), Rio de Janeiro (7725)

---

## 🔍 **CAUSA RAIZ REAL**

### **O que aconteceu:**

1. ✅ Usuário selecionou 2 cidades: **São Paulo** e **Rio de Janeiro**
2. ✅ Frontend criou PKs para ambas (7724 e 7725)
3. ❌ **São Paulo NÃO tinha dados configurados na interface web** (`tabelaSimulado[7724]` estava vazia ou não existia)
4. ⚠️ Frontend lançou erro: `"Tabela não encontrada para a praça SAO PAULO"` ou `"Tabela vazia para a praça SAO PAULO"`
5. ⚠️ Erro foi capturado pelo `catch` (linha 774-788) e adicionado a `errosPraças[]`
6. ✅ Frontend continuou processando **Rio de Janeiro**
7. ✅ **Rio de Janeiro tinha dados configurados** na interface:
   - G1D: `insercaoComprada = 2` ✅
   - Outros grupos: `insercaoComprada = 0`
8. ✅ Databricks foi executado para o grupo 6550
9. ❌ **Databricks não gerou pontos para SP porque não havia dados salvos no banco**

---

## 📊 **EVIDÊNCIAS**

### **Rio de Janeiro (7725) - SUCESSO**
```javascript
// Dados enviados para /roteiro-simulado
{
  planoMidiaDesc_pk: 7725,
  dadosTabela: [
    { grupoSub_st: "G1D", visibilidade: "100", semanas: [{ insercaoComprada: 2 }] },
    { grupoSub_st: "G1E", visibilidade: "100", semanas: [{ insercaoComprada: 0 }] },
    // ... mais 7 grupos
  ]
}

// Resultado no banco
✅ insertedCount_vl: 36 registros
✅ 2 pontos apareceram no mapa (G1D com contagem = 2)
```

### **São Paulo (7724) - FALHOU**
```javascript
// NÃO APARECE NO LOG!
❌ Provável erro capturado:
   "Tabela não encontrada para a praça SAO PAULO (ID: 7724)"
   ou
   "Tabela vazia para a praça SAO PAULO (ID: 7724)"

// Resultado
❌ 0 registros salvos
❌ 0 pontos no mapa
```

---

## 🔧 **ONDE ESTÁ O PROBLEMA NO CÓDIGO**

### **CriarRoteiro.tsx - Linha 720-726**
```typescript
if (!tabelaDaPraca) {
  const todasChaves = Object.keys(tabelaSimulado);
  throw new Error(
    `Tabela não encontrada para a praça ${praca.nome_cidade} (ID: ${praca.id_cidade}, tipo: ${typeof praca.id_cidade}). ` +
    `Chaves disponíveis: ${todasChaves.join(', ')}`
  );
}
```

### **CriarRoteiro.tsx - Linha 728-730**
```typescript
if (tabelaDaPraca.length === 0) {
  throw new Error(`Tabela vazia para a praça ${praca.nome_cidade} (ID: ${praca.id_cidade})`);
}
```

### **CriarRoteiro.tsx - Linha 774-788 (Catch)**
```typescript
catch (error: any) {
  console.error(`\n❌ ===== ERRO AO PROCESSAR PRAÇA ${i + 1}/${pracasSelecionadasSimulado.length} =====`);
  console.error(`❌ Praça: ${praca.nome_cidade} (ID: ${praca.id_cidade})`);
  console.error(`❌ Erro:`, error);
  
  errosPraças.push({
    praca: praca,
    erro: error.response?.data?.message || error.message || 'Erro desconhecido'
  });
  
  // Continuar processando as outras praças mesmo se uma falhar ← AQUI!
  console.log(`⚠️ Continuando processamento das outras praças...`);
}
```

---

## 🎯 **SOLUÇÕES**

### **Solução 1: Usuário deve configurar dados para São Paulo** (RECOMENDADO)
- **Ação**: Na interface web, adicionar dados para São Paulo
- **Como**: 
  1. Ir para Aba 4 (Roteiro Simulado)
  2. Selecionar São Paulo
  3. Configurar valores de `insercaoComprada` para os grupos desejados
  4. Salvar novamente

### **Solução 2: Mostrar erro mais claro para o usuário**
- **Ação**: Adicionar validação antes de salvar
- **Código**: Verificar se todas as praças selecionadas têm dados configurados
- **Benefício**: Usuário saberá imediatamente que falta configurar SP

### **Solução 3: Permitir salvar praças sem dados**
- **Ação**: Remover validação de tabela vazia
- **Risco**: Pode criar praças sem pontos no mapa
- **Não recomendado**: Não faz sentido criar uma praça sem dados

---

## 📝 **COMO VERIFICAR**

### **Verificar se São Paulo tem dados configurados:**

1. **No console do navegador**, após selecionar as praças, execute:
```javascript
console.log('Tabelas configuradas:', tabelaSimulado);
console.log('São Paulo (7724):', tabelaSimulado[7724]);
console.log('Rio de Janeiro (7725):', tabelaSimulado[7725]);
```

2. **Se `tabelaSimulado[7724]` for `undefined` ou `[]`:**
   - ❌ São Paulo não tem dados configurados
   - ✅ Solução: Configurar dados na interface

3. **Se `tabelaSimulado[7724]` tiver dados:**
   - ❌ Há um bug no mapeamento de IDs
   - 🔍 Investigar por que o frontend não está encontrando a tabela

---

## 🔍 **PRÓXIMOS PASSOS**

1. **Adicionar log detalhado de erros** para ver exatamente qual foi o erro de SP
2. **Verificar se o usuário configurou dados para SP** na interface
3. **Se não configurou**: Orientar a configurar
4. **Se configurou**: Investigar bug no mapeamento de IDs

---

## 💡 **MELHORIA SUGERIDA**

Adicionar este código no frontend para mostrar erros ao usuário:

```typescript
// Após o loop de processamento (linha ~790)
if (errosPraças.length > 0) {
  console.log('\n❌ ===== ERROS ENCONTRADOS =====');
  errosPraças.forEach((erro, index) => {
    console.log(`❌ Erro ${index + 1}:`);
    console.log(`   Praça: ${erro.praca.nome_cidade}`);
    console.log(`   ID: ${erro.praca.id_cidade}`);
    console.log(`   Erro: ${erro.erro}`);
  });
  console.log('❌ ===== FIM DOS ERROS =====\n');
  
  // Mostrar alerta para o usuário
  const mensagemErro = errosPraças.map(e => 
    `${e.praca.nome_cidade}: ${e.erro}`
  ).join('\n');
  
  alert(`⚠️ Algumas praças não foram processadas:\n\n${mensagemErro}\n\nAs outras praças foram processadas com sucesso.`);
}
```

Isso vai mostrar claramente para o usuário quais praças falharam e por quê!

