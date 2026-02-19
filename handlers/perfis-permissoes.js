const { getPool } = require('./db.js');

/**
 * API de Permissões de Perfil
 * 
 * GET /perfis-permissoes?perfil_pk=X - Permissões de um perfil específico
 * PUT /perfis-permissoes/:perfil_pk - Atualizar permissões de um perfil (Admin only)
 */

module.exports = async function handler(req, res) {
  try {
    const pool = await getPool();
    const { perfil_pk } = req.query;

    // GET /perfis-permissoes?perfil_pk=X
    if (req.method === 'GET') {
      if (!perfil_pk) {
        return res.status(400).json({ error: 'perfil_pk é obrigatório' });
      }

      // Buscar informações do perfil
      const perfilInfo = await pool.request()
        .input('perfil_pk', perfil_pk)
        .query(`
          SELECT perfil_pk, nome_st, descricao_st, ativo_bl
          FROM [serv_product_be180].[perfil_dm]
          WHERE perfil_pk = @perfil_pk
        `);

      if (perfilInfo.recordset.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }

      // Buscar todas as áreas
      const todasAreas = await pool.request().query(`
        SELECT * FROM [serv_product_be180].[area_sistema_hierarquia_vw]
        WHERE ativo_bl = 1
        ORDER BY nivel_hierarquia, ordem_vl
      `);

      // Buscar permissões atuais do perfil
      const permissoesAtuais = await pool.request()
        .input('perfil_pk', perfil_pk)
        .query(`
          SELECT area_pk, ler_bl, escrever_bl
          FROM [serv_product_be180].[perfil_permissao_ft]
          WHERE perfil_pk = @perfil_pk
        `);

      // Mapear permissões atuais
      const permissoesMap = {};
      permissoesAtuais.recordset.forEach(p => {
        permissoesMap[p.area_pk] = {
          ler: p.ler_bl,
          escrever: p.escrever_bl
        };
      });

      // Combinar áreas com permissões
      const areasComPermissoes = todasAreas.recordset.map(area => ({
        area_pk: area.area_pk,
        codigo: area.codigo_st,
        nome: area.nome_st,
        descricao: area.descricao_st,
        area_pai_nome: area.area_pai_nome,
        nivel: area.nivel_hierarquia,
        ordem: area.ordem_vl,
        permissoes: permissoesMap[area.area_pk] || { ler: false, escrever: false }
      }));

      return res.status(200).json({
        perfil: perfilInfo.recordset[0],
        areas: areasComPermissoes,
        total_areas: todasAreas.recordset.length,
        total_permissoes_ativas: permissoesAtuais.recordset.length
      });
    }

    // PUT /perfis-permissoes/:perfil_pk - Atualizar permissões
    if (req.method === 'PUT') {
      if (!perfil_pk) {
        return res.status(400).json({ error: 'perfil_pk é obrigatório' });
      }

      const { permissoes } = req.body;
      // permissoes = [{ area_pk: 1, ler: true, escrever: false }, ...]

      if (!permissoes || !Array.isArray(permissoes)) {
        return res.status(400).json({ error: 'permissoes deve ser um array' });
      }

      // Verificar se perfil existe
      const perfilExists = await pool.request()
        .input('perfil_pk', perfil_pk)
        .query(`
          SELECT perfil_pk FROM [serv_product_be180].[perfil_dm]
          WHERE perfil_pk = @perfil_pk AND ativo_bl = 1
        `);

      if (perfilExists.recordset.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }

      // Deletar permissões antigas
      await pool.request()
        .input('perfil_pk', perfil_pk)
        .query(`
          DELETE FROM [serv_product_be180].[perfil_permissao_ft]
          WHERE perfil_pk = @perfil_pk
        `);

      // Inserir novas permissões
      for (const perm of permissoes) {
        // Validar que ao menos uma permissão está ativa
        if (!perm.ler && !perm.escrever) {
          continue; // Pula se nenhuma permissão está ativa
        }

        await pool.request()
          .input('perfil_pk', perfil_pk)
          .input('area_pk', perm.area_pk)
          .input('ler', perm.ler ? 1 : 0)
          .input('escrever', perm.escrever ? 1 : 0)
          .query(`
            INSERT INTO [serv_product_be180].[perfil_permissao_ft]
            (perfil_pk, area_pk, ler_bl, escrever_bl, dataCriacao_dh)
            VALUES (@perfil_pk, @area_pk, @ler, @escrever, GETDATE())
          `);
      }

      // Buscar permissões atualizadas
      const permissoesAtualizadas = await pool.request()
        .input('perfil_pk', perfil_pk)
        .query(`
          SELECT 
            pp.area_pk,
            a.codigo_st as area_codigo,
            a.nome_st as area_nome,
            pp.ler_bl,
            pp.escrever_bl
          FROM [serv_product_be180].[perfil_permissao_ft] pp
          INNER JOIN [serv_product_be180].[area_sistema_dm] a ON pp.area_pk = a.area_pk
          WHERE pp.perfil_pk = @perfil_pk
          ORDER BY a.codigo_st
        `);

      return res.status(200).json({
        message: 'Permissões atualizadas com sucesso',
        total_permissoes: permissoesAtualizadas.recordset.length,
        permissoes: permissoesAtualizadas.recordset
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de permissões de perfil:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar requisição',
      detalhes: error.message 
    });
  }
};
