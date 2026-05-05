const { sql, getPool } = require('./db');

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function isValidEmail(s) {
  if (!s || !String(s).trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT TOP 500
          e.exibidor_pk,
          e.nome_st,
          e.nome_fantasia_st,
          e.codigo_st,
          e.cnpj_st,
          e.cidade_st,
          e.estado_st,
          e.active_bl,
          e.dataCriacao_dh,
          (SELECT TOP 1 d.dominio_st
           FROM [serv_product_be180].[exibidor_dominio_dm] d
           WHERE d.exibidor_fk = e.exibidor_pk AND d.delete_bl = 0
           ORDER BY d.primario_bl DESC, d.dominio_pk ASC) AS dominio_st
        FROM [serv_product_be180].[exibidor_dm] e
        WHERE e.delete_bl = 0
        ORDER BY e.nome_st
      `);
      return res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
      if (String(error.message || '').includes('Invalid object name')) {
        return res.status(503).json({
          success: false,
          error: 'Tabela exibidor_dm ainda não existe no banco. Execute o script ongoing/07_CREATE_exibidor_dm.sql.',
        });
      }
      console.error('[exibidor-cadastro] GET:', error.message);
      return res.status(500).json({ success: false, error: 'Erro ao listar exibidores cadastrados', message: error.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const body = req.body || {};
  const nome_st = String(body.nome_st || '').trim();
  const nome_fantasia_st = String(body.nome_fantasia_st || '').trim() || null;
  const codigo_st = String(body.codigo_st || '').trim() || null;
  let cnpj_st = null;
  if (body.cnpj_st != null && String(body.cnpj_st).trim() !== '') {
    const d = onlyDigits(body.cnpj_st);
    if (d.length !== 14) {
      return res.status(400).json({ success: false, error: 'CNPJ inválido (informe 14 dígitos)' });
    }
    cnpj_st = d;
  }
  const site_st = String(body.site_st || '').trim() || null;
  const email_st = String(body.email_st || '').trim() || null;
  const telefone_st = String(body.telefone_st || '').trim() || null;
  const dominio_st = String(body.dominio_st || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null;
  const cep_st = String(body.cep_st || '').trim() || null;
  const logradouro_st = String(body.logradouro_st || '').trim() || null;
  const numero_st = String(body.numero_st || '').trim() || null;
  const complemento_st = String(body.complemento_st || '').trim() || null;
  const bairro_st = String(body.bairro_st || '').trim() || null;
  const cidade_st = String(body.cidade_st || '').trim() || null;
  const estado_st = String(body.estado_st || '').trim().toUpperCase().slice(0, 2) || null;
  const observacao_st = String(body.observacao_st || '').trim() || null;

  if (!nome_st) {
    return res.status(400).json({ success: false, error: 'Nome (razão social) do exibidor é obrigatório' });
  }

  if (!isValidEmail(email_st)) {
    return res.status(400).json({ success: false, error: 'E-mail inválido' });
  }

  try {
    const pool = await getPool();

    const dupNome = await pool.request()
      .input('nome_st', sql.NVarChar(255), nome_st)
      .query(`
        SELECT exibidor_pk
        FROM [serv_product_be180].[exibidor_dm]
        WHERE delete_bl = 0 AND LOWER(nome_st) = LOWER(@nome_st)
      `);
    if (dupNome.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Já existe um exibidor cadastrado com este nome',
        exibidor_pk: dupNome.recordset[0].exibidor_pk,
      });
    }

    if (codigo_st) {
      const dupCod = await pool.request()
        .input('codigo_st', sql.NVarChar(100), codigo_st)
        .query(`
          SELECT exibidor_pk
          FROM [serv_product_be180].[exibidor_dm]
          WHERE delete_bl = 0 AND codigo_st IS NOT NULL AND LOWER(codigo_st) = LOWER(@codigo_st)
        `);
      if (dupCod.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Já existe um exibidor com este código interno',
          exibidor_pk: dupCod.recordset[0].exibidor_pk,
        });
      }
    }

    if (cnpj_st) {
      const dupCnpj = await pool.request()
        .input('cnpj_st', sql.NVarChar(18), cnpj_st)
        .query(`
          SELECT exibidor_pk
          FROM [serv_product_be180].[exibidor_dm]
          WHERE delete_bl = 0 AND cnpj_st = @cnpj_st
        `);
      if (dupCnpj.recordset.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Já existe um exibidor cadastrado com este CNPJ',
          exibidor_pk: dupCnpj.recordset[0].exibidor_pk,
        });
      }
    }

    const insert = await pool.request()
      .input('nome_st', sql.NVarChar(255), nome_st)
      .input('nome_fantasia_st', sql.NVarChar(255), nome_fantasia_st)
      .input('codigo_st', sql.NVarChar(100), codigo_st)
      .input('cnpj_st', sql.NVarChar(18), cnpj_st)
      .input('site_st', sql.NVarChar(500), site_st)
      .input('email_st', sql.NVarChar(255), email_st)
      .input('telefone_st', sql.NVarChar(50), telefone_st)
      .input('cep_st', sql.NVarChar(20), cep_st)
      .input('logradouro_st', sql.NVarChar(500), logradouro_st)
      .input('numero_st', sql.NVarChar(50), numero_st)
      .input('complemento_st', sql.NVarChar(200), complemento_st)
      .input('bairro_st', sql.NVarChar(200), bairro_st)
      .input('cidade_st', sql.NVarChar(200), cidade_st)
      .input('estado_st', sql.NVarChar(2), estado_st)
      .input('observacao_st', sql.NVarChar(2000), observacao_st)
      .input('dominio_st', sql.NVarChar(150), dominio_st)
      .query(`
        INSERT INTO [serv_product_be180].[exibidor_dm] (
          nome_st, nome_fantasia_st, codigo_st, cnpj_st, site_st, email_st, telefone_st,
          cep_st, logradouro_st, numero_st, complemento_st, bairro_st, cidade_st, estado_st,
          observacao_st, dominio_st, active_bl, delete_bl
        )
        OUTPUT INSERTED.exibidor_pk, INSERTED.nome_st, INSERTED.codigo_st, INSERTED.dominio_st, INSERTED.dataCriacao_dh
        VALUES (
          @nome_st, @nome_fantasia_st, @codigo_st, @cnpj_st, @site_st, @email_st, @telefone_st,
          @cep_st, @logradouro_st, @numero_st, @complemento_st, @bairro_st, @cidade_st, @estado_st,
          @observacao_st, @dominio_st, 1, 0
        )
      `);

    const row = insert.recordset[0];
    return res.status(201).json({
      success: true,
      message: 'Exibidor cadastrado com sucesso',
      exibidor: row,
    });
  } catch (error) {
    if (String(error.message || '').includes('Invalid object name')) {
      return res.status(503).json({
        success: false,
        error: 'Tabela exibidor_dm ainda não existe no banco. Execute o script ongoing/07_CREATE_exibidor_dm.sql.',
      });
    }
    console.error('[exibidor-cadastro] POST:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Erro ao cadastrar exibidor',
      message: error.message,
    });
  }
};
