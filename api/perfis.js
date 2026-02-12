const { getPool } = require('./db.js');

/**
 * API de Gerenciamento de Perfis
 * 
 * GET /perfis - Lista todos os perfis
 * GET /perfis/:id - Detalhes de um perfil específico
 * POST /perfis - Criar novo perfil (Admin only)
 * PUT /perfis/:id - Atualizar perfil (Admin only)
 * DELETE /perfis/:id - Desativar perfil (Admin only)
 */

module.exports = async function handler(req, res) {
  try {
    const pool = await getPool();
    const { id } = req.query;

    // GET /perfis/:id - Detalhes de um perfil
    if (req.method === 'GET' && id) {
      const result = await pool.request()
        .input('id', id)
        .query(`
          SELECT * FROM [serv_product_be180].[perfil_permissoes_resumo_vw]
          WHERE perfil_pk = @id
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }

      return res.status(200).json(result.recordset[0]);
    }

    // GET /perfis - Listar todos
    if (req.method === 'GET') {
      const result = await pool.request().query(`
        SELECT * FROM [serv_product_be180].[perfil_permissoes_resumo_vw]
        ORDER BY perfil_pk
      `);

      return res.status(200).json({
        perfis: result.recordset,
        total: result.recordset.length
      });
    }

    // POST /perfis - Criar novo perfil
    if (req.method === 'POST') {
      const { nome_st, descricao_st } = req.body;

      // Validações
      if (!nome_st || !nome_st.trim()) {
        return res.status(400).json({ error: 'Nome do perfil é obrigatório' });
      }

      // Verificar se já existe perfil com esse nome
      const nomeExists = await pool.request()
        .input('nome', nome_st)
        .query(`
          SELECT perfil_pk FROM [serv_product_be180].[perfil_dm]
          WHERE nome_st = @nome
        `);

      if (nomeExists.recordset.length > 0) {
        return res.status(400).json({ error: 'Já existe um perfil com este nome' });
      }

      // Inserir perfil
      const result = await pool.request()
        .input('nome', nome_st)
        .input('descricao', descricao_st || null)
        .query(`
          INSERT INTO [serv_product_be180].[perfil_dm] 
          (nome_st, descricao_st, ativo_bl, dataCriacao_dh, dataAtualizacao_dh)
          VALUES (@nome, @descricao, 1, GETDATE(), GETDATE());
          
          SELECT SCOPE_IDENTITY() as id;
        `);

      const novoId = result.recordset[0].id;

      // Buscar perfil criado
      const novoPerfil = await pool.request()
        .input('id', novoId)
        .query(`
          SELECT * FROM [serv_product_be180].[perfil_dm]
          WHERE perfil_pk = @id
        `);

      return res.status(201).json({
        message: 'Perfil criado com sucesso',
        perfil: novoPerfil.recordset[0]
      });
    }

    // PUT /perfis/:id - Atualizar perfil
    if (req.method === 'PUT' && id) {
      const { nome_st, descricao_st } = req.body;

      // Verificar se perfil existe
      const perfilExists = await pool.request()
        .input('id', id)
        .query(`
          SELECT perfil_pk FROM [serv_product_be180].[perfil_dm]
          WHERE perfil_pk = @id AND ativo_bl = 1
        `);

      if (perfilExists.recordset.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }

      // Verificar se novo nome já existe (se foi alterado)
      if (nome_st) {
        const nomeExists = await pool.request()
          .input('nome', nome_st)
          .input('id', id)
          .query(`
            SELECT perfil_pk FROM [serv_product_be180].[perfil_dm]
            WHERE nome_st = @nome AND perfil_pk != @id
          `);

        if (nomeExists.recordset.length > 0) {
          return res.status(400).json({ error: 'Já existe outro perfil com este nome' });
        }
      }

      // Atualizar perfil
      await pool.request()
        .input('id', id)
        .input('nome', nome_st)
        .input('descricao', descricao_st || null)
        .query(`
          UPDATE [serv_product_be180].[perfil_dm]
          SET nome_st = @nome,
              descricao_st = @descricao,
              dataAtualizacao_dh = GETDATE()
          WHERE perfil_pk = @id
        `);

      // Buscar perfil atualizado
      const perfilAtualizado = await pool.request()
        .input('id', id)
        .query(`
          SELECT * FROM [serv_product_be180].[perfil_permissoes_resumo_vw]
          WHERE perfil_pk = @id
        `);

      return res.status(200).json({
        message: 'Perfil atualizado com sucesso',
        perfil: perfilAtualizado.recordset[0]
      });
    }

    // DELETE /perfis/:id - Desativar perfil
    if (req.method === 'DELETE' && id) {
      // Verificar se perfil existe
      const perfilExists = await pool.request()
        .input('id', id)
        .query(`
          SELECT perfil_pk FROM [serv_product_be180].[perfil_dm]
          WHERE perfil_pk = @id AND ativo_bl = 1
        `);

      if (perfilExists.recordset.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }

      // Verificar se há usuários usando este perfil
      const usuariosComPerfil = await pool.request()
        .input('id', id)
        .query(`
          SELECT COUNT(*) as total FROM [serv_product_be180].[usuario_dm]
          WHERE perfil_pk = @id AND ativo_bl = 1
        `);

      if (usuariosComPerfil.recordset[0].total > 0) {
        return res.status(400).json({ 
          error: 'Não é possível desativar este perfil',
          mensagem: `Existem ${usuariosComPerfil.recordset[0].total} usuário(s) usando este perfil`
        });
      }

      // Desativar perfil
      await pool.request()
        .input('id', id)
        .query(`
          UPDATE [serv_product_be180].[perfil_dm]
          SET ativo_bl = 0,
              dataAtualizacao_dh = GETDATE()
          WHERE perfil_pk = @id
        `);

      return res.status(200).json({
        message: 'Perfil desativado com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de perfis:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar requisição',
      detalhes: error.message 
    });
  }
};
