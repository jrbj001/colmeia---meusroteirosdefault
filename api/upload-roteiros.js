const { sql, getPool } = require('./db');

async function uploadRoteiros(req, res) {
  try {
    const { roteiros } = req.body;
    
    if (!roteiros || !Array.isArray(roteiros) || roteiros.length === 0) {
      return res.status(400).json({ error: 'Dados dos roteiros são obrigatórios' });
    }

    const pool = await getPool();
    
    // Preparar os dados para inserção
    const roteirosParaInserir = roteiros.map(roteiro => ({
      pk2: roteiro.pk2 || 0,
      praca_st: roteiro.praca_st || null,
      uf_st: roteiro.uf_st || null,
      ambiente_st: roteiro.ambiente_st || null,
      grupoFormatosMidia_st: roteiro.grupoFormatosMidia_st || null,
      formato_st: roteiro.formato_st || null,
      tipoMidia_st: roteiro.tipoMidia_st || null,
      latitude_vl: roteiro.latitude_vl || null,
      longitude_vl: roteiro.longitude_vl || null,
      seDigitalInsercoes_vl: roteiro.seDigitalInsercoes_vl || null,
      seDigitalMaximoInsercoes_vl: roteiro.seDigitalMaximoInsercoes_vl || null,
      seEstaticoVisibilidade_vl: roteiro.seEstaticoVisibilidade_vl || null,
      semana_st: roteiro.semana_st || null
    }));

    // Inserir os roteiros em lotes para melhor performance
    const resultados = [];
    const batchSize = 50; // Processar em lotes de 50
    
    console.log(`📊 Processando ${roteirosParaInserir.length} roteiros em lotes de ${batchSize}...`);
    
    for (let i = 0; i < roteirosParaInserir.length; i += batchSize) {
      const batch = roteirosParaInserir.slice(i, i + batchSize);
      console.log(`🔄 Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(roteirosParaInserir.length/batchSize)} (${batch.length} itens)...`);
      
      // Construir query de inserção em lote
      const values = [];
      const request = pool.request();
      
      batch.forEach((roteiro, index) => {
        const paramPrefix = `p${i + index}`;
        
        request.input(`${paramPrefix}_pk2`, sql.Int, roteiro.pk2);
        request.input(`${paramPrefix}_praca_st`, sql.VarChar(255), roteiro.praca_st);
        request.input(`${paramPrefix}_uf_st`, sql.VarChar(2), roteiro.uf_st);
        request.input(`${paramPrefix}_ambiente_st`, sql.VarChar(255), roteiro.ambiente_st);
        request.input(`${paramPrefix}_grupoFormatosMidia_st`, sql.VarChar(255), roteiro.grupoFormatosMidia_st);
        request.input(`${paramPrefix}_formato_st`, sql.VarChar(255), roteiro.formato_st);
        request.input(`${paramPrefix}_tipoMidia_st`, sql.VarChar(255), roteiro.tipoMidia_st);
        request.input(`${paramPrefix}_latitude_vl`, sql.Float, roteiro.latitude_vl);
        request.input(`${paramPrefix}_longitude_vl`, sql.Float, roteiro.longitude_vl);
        request.input(`${paramPrefix}_seDigitalInsercoes_vl`, sql.Int, roteiro.seDigitalInsercoes_vl);
        request.input(`${paramPrefix}_seDigitalMaximoInsercoes_vl`, sql.Int, roteiro.seDigitalMaximoInsercoes_vl);
        request.input(`${paramPrefix}_seEstaticoVisibilidade_vl`, sql.Int, roteiro.seEstaticoVisibilidade_vl);
        request.input(`${paramPrefix}_semana_st`, sql.VarChar(255), roteiro.semana_st);
        
        values.push(`(
          @${paramPrefix}_pk2, @${paramPrefix}_praca_st, @${paramPrefix}_uf_st, @${paramPrefix}_ambiente_st, @${paramPrefix}_grupoFormatosMidia_st,
          @${paramPrefix}_formato_st, @${paramPrefix}_tipoMidia_st, @${paramPrefix}_latitude_vl, @${paramPrefix}_longitude_vl,
          @${paramPrefix}_seDigitalInsercoes_vl, @${paramPrefix}_seDigitalMaximoInsercoes_vl,
          @${paramPrefix}_seEstaticoVisibilidade_vl, @${paramPrefix}_semana_st
        )`);
      });

      const query = `
        INSERT INTO [serv_product_be180].[uploadRoteiros_ft] (
          pk2, praca_st, uf_st, ambiente_st, grupoFormatosMidia_st, 
          formato_st, tipoMidia_st, latitude_vl, longitude_vl, 
          seDigitalInsercoes_vl, seDigitalMaximoInsercoes_vl, 
          seEstaticoVisibilidade_vl, semana_st
        ) 
        OUTPUT INSERTED.pk, INSERTED.pk2, INSERTED.praca_st, INSERTED.uf_st
        VALUES ${values.join(', ')};
      `;

      const result = await request.query(query);
      
      // Mapear resultados do lote
      result.recordset.forEach((row, index) => {
        resultados.push({
          ...batch[index],
          pk: row.pk,
          success: true
        });
      });
      
      console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} processado: ${result.recordset.length} roteiros inseridos`);
    }

    await pool.close();

    res.json({
      message: `${resultados.length} roteiros inseridos com sucesso`,
      roteiros: resultados
    });

  } catch (error) {
    console.error('Erro ao fazer upload dos roteiros:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

module.exports = uploadRoteiros;
