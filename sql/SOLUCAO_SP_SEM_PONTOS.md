# 🎯 SOLUÇÃO: São Paulo sem pontos no mapa

**Problema**: São Paulo (PK 7724) não tem pontos no mapa, mas Rio de Janeiro (PK 7725) tem.

---

## 🔍 **CAUSA RAIZ IDENTIFICADA**

### **O que aconteceu:**

1. ✅ Frontend criou PKs para ambas as cidades (7724 e 7725)
2. ❌ **São Paulo não tinha dados na tabela do Excel** (ou tabela vazia)
3. ⚠️ Frontend lançou erro: `"Tabela vazia para a praça SAO PAULO"`
4. ⚠️ Erro foi capturado pelo `catch` e adicionado a `errosPraças`
5. ✅ Frontend continuou processando Rio de Janeiro
6. ✅ Rio de Janeiro tinha dados e foi processado com sucesso
7. ✅ Databricks foi executado para o grupo 6550
8. ❌ **Databricks não gerou pontos para SP porque não havia dados salvos**

---

## 📊 **EVIDÊNCIAS DO LOG**

### **Rio de Janeiro (7725) - SUCESSO**
```
📊 PARÂMETRO 1 - planoMidiaDesc_pk: 7725
📊 PARÂMETRO 2 - recordsJson (total de registros): 9

[1]: G1D - contagem_vl: 2 ✅
[2-9]: Outros grupos - contagem_vl: 0

✅ insertedCount_vl: 36
✅ 2 pontos apareceram no mapa
```

### **São Paulo (7724) - FALHOU SILENCIOSAMENTE**
```
❌ NÃO APARECE NO LOG (erro foi capturado)
❌ Provável erro: "Tabela vazia para a praça SAO PAULO"
❌ 0 registros salvos
❌ 0 pontos no mapa
```

---

## 🔧 **SOLUÇÕES POSSÍVEIS**

### **Solução 1: Verificar o Excel**
- **Ação**: Verificar se o Excel tem dados para São Paulo
- **Como**: Abrir o Excel e verificar se há linhas com `insercaoComprada > 0` para SP

### **Solução 2: Permitir tabelas vazias**
- **Ação**: Remover a validação que impede tabelas vazias
- **Código**: Comentar linhas 728-730 em `CriarRoteiro.tsx`
- **Risco**: Pode criar praças sem dados no banco

### **Solução 3: Melhorar tratamento de erros**
- **Ação**: Mostrar erro mais claro para o usuário
- **Código**: Adicionar log mais detalhado no `catch`

---

## 🎯 **RECOMENDAÇÃO**

### **Verificar o Excel primeiro!**

Antes de mudar o código, verifique:

1. **O Excel tem dados para São Paulo?**
   - Abra o Excel usado no upload
   - Procure por linhas com cidade "SAO PAULO" ou "SÃO PAULO"
   - Verifique se há valores em `insercaoComprada` > 0

2. **Se NÃO tem dados:**
   - ✅ **Comportamento está correto!**
   - O sistema não deve criar pontos se não há dados
   - Adicione dados para SP no Excel e tente novamente

3. **Se TEM dados:**
   - ❌ **Há um bug no mapeamento**
   - O `id_cidade` pode estar errado
   - O nome da cidade pode estar diferente
   - Preciso ver o Excel para debugar

---

## 📝 **PRÓXIMOS PASSOS**

1. **Verificar o Excel usado no upload**
2. **Se não tem dados para SP**: Adicionar dados e fazer novo upload
3. **Se tem dados para SP**: Investigar por que a tabela não foi encontrada

---

## 🔍 **COMO DEBUGAR**

Para ver o erro exato que aconteceu com São Paulo, adicione este log no frontend:

```typescript
if (errosPraças.length > 0) {
  console.log('\n❌ ===== ERROS ENCONTRADOS =====');
  errosPraças.forEach((erro, index) => {
    console.log(`❌ Erro ${index + 1}:`);
    console.log(`   Praça: ${erro.praca.nome_cidade}`);
    console.log(`   ID: ${erro.praca.id_cidade}`);
    console.log(`   Erro: ${erro.erro}`);
  });
  console.log('❌ ===== FIM DOS ERROS =====\n');
}
```

Isso vai mostrar exatamente qual foi o erro de São Paulo!

