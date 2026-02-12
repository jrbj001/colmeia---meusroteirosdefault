const { getPool } = require('./db');

module.exports = async (req, res) => {
  const pool = await getPool();

  // GET - Listar todas as marcas
  if (req.method === 'GET') {
    try {
      const result = await pool.request().query(`
        SELECT 
          pk as id_marca,
          marca_st as nome_marca
        FROM serv_product_be180.marca_dm_vw 
        WHERE active_bl = 1
        ORDER BY marca_st
      `);
      
      res.json(result.recordset);
    } catch (err) {
      console.error('Erro na API /api/marca GET:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
    return;
  }

  // POST - Criar nova marca
  if (req.method === 'POST') {
    try {
      const { nome_marca } = req.body;

      if (!nome_marca || !nome_marca.trim()) {
        return res.status(400).json({ 
          error: 'Nome da marca é obrigatório' 
        });
      }

      // Verificar se a marca já existe (case-insensitive)
      const checkExisting = await pool.request()
        .input('nome_marca', nome_marca.trim())
        .query(`
          SELECT pk, marca_st 
          FROM serv_product_be180.marca_dm 
          WHERE LOWER(marca_st) = LOWER(@nome_marca)
        `);

      if (checkExisting.recordset.length > 0) {
        return res.status(409).json({ 
          error: 'Marca já existe',
          marca_existente: checkExisting.recordset[0]
        });
      }

      // Inserir nova marca
      const insertResult = await pool.request()
        .input('marca_st', nome_marca.trim())
        .query(`
          INSERT INTO serv_product_be180.marca_dm (marca_st, active_bl, delete_bl)
          OUTPUT INSERTED.pk as id_marca, INSERTED.marca_st as nome_marca
          VALUES (@marca_st, 1, 0)
        `);

      console.log('✅ Nova marca criada:', insertResult.recordset[0]);

      res.status(201).json({
        success: true,
        message: 'Marca criada com sucesso',
        marca: insertResult.recordset[0]
      });

    } catch (err) {
      console.error('Erro na API /api/marca POST:', err);
      res.status(500).json({ 
        error: 'Erro ao criar marca',
        details: err.message 
      });
    }
    return;
  }

  // Método não permitido
  res.status(405).json({ error: 'Método não permitido' });
};
