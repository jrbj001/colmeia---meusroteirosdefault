# Correção: Tratamento de 404 para Roteiros Simulados

## Problema Identificado

Quando um roteiro simulado terminava de processar, a tentativa de carregar todos os dados falhava completamente porque **roteiros simulados só geram dados de Vias Públicas**.

### Erros 404 Esperados (Roteiros Simulados):
- ❌ `/api/report-indicadores-summary` → 404
- ❌ `/api/report-indicadores-target` → 404
- ❌ `/api/report-indicadores-target-summary` → 404
- ❌ `/api/report-indicadores-week` → 404
- ❌ `/api/report-indicadores-week-summary` → 404
- ❌ `/api/report-indicadores-week-target` → 404
- ❌ `/api/report-indicadores-week-target-summary` → 404

### Dados Disponíveis (Roteiros Simulados):
- ✅ `/api/report-indicadores-vias-publicas` → 200 OK

## Causa

O código usava `Promise.all()` que **falha completamente** se qualquer requisição falhar:

```typescript
// ❌ ANTES: Se UMA falhar, TODAS falham
const [response1, response2, response3] = await Promise.all([
  axios.post('/api/endpoint1'),  // ✅ 200
  axios.post('/api/endpoint2'),  // ❌ 404 - QUEBRA TUDO
  axios.post('/api/endpoint3'),  // ✅ 200 - Nem executa
]);
```

## Solução Aplicada

Mudamos para `Promise.allSettled()` que **permite falhas individuais**:

```typescript
// ✅ DEPOIS: Cada uma pode falhar independentemente
const results = await Promise.allSettled([
  axios.post('/api/endpoint1'),  // ✅ 200
  axios.post('/api/endpoint2'),  // ❌ 404 - OK, continua
  axios.post('/api/endpoint3'),  // ✅ 200 - Executa normalmente
]);

// Extrair apenas as que tiveram sucesso
const [response1, response2, response3] = results.map(result => 
  result.status === 'fulfilled' ? result.value : null
);
```

## Mudanças Implementadas

### 1. Função `carregarDadosResultados()`

**ANTES**:
```typescript
const [responseGeral, ...] = await Promise.all([...]);

if (responseGeral.data.success) {  // ❌ Quebra se responseGeral for null
  setDadosResultados(responseGeral.data.data);
}
```

**DEPOIS**:
```typescript
const results = await Promise.allSettled([...]);
const [responseGeral, ...] = results.map(r => r.status === 'fulfilled' ? r.value : null);

if (responseGeral?.data?.success) {  // ✅ Safe navigation
  setDadosResultados(responseGeral.data.data);
} else {
  console.log('ℹ️ Dados não disponíveis (normal para roteiros simulados)');
}
```

### 2. Função `carregarDadosSemanaisTarget()`

Mesma lógica aplicada para os dados semanais de target.

## Comportamento Esperado Agora

### Para Roteiros Simulados:
```
📊 Todas as requisições concluídas!
✅ Dados gerais carregados: 15
ℹ️ Dados de target não disponíveis (normal para roteiros simulados)
ℹ️ Dados semanais não disponíveis (normal para roteiros simulados)
✅ Carregamento concluído! Dados disponíveis foram processados.
```

### Para Roteiros Completos:
```
📊 Todas as requisições concluídas!
✅ Dados gerais carregados: 150
✅ Totais gerais carregados
✅ Dados de target carregados: 45
✅ Totais de target carregados
✅ Dados semanais carregados: 80
✅ Resumo semanal carregado
✅ Carregamento concluído! Dados disponíveis foram processados.
```

## Resultado

Agora:
- ✅ Roteiros simulados carregam apenas Vias Públicas
- ✅ Roteiros completos carregam todos os dados
- ✅ 404 não quebra mais o fluxo
- ✅ Mensagens informativas no console
- ✅ Interface mostra apenas as seções com dados disponíveis

## Teste

1. Criar um roteiro simulado
2. Aguardar processamento (timer deve funcionar)
3. Quando terminar, deve mostrar apenas a tabela de Vias Públicas
4. Console deve mostrar mensagens informativas (ℹ️) para dados não disponíveis
5. **NÃO** deve mostrar erros ❌ no console
