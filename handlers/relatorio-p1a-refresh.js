/**
 * POST /api/relatorio-p1a-refresh
 *
 * Reconstrói a tabela de stage `reportDataP1aEmpilhamento_dm` para os
 * roteiros selecionados, executando a stored procedure
 * `serv_product_be180.sp_reportDataP1aEmpilhamentoRefresh`.
 *
 * Assinatura real da SP no schema serv_product_be180:
 *   @planoMidiaGrupoPk_st          NVARCHAR(MAX)  -- CSV de PKs
 *   @skipIfFresherThanMinutes_vl   INT            -- pula refresh se o stage
 *                                                    foi atualizado dentro
 *                                                    desse intervalo (0 = nunca pula)
 *
 * Mapeamento amigável aceito pelo body:
 *   { reportPks, force?: boolean, ttlMinutes?: number }
 *     - force=true       → @skipIfFresherThanMinutes_vl = 0 (sempre atualiza)
 *     - ttlMinutes=N     → @skipIfFresherThanMinutes_vl = N
 *     - nenhum dos dois  → parâmetro omitido (SP usa o default dela)
 *
 * Resposta:
 *   { rows: [{ report_pk, refreshedAt_dh, rowsWritten_vl, skipped_bl, sourceType_st }] }
 */
const { sql, getPool } = require('./db');
const { extractReportPksCsv } = require('./relatorio-p1a-utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { csv, error } = extractReportPksCsv(req.body);
    if (error) return res.status(400).json({ error });

    const force = Boolean(req.body?.force ?? false);
    const ttlMinutes = req.body?.ttlMinutes;

    let skipIfFresherThanMinutes = null;
    if (force) {
      skipIfFresherThanMinutes = 0;
    } else if (typeof ttlMinutes === 'number' && Number.isFinite(ttlMinutes)) {
      skipIfFresherThanMinutes = Math.max(0, Math.floor(ttlMinutes));
    }

    const pool = await getPool();
    const request = pool.request()
      .input('planoMidiaGrupoPk_st', sql.NVarChar(sql.MAX), csv);

    if (skipIfFresherThanMinutes !== null) {
      request.input('skipIfFresherThanMinutes_vl', sql.Int, skipIfFresherThanMinutes);
    }

    console.log(
      `🔄 [relatorio-p1a-refresh] pks=${csv} force=${force} ttl=${ttlMinutes ?? 'default'} → skipIfFresherThanMinutes_vl=${skipIfFresherThanMinutes ?? '(default da SP)'}`,
    );

    const result = await request.execute('[serv_product_be180].[sp_reportDataP1aEmpilhamentoRefresh]');

    return res.status(200).json({ rows: result.recordset || [] });
  } catch (err) {
    console.error('❌ [relatorio-p1a-refresh] Erro:', err);
    return res.status(500).json({ error: err.message || 'Erro ao atualizar stage P1A' });
  }
};
