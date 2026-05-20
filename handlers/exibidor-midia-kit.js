const { put, del } = require('@vercel/blob');
const { sql, getPool } = require('./db');

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

module.exports = async (req, res) => {
  const pool = await getPool();

  /* ──────────────────────────────────────────────────
     GET  ?action=exibidor-midia-kit&exibidor_pk=N
     Retorna a URL pública do mídia kit
  ────────────────────────────────────────────────── */
  if (req.method === 'GET') {
    const pk = Number(req.query.exibidor_pk);
    if (!pk) return res.status(400).json({ success: false, error: 'exibidor_pk obrigatório' });

    const r = await pool.request()
      .input('pk', sql.Int, pk)
      .query('SELECT midiaKit_url_st FROM [serv_product_be180].[exibidor_dm] WHERE exibidor_pk = @pk');

    const row = r.recordset[0];
    if (!row) return res.status(404).json({ success: false, error: 'Exibidor não encontrado' });

    return res.json({ success: true, midiaKit_url_st: row.midiaKit_url_st || null });
  }

  /* ──────────────────────────────────────────────────
     POST  { op: 'upload', exibidor_pk, filename, contentBase64 }
     POST  { op: 'delete', exibidor_pk }
  ────────────────────────────────────────────────── */
  if (req.method === 'POST') {
    const { op, exibidor_pk, filename, contentBase64 } = req.body || {};

    if (!exibidor_pk) return res.status(400).json({ success: false, error: 'exibidor_pk obrigatório' });

    /* ── Delete ── */
    if (op === 'delete') {
      const urlRow = await pool.request()
        .input('pk', sql.Int, exibidor_pk)
        .query('SELECT midiaKit_url_st FROM [serv_product_be180].[exibidor_dm] WHERE exibidor_pk = @pk');
      const urlParaDeletar = urlRow.recordset[0]?.midiaKit_url_st;
      if (urlParaDeletar) {
        try { await del(urlParaDeletar); } catch (_) { /* ignora */ }
      }
      await pool.request()
        .input('pk', sql.Int, exibidor_pk)
        .query("UPDATE [serv_product_be180].[exibidor_dm] SET midiaKit_url_st = NULL WHERE exibidor_pk = @pk");
      return res.json({ success: true });
    }

    /* ── Upload ── */
    if (op === 'upload') {
      if (!contentBase64 || !filename) {
        return res.status(400).json({ success: false, error: 'filename e contentBase64 obrigatórios' });
      }
      if (!filename.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ success: false, error: 'Somente arquivos PDF são aceitos' });
      }

      const buffer = Buffer.from(contentBase64, 'base64');
      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return res.status(400).json({ success: false, error: 'Arquivo maior que 20 MB' });
      }

      // Remove kit anterior se existir
      const atual = await pool.request()
        .input('pk', sql.Int, exibidor_pk)
        .query('SELECT midiaKit_url_st FROM [serv_product_be180].[exibidor_dm] WHERE exibidor_pk = @pk');
      const urlAnterior = atual.recordset[0]?.midiaKit_url_st;
      if (urlAnterior) {
        try { await del(urlAnterior); } catch (_) { /* ignora */ }
      }

      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blobPath = `midia-kits/${exibidor_pk}/${Date.now()}_${safeName}`;
      const blob = await put(blobPath, buffer, {
        access: 'public',
        contentType: 'application/pdf',
      });

      await pool.request()
        .input('pk', sql.Int, exibidor_pk)
        .input('url', sql.NVarChar(2000), blob.url)
        .query("UPDATE [serv_product_be180].[exibidor_dm] SET midiaKit_url_st = @url WHERE exibidor_pk = @pk");

      return res.json({ success: true, midiaKit_url_st: blob.url });
    }

    return res.status(400).json({ success: false, error: `op inválida: ${op}` });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
