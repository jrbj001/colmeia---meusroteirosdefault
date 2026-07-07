# Foundation de enriquecimento Google Places

Este documento define o contrato inicial para enriquecimento assíncrono dos ativos de exibidor sem bloquear o MVP de upload.

## Objetivo

- Guardar uma fila de enriquecimento por ativo importado.
- Permitir ativar um worker futuro (cron/job) sem alterar contrato de API do frontend.
- Rastrear status e tentativas de processamento.

## Tabela de fila

Tabela: `serv_product_be180.exibidor_places_enriquecimento_dm`

Campos principais:
- `item_fk`: referência ao item importado.
- `status_st`: `PENDENTE`, `PROCESSANDO`, `CONCLUIDO`, `ERRO`.
- `place_id_st`: identificador retornado pelo Google Places.
- `tipos_st`: tipos resumidos do local.
- `payload_st`: payload bruto da resposta para auditoria.
- `tentativas_vl`: contador de retentativas.
- `processarApos_dh`: agenda de reprocessamento.

## Contrato de API atual

Endpoint: `POST /api/exibidor-inventario`

Operação:
- `op: "queue-places"` com `lote_pk`.

Comportamento:
- Enfileira itens do lote ainda não presentes na fila.
- Não chama Google Places nesta fase.
- Permite evoluir para worker dedicado em fase posterior.

Consulta de fila:
- `GET /api/exibidor-inventario?mode=places-queue`

## Próxima fase sugerida

1. Criar job assíncrono (cron/serverless) para consumir itens `PENDENTE`.
2. Chamar Places Text Search/Details e persistir `place_id_st`, tipos e payload.
3. Aplicar retentativas com backoff e dead-letter para erros definitivos.
4. Expor status de enriquecimento por lote no frontend de solicitações.
