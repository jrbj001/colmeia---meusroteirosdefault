const { getPool } = require('./db.js');

/**
 * API de Gerenciamento de Usuários
 * 
 * GET /usuarios - Lista todos os usuários com paginação
 * GET /usuarios/:id - Detalhes de um usuário específico
 * POST /usuarios - Criar novo usuário
 * PUT /usuarios/:id - Atualizar usuário
 * DELETE /usuarios/:id - Desativar usuário (soft delete)
 */

module.exports = async function handler(req, res) {
  try {
    const pool = await getPool();
    const { id } = req.query;

    // GET /usuarios/:id - Detalhes de um usuário
    if (req.method === 'GET' && id) {
      const result = await pool.request()
        .input('id', id)
        .query(`
          SELECT * FROM [serv_product_be180].[usuario_completo_vw]
          WHERE usuario_pk = @id
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.status(200).json(result.recordset[0]);
    }

    // GET /usuarios - Listar todos com paginação
    if (req.method === 'GET') {
      const { page = 1, limit = 10, search = '', perfil = '' } = req.query;
      const offset = (page - 1) * limit;

      const countReq = pool.request();
      const dataReq = pool.request();
      let whereClause = 'WHERE usuario_ativo = 1';
      
      if (search) {
        whereClause += ` AND (usuario_nome LIKE @search OR usuario_email LIKE @search)`;
        const searchPattern = `%${search}%`;
        countReq.input('search', searchPattern);
        dataReq.input('search', searchPattern);
      }
      
      if (perfil) {
        whereClause += ` AND perfil_nome = @perfil`;
        countReq.input('perfil', perfil);
        dataReq.input('perfil', perfil);
      }

      const countResult = await countReq.query(`
        SELECT COUNT(*) as total 
        FROM [serv_product_be180].[usuario_completo_vw]
        ${whereClause}
      `);

      const result = await dataReq
        .input('offset', parseInt(offset))
        .input('limit', parseInt(limit))
        .query(`
          SELECT *
          FROM [serv_product_be180].[usuario_completo_vw]
          ${whereClause}
          ORDER BY usuario_pk
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      return res.status(200).json({
        usuarios: result.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.recordset[0].total,
          totalPages: Math.ceil(countResult.recordset[0].total / limit)
        }
      });
    }

    // POST /usuarios - Criar novo usuário
    if (req.method === 'POST') {
      const { nome_st, email_st, telefone_st, perfil_pk, empresa_pk } = req.body;

      // Validações
      if (!nome_st || !nome_st.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      if (!perfil_pk) {
        return res.status(400).json({ error: 'Perfil é obrigatório' });
      }

      // Verificar se email já existe
      if (email_st) {
        const emailExists = await pool.request()
          .input('email', email_st)
          .query(`
            SELECT pk FROM [serv_product_be180].[usuario_dm]
            WHERE email_st = @email AND ativo_bl = 1
          `);

        if (emailExists.recordset.length > 0) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }
      }

      // Inserir usuário
      const result = await pool.request()
        .input('nome', nome_st)
        .input('email', email_st || null)
        .input('telefone', telefone_st || null)
        .input('perfil', perfil_pk)
        .input('empresa', empresa_pk || null)
        .query(`
          INSERT INTO [serv_product_be180].[usuario_dm] 
          (nome_st, email_st, telefone_st, perfil_pk, empresa_pk, ativo_bl, date_dh, date_dt)
          VALUES (@nome, @email, @telefone, @perfil, @empresa, 1, GETDATE(), CAST(GETDATE() AS DATE));
          
          SELECT SCOPE_IDENTITY() as id;
        `);

      const novoId = result.recordset[0].id;

      // Buscar usuário criado
      const novoUsuario = await pool.request()
        .input('id', novoId)
        .query(`
          SELECT * FROM [serv_product_be180].[usuario_completo_vw]
          WHERE usuario_pk = @id
        `);

      return res.status(201).json({
        message: 'Usuário criado com sucesso',
        usuario: novoUsuario.recordset[0]
      });
    }

    // PUT /usuarios/:id - Atualizar usuário
    if (req.method === 'PUT' && id) {
      const { nome_st, email_st, telefone_st, perfil_pk, empresa_pk } = req.body;

      // Verificar se usuário existe
      const usuarioExists = await pool.request()
        .input('id', id)
        .query(`
          SELECT pk FROM [serv_product_be180].[usuario_dm]
          WHERE pk = @id AND ativo_bl = 1
        `);

      if (usuarioExists.recordset.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar se novo email já existe (se foi alterado)
      if (email_st) {
        const emailExists = await pool.request()
          .input('email', email_st)
          .input('id', id)
          .query(`
            SELECT pk FROM [serv_product_be180].[usuario_dm]
            WHERE email_st = @email AND pk != @id AND ativo_bl = 1
          `);

        if (emailExists.recordset.length > 0) {
          return res.status(400).json({ error: 'Email já cadastrado para outro usuário' });
        }
      }

      // Atualizar usuário
      await pool.request()
        .input('id', id)
        .input('nome', nome_st)
        .input('email', email_st || null)
        .input('telefone', telefone_st || null)
        .input('perfil', perfil_pk)
        .input('empresa', empresa_pk || null)
        .query(`
          UPDATE [serv_product_be180].[usuario_dm]
          SET nome_st = @nome,
              email_st = @email,
              telefone_st = @telefone,
              perfil_pk = @perfil,
              empresa_pk = @empresa
          WHERE pk = @id
        `);

      // Buscar usuário atualizado
      const usuarioAtualizado = await pool.request()
        .input('id', id)
        .query(`
          SELECT * FROM [serv_product_be180].[usuario_completo_vw]
          WHERE usuario_pk = @id
        `);

      return res.status(200).json({
        message: 'Usuário atualizado com sucesso',
        usuario: usuarioAtualizado.recordset[0]
      });
    }

    // DELETE /usuarios/:id - Desativar usuário (soft delete)
    if (req.method === 'DELETE' && id) {
      // Verificar se usuário existe
      const usuarioExists = await pool.request()
        .input('id', id)
        .query(`
          SELECT pk FROM [serv_product_be180].[usuario_dm]
          WHERE pk = @id AND ativo_bl = 1
        `);

      if (usuarioExists.recordset.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Desativar usuário
      await pool.request()
        .input('id', id)
        .query(`
          UPDATE [serv_product_be180].[usuario_dm]
          SET ativo_bl = 0
          WHERE pk = @id
        `);

      return res.status(200).json({
        message: 'Usuário desativado com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de usuários:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar requisição',
      detalhes: error.message 
    });
  }
};
