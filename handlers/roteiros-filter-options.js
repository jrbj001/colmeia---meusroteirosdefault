const { getPool } = require('./db');

// Opções para os comboboxes de filtro da tela "Meus Roteiros".
// Retorna valores DISTINTOS de todo o acervo (não só da página atual),
// respeitando o escopo de agência do usuário logado.
//   - usuarios: agrupados por nome (um item por pessoa), com todos os ids
//               daquela pessoa (a base tem o mesmo nome sob ids Auth0 diferentes).
//   - marcas / agencias / categorias: lista simples de strings.
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  try {
    const empresaPk = req.user?.empresa_pk ?? null;
    const pool = await getPool();
    const agenciaFilter = empresaPk
      ? 'AND agencia_pk = @empresaPk AND liberadoAgencia_bl = 1'
      : '';
    const base = `FROM serv_product_be180.planoMidiaGrupo_dm_vw WHERE delete_bl = 0 ${agenciaFilter}`;

    const run = (sql) => {
      const r = pool.request();
      if (empresaPk) r.input('empresaPk', empresaPk);
      return r.query(sql);
    };

    const [usuarios, marcas, agencias, categorias] = await Promise.all([
      run(`SELECT DISTINCT usuarioId_st, usuarioName_st ${base}
             AND usuarioId_st IS NOT NULL AND usuarioName_st IS NOT NULL
           ORDER BY usuarioName_st`),
      run(`SELECT DISTINCT marca_st ${base}
             AND marca_st IS NOT NULL AND LEN(LTRIM(RTRIM(marca_st))) > 0
           ORDER BY marca_st`),
      run(`SELECT DISTINCT agencia_st ${base}
             AND agencia_st IS NOT NULL AND LEN(LTRIM(RTRIM(agencia_st))) > 0
           ORDER BY agencia_st`),
      run(`SELECT DISTINCT categoria_st ${base}
             AND categoria_st IS NOT NULL AND LEN(LTRIM(RTRIM(categoria_st))) > 0
           ORDER BY categoria_st`),
    ]);

    // Agrupa usuários por nome, juntando os ids (mesma pessoa, ids distintos).
    const byName = new Map();
    for (const r of usuarios.recordset) {
      const name = r.usuarioName_st;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(r.usuarioId_st);
    }
    const usuariosOut = [...byName.entries()]
      .map(([name, ids]) => ({ name, ids }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    res.json({
      usuarios: usuariosOut,
      marcas: marcas.recordset.map((r) => r.marca_st),
      agencias: agencias.recordset.map((r) => r.agencia_st),
      categorias: categorias.recordset.map((r) => r.categoria_st),
    });
  } catch (err) {
    console.error('Erro na API /api/roteiros?action=filter-options:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
