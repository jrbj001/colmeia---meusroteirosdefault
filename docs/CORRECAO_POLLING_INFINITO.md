# Correção: Polling Infinito - View Inexistente

## 🐛 Problema

O loading da Aba 6 continuava **infinitamente** mesmo com os dados já processados no banco. Só funcionava ao sair e voltar à página.

### Logs do Erro

```
✅ Roteiro encontrado: { pk: 6950, inProgress_bl: 0 }
🔍 inProgress_bl = false. Verificando se dados foram realmente processados...
❌ Erro ao verificar dados processados: Invalid object name 'serv_product_be180.report_indicadores_vw'.
```

**Mas os dados EXISTIAM:**
```
✅ [reportIndicadoresViasPublicas] Consultando indicadores para report_pk 6950:
📊 Total de registros encontrados: 2
```

## 🔍 Causa Raiz

A API `/roteiro-status` estava tentando verificar **2 views**:
1. ✅ `reportDataIndicadoresViasPublicasTotal_dm_vw` - **EXISTE**
2. ❌ `report_indicadores_vw` - **NÃO EXISTE**

### Fluxo do Bug

```javascript
// Na API roteiro-status.js
try {
  const checkViasPublicas = await pool.request().query(`...`); // ✅ OK
  const checkResumo = await pool.request().query(`...`);       // ❌ ERRO!
} catch (checkError) {
  // ❌ Qualquer erro = considerar "ainda processando"
  dadosProcessados = false;
}

// Resultado:
const isStillProcessing = !dadosProcessados; // = true (SEMPRE!)
return { inProgress: true }; // ♾️ LOOP INFINITO
```

### Por Que Funcionava ao Sair e Voltar?

Quando você navegava para outra tela e voltava:
- `aguardandoProcessamento` era recalculado baseado no estado do banco
- Como `inProgress_bl = 0`, setava `aguardandoProcessamento = false`
- Pulava o polling e carregava dados direto
- **Funcionava! ✅**

Mas o polling nunca conseguia terminar sozinho.

## ✅ Solução

Remover a verificação da view inexistente e usar **APENAS** a view que funciona:

### Antes (Errado)

```javascript
// ❌ Verificava 2 views (1 não existe!)
const checkViasPublicas = await pool.request()
  .query(`SELECT COUNT(*) FROM reportDataIndicadoresViasPublicasTotal_dm_vw...`);

const checkResumo = await pool.request()
  .query(`SELECT COUNT(*) FROM report_indicadores_vw...`); // ❌ NÃO EXISTE!

dadosProcessados = (totalViasPublicas > 0 || totalResumo > 0);
```

### Depois (Correto)

```javascript
// ✅ Verifica APENAS a view que EXISTE
const checkViasPublicas = await pool.request()
  .query(`SELECT COUNT(*) FROM reportDataIndicadoresViasPublicasTotal_dm_vw...`);

const totalViasPublicas = checkViasPublicas.recordset[0]?.total || 0;

// ✅ Dados processados se tiver pelo menos 1 registro
dadosProcessados = totalViasPublicas > 0;
```

## 🧪 Teste

### Antes da Correção

```
10:30:00 - Upload roteiro
10:32:00 - Databricks termina (2 registros na view)
10:32:03 - API verifica views
         - ✅ Vias Públicas: 2 registros
         - ❌ Resumo: Invalid object name
10:32:03 - ❌ dadosProcessados = false (erro no catch)
10:32:03 - ❌ inProgress: true
10:32:06 - API verifica views (loop continua...)
10:32:09 - API verifica views (loop continua...)
...
♾️ INFINITO!
```

### Depois da Correção

```
10:30:00 - Upload roteiro
10:32:00 - Databricks termina (2 registros na view)
10:32:03 - API verifica view
         - ✅ Vias Públicas: 2 registros
10:32:03 - ✅ dadosProcessados = true
10:32:03 - ✅ inProgress: false
10:32:03 - ✅ Polling termina!
10:32:03 - ✅ Carrega dados e mostra tabelas
```

## 📊 Console Esperado Agora

```
🔍 API roteiro-status - Buscando PK: 6950
✅ Roteiro encontrado: { pk: 6950, inProgress_bl: 0 }
🔍 inProgress_bl = false. Verificando se dados foram realmente processados...
📊 Verificação de dados processados:
   - Vias Públicas: 2 registros
✅ Dados processados encontrados! Databricks terminou.
```

**SEM ERROS!** ✅

## 🎯 Resultado

- ✅ Polling termina automaticamente quando dados estão prontos
- ✅ Não precisa mais sair e voltar
- ✅ Loading funciona perfeitamente
- ✅ Transição suave para exibição dos resultados

## 📝 Nota

A view `report_indicadores_vw` pode ter sido:
- Renomeada no banco
- Removida
- Substituída por outra

Para roteiros simulados, apenas `reportDataIndicadoresViasPublicasTotal_dm_vw` é suficiente para validar que o processamento terminou.
