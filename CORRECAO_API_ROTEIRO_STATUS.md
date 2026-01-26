# Correção: API roteiro-status - Erro "Invalid column name 'pk'"

## Erro Identificado

```
API Response Error: 500 
{
  success: false, 
  error: 'Erro interno do servidor', 
  details: "Invalid column name 'pk'."
}
```

## Causa

A view `serv_product_be180.planoMidiaGrupo_dm_vw` NÃO tem uma coluna chamada `pk`.

A coluna correta é `planoMidiaGrupo_pk`.

## Correção Aplicada

### ANTES (ERRADO):
```sql
SELECT 
  pk,                    -- ❌ Coluna não existe
  planoMidiaGrupo_st,
  inProgress_bl,
  ...
FROM serv_product_be180.planoMidiaGrupo_dm_vw
WHERE pk = @pk          -- ❌ Coluna não existe
```

### DEPOIS (CORRETO):
```sql
SELECT 
  planoMidiaGrupo_pk as pk,  -- ✅ Coluna correta com alias
  planoMidiaGrupo_st,
  inProgress_bl,
  inProgress_st,
  date_dh,
  active_bl,
  delete_bl
FROM serv_product_be180.planoMidiaGrupo_dm_vw
WHERE planoMidiaGrupo_pk = @pk  -- ✅ Coluna correta no WHERE
```

## Validação

Verificado em outras APIs que usam a mesma view:

**api/roteiro-completo.js**:
```sql
SELECT TOP 1 *
FROM serv_product_be180.planoMidiaGrupo_dm_vw
WHERE planoMidiaGrupo_pk = @planoMidiaGrupo_pk  -- ✅ Usa planoMidiaGrupo_pk
```

**api/roteiros.js**:
```sql
SELECT * FROM serv_product_be180.planoMidiaGrupo_dm_vw
WHERE delete_bl = 0
ORDER BY date_dh DESC  -- ✅ date_dh existe
```

## Fallback Implementado

A API agora tenta 3 variações:
1. `planoMidiaGrupo_pk` com `date_dh`
2. `planoMidiaGrupo_pk` sem `date_dh`
3. `PlanoMidiaGrupo_pk` (case-sensitive) sem `date_dh`

## Resultado Esperado

Agora a API deve retornar:
```json
{
  "success": true,
  "data": {
    "pk": 6939,
    "nome": "20260126_TESTE_ROTEIRO_SIMULADO_LOAD_04",
    "inProgress": true,
    "status": "processing",
    "dataCriacao": "2026-01-26T13:00:00.000Z",
    "ativo": true,
    "deletado": false
  }
}
```

## Teste

1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Crie um novo roteiro simulado
3. Observe o console:
   - ✅ Deve ver: `📊 Status recebido - inProgress: true`
   - ✅ Deve ver: `⏱️ Tempo decorrido calculado: 3 segundos`
4. Na tela, o tempo deve atualizar: 00:00 → 00:03 → 00:06...

## Status

✅ **CORRIGIDO** - Aguardando teste
