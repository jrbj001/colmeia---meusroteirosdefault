const { getPool } = require('./db.js');

/**
 * API de Verificação de Acesso
 * 
 * GET /verificar-acesso?usuario_pk=X&area_codigo=Y
 * GET /verificar-acesso?usuario_pk=X&area_codigo=Y&tipo=escrita
 * 
 * Verifica se um usuário tem permissão de acesso a uma área específica
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { usuario_pk, area_codigo, tipo = 'leitura' } = req.query;

    // Validações
    if (!usuario_pk) {
      return res.status(400).json({ error: 'usuario_pk é obrigatório' });
    }

    if (!area_codigo) {
      return res.status(400).json({ error: 'area_codigo é obrigatório' });
    }

    if (!['leitura', 'escrita'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo deve ser "leitura" ou "escrita"' });
    }

    const pool = await getPool();

    // Buscar permissão do usuário para a área
    const result = await pool.request()
      .input('usuario_pk', usuario_pk)
      .input('area_codigo', area_codigo)
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
          ler_bl,
          escrever_bl
        FROM [serv_product_be180].[usuario_permissoes_vw]
        WHERE usuario_pk = @usuario_pk 
          AND area_codigo = @area_codigo
      `);

    // Se não encontrou permissão, usuário não tem acesso
    if (result.recordset.length === 0) {
      return res.status(200).json({
        tem_acesso: false,
        usuario_pk: parseInt(usuario_pk),
        area_codigo,
        tipo_verificado: tipo,
        mensagem: 'Usuário não possui permissão para esta área'
      });
    }

    const permissao = result.recordset[0];

    // Verificar o tipo de acesso solicitado
    const temAcesso = tipo === 'leitura' 
      ? permissao.ler_bl === true 
      : permissao.escrever_bl === true;

    return res.status(200).json({
      tem_acesso: temAcesso,
      usuario: {
        pk: permissao.usuario_pk,
        nome: permissao.usuario_nome,
        email: permissao.usuario_email,
        perfil_pk: permissao.perfil_pk,
        perfil_nome: permissao.perfil_nome
      },
      area: {
        pk: permissao.area_pk,
        codigo: permissao.area_codigo,
        nome: permissao.area_nome
      },
      permissoes: {
        ler: permissao.ler_bl,
        escrever: permissao.escrever_bl
      },
      tipo_verificado: tipo
    });

  } catch (error) {
    console.error('Erro ao verificar acesso:', error);
    return res.status(500).json({ 
      error: 'Erro ao verificar acesso',
      detalhes: error.message 
    });
  }
};
