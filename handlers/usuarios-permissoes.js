const { getPool } = require('./db.js');

/**
 * API de Permissões de Usuário
 * 
 * GET /usuarios-permissoes?usuario_pk=X - Permissões de um usuário específico
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { usuario_pk } = req.query;

    if (!usuario_pk) {
      return res.status(400).json({ error: 'usuario_pk é obrigatório' });
    }

    const pool = await getPool();

    // Buscar todas as permissões do usuário
    const result = await pool.request()
      .input('usuario_pk', usuario_pk)
      .query(`
        SELECT 
          usuario_pk,
          usuario_nome,
          usuario_email,
          perfil_pk,
          perfil_nome,
          area_pk,
          area_codigo,
          area_nome,
          area_descricao,
          area_pai_nome,
          ler_bl,
          escrever_bl
        FROM [serv_product_be180].[usuario_permissoes_vw]
        WHERE usuario_pk = @usuario_pk
        ORDER BY area_codigo
      `);

    if (result.recordset.length === 0) {
      // Verificar se o usuário existe
      const usuarioExists = await pool.request()
        .input('usuario_pk', usuario_pk)
        .query(`
          SELECT pk, nome_st, perfil_pk 
          FROM [serv_product_be180].[usuario_dm]
          WHERE pk = @usuario_pk AND ativo_bl = 1
        `);

      if (usuarioExists.recordset.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Usuário existe mas não tem permissões
      return res.status(200).json({
        usuario: {
          pk: usuarioExists.recordset[0].pk,
          nome: usuarioExists.recordset[0].nome_st,
          perfil_pk: usuarioExists.recordset[0].perfil_pk
        },
        permissoes: [],
        message: 'Usuário sem permissões configuradas'
      });
    }

    // Organizar permissões por área principal e subáreas
    const permissoesPorArea = {};
    const primeiroRegistro = result.recordset[0];

    result.recordset.forEach(p => {
      const areaPrincipal = p.area_pai_nome || p.area_nome;
      
      if (!permissoesPorArea[areaPrincipal]) {
        permissoesPorArea[areaPrincipal] = {
          area_nome: areaPrincipal,
          subareas: []
        };
      }

      if (p.area_pai_nome) {
        // É uma subárea
        permissoesPorArea[areaPrincipal].subareas.push({
          area_pk: p.area_pk,
          area_codigo: p.area_codigo,
          area_nome: p.area_nome,
          area_descricao: p.area_descricao,
          ler: p.ler_bl,
          escrever: p.escrever_bl
        });
      } else {
        // É área principal
        permissoesPorArea[areaPrincipal].area_pk = p.area_pk;
        permissoesPorArea[areaPrincipal].area_codigo = p.area_codigo;
        permissoesPorArea[areaPrincipal].area_descricao = p.area_descricao;
        permissoesPorArea[areaPrincipal].ler = p.ler_bl;
        permissoesPorArea[areaPrincipal].escrever = p.escrever_bl;
      }
    });

    return res.status(200).json({
      usuario: {
        pk: primeiroRegistro.usuario_pk,
        nome: primeiroRegistro.usuario_nome,
        email: primeiroRegistro.usuario_email,
        perfil_pk: primeiroRegistro.perfil_pk,
        perfil_nome: primeiroRegistro.perfil_nome
      },
      permissoes: Object.values(permissoesPorArea),
      total_permissoes: result.recordset.length
    });

  } catch (error) {
    console.error('Erro ao buscar permissões do usuário:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar permissões',
      detalhes: error.message 
    });
  }
};
