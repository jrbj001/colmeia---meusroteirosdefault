# Debug: Polling do Loading da Aba 6

## Como Testar

### 1. Abrir Console do Navegador
- Chrome/Edge: F12 ou Cmd+Option+I (Mac)
- Firefox: F12 ou Cmd+Option+K (Mac)

### 2. Criar Roteiro e Ver Logs

Ao salvar um roteiro simulado ou fazer upload, você deve ver:

```
▶️ Iniciando polling de status do roteiro: [PK]
🔍 Verificando status do roteiro PK: [PK]
📊 Status recebido - inProgress: true dataCriacao: 2026-01-26...
⏱️ Tempo decorrido calculado: 3 segundos
```

A cada 3 segundos, deve aparecer:
```
🔍 Verificando status do roteiro PK: [PK]
📊 Status recebido - inProgress: true dataCriacao: 2026-01-26...
⏱️ Tempo decorrido calculado: 6 segundos
```

### 3. Quando Processar Completar

```
🔍 Verificando status do roteiro PK: [PK]
📊 Status recebido - inProgress: false dataCriacao: 2026-01-26...
✅ Processamento concluído! Chamando onComplete...
✅ Processamento concluído! Carregando resultados...
🔄 carregarDadosResultados chamada
```

## Problemas Possíveis

### Se não ver os logs "▶️ Iniciando polling":
**Causa**: `aguardandoProcessamento` não foi ativado
**Solução**: Verificar se após salvar o roteiro, o código ativa `setAguardandoProcessamento(true)`

### Se ver "⏸️ Polling pausado":
**Causa**: `enabled` está false ou `roteiroPk` está null
**Logs para verificar**: 
```
⏸️ Polling pausado. enabled: false roteiroPk: null
```

### Se ver logs mas tempo não atualiza na tela:
**Causa**: Problema no componente ProcessingResultsLoader
**Verificar**: Se `tempoDecorrido` está sendo passado corretamente

### Se não ver logs de verificação (🔍):
**Causa**: Polling não está rodando
**Verificar**: 
1. Console tem erros?
2. Network tab mostra requisições para `/roteiro-status`?

## Teste Manual

1. **Criar roteiro simulado**
2. **Abrir console imediatamente**
3. **Verificar se aparece**: `▶️ Iniciando polling`
4. **Contar 3 segundos**: Deve aparecer nova verificação
5. **Ver na tela**: Tempo deve mudar de 00:00 para 00:03, depois 00:06...

## Se ainda não funcionar

Compartilhe os logs do console para análise:
- Capture TODOS os logs desde o momento que salva o roteiro
- Capture a aba "Network" mostrando as requisições
- Tire print da tela mostrando o tempo parado
