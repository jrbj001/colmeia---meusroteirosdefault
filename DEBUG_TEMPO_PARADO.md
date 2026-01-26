# Debug: Tempo do ProcessingResultsLoader Parado em 00:00

## Problema
O componente `ProcessingResultsLoader` aparece na Aba 6, mas o tempo fica parado em **00:00** e não atualiza a cada 3 segundos.

## Logs Adicionados para Debug

### 1. Hook useRoteiroStatusPolling
```
▶️ Iniciando polling de status do roteiro: [PK]
🔍 Verificando status do roteiro PK: [PK]
📊 Status recebido - inProgress: true dataCriacao: [DATA]
⏱️ Tempo decorrido calculado: [X] segundos
```

### 2. CriarRoteiro.tsx (componente pai)
```
🕐 CriarRoteiro - tempoDecorrido atualizado para: [X] segundos
📍 aguardandoProcessamento: true
📍 planoMidiaGrupo_pk: [PK]
```

### 3. ProcessingResultsLoader (componente filho)
```
🔄 ProcessingResultsLoader renderizando - tempoDecorrido: [X]
⏱️ Tempo formatado: 00:[X] de [X] segundos
```

## Como Usar os Logs

1. **Abrir Console do Navegador** (F12)
2. **Salvar um roteiro simulado**
3. **Observar a sequência de logs**

### Sequência Esperada (a cada 3s):

```
Tempo 0s:
⏳ Roteiro simulado publicado. Ativando polling para aguardar processamento...
📊 PK do roteiro para polling: 123
✅ PK válido encontrado: 123
🕐 CriarRoteiro - tempoDecorrido atualizado para: 0 segundos
🔄 ProcessingResultsLoader renderizando - tempoDecorrido: 0
⏱️ Tempo formatado: 00:00 de 0 segundos
▶️ Iniciando polling de status do roteiro: 123
🔍 Verificando status do roteiro PK: 123
📊 Status recebido - inProgress: true dataCriacao: 2026-01-26...
⏱️ Tempo decorrido calculado: 0 segundos

Tempo 3s:
🔍 Verificando status do roteiro PK: 123
📊 Status recebido - inProgress: true dataCriacao: 2026-01-26...
⏱️ Tempo decorrido calculado: 3 segundos
🕐 CriarRoteiro - tempoDecorrido atualizado para: 3 segundos
🔄 ProcessingResultsLoader renderizando - tempoDecorrido: 3
⏱️ Tempo formatado: 00:03 de 3 segundos

Tempo 6s:
🔍 Verificando status do roteiro PK: 123
📊 Status recebido - inProgress: true dataCriacao: 2026-01-26...
⏱️ Tempo decorrido calculado: 6 segundos
🕐 CriarRoteiro - tempoDecorrido atualizado para: 6 segundos
🔄 ProcessingResultsLoader renderizando - tempoDecorrido: 6
⏱️ Tempo formatado: 00:06 de 6 segundos
```

## Possíveis Problemas e Diagnósticos

### Problema 1: Não aparece "▶️ Iniciando polling"
**Diagnóstico**: Polling não foi ativado
**Logs para verificar**:
- ✅ Deve ter: `✅ PK válido encontrado: [PK]`
- ❌ Se aparecer: `❌ ERRO CRÍTICO: planoMidiaGrupo_pk está null`

**Solução**: PK não foi criado corretamente. Verificar Aba 1.

### Problema 2: Aparece "⏸️ Polling pausado"
**Diagnóstico**: Hook detectou que não deve fazer polling
**Logs para verificar**:
```
⏸️ Polling pausado. enabled: false roteiroPk: null
```

**Possíveis causas**:
- `aguardandoProcessamento` está false
- `planoMidiaGrupo_pk` está null

### Problema 3: Não aparece "🔍 Verificando status" após 3s
**Diagnóstico**: Interval não está rodando
**Possíveis causas**:
- Hook foi re-montado (useEffect rodou de novo)
- Interval foi limpo por engano
- Erro na API /roteiro-status

**Verificar**:
- Aba "Network" do navegador
- Deve mostrar requisição GET para `/api/roteiro-status?pk=[PK]` a cada 3s

### Problema 4: Aparece "🔍 Verificando" mas não "⏱️ Tempo decorrido calculado"
**Diagnóstico**: Problema no cálculo do tempo ou dataCriacao
**Logs para verificar**:
```
📊 Status recebido - inProgress: true dataCriacao: [VERIFICAR SE TEM VALOR]
```

**Possíveis causas**:
- `dataCriacao` vem null ou undefined
- Formato de data está incorreto
- `inProgress` está false quando deveria estar true

### Problema 5: Tempo calcula no hook mas não atualiza na tela
**Diagnóstico**: Componente não está re-renderizando
**Logs para verificar**:
- ✅ Deve ter: `⏱️ Tempo decorrido calculado: 3 segundos` (no hook)
- ✅ Deve ter: `🕐 CriarRoteiro - tempoDecorrido atualizado para: 3 segundos` (no pai)
- ❌ Se NÃO tem: `🔄 ProcessingResultsLoader renderizando - tempoDecorrido: 3` (no filho)

**Solução**: Problema de props não sendo passadas ou componente não re-renderizando.

## Teste Passo a Passo

1. **Limpar console** (clicar no ícone de lixeira)
2. **Salvar roteiro simulado**
3. **Esperar 10 segundos**
4. **Copiar TODO o conteúdo do console**
5. **Enviar os logs para análise**

## Informações Importantes para Coletar

1. **Logs do console** (todos os emojis)
2. **Screenshot da tela** mostrando tempo parado
3. **Aba Network**: 
   - Filtrar por "roteiro-status"
   - Ver se requisições estão sendo feitas
   - Ver response de cada requisição

## Próximos Passos

Se após verificar os logs o problema persistir:
1. Compartilhar os logs do console
2. Compartilhar screenshot da aba Network
3. Informar se algum alert/erro aparece
