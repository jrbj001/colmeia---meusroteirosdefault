const sql = require('mssql');
const config = require('./db');

async function uploadRoteiros(req, res) {
  try {
    const { roteiros } = req.body;
    
    if (!roteiros || !Array.isArray(roteiros) || roteiros.length === 0) {
      return res.status(400).json({ error: 'Dados dos roteiros são obrigatórios' });
    }

    const pool = await sql.connect(config);
    
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

    // Inserir os roteiros
    const resultados = [];
    
    for (const roteiro of roteirosParaInserir) {
      const request = pool.request();
      
      // Adicionar parâmetros
      request.input('pk2', sql.Int, roteiro.pk2);
      request.input('praca_st', sql.VarChar(255), roteiro.praca_st);
      request.input('uf_st', sql.VarChar(2), roteiro.uf_st);
      request.input('ambiente_st', sql.VarChar(255), roteiro.ambiente_st);
      request.input('grupoFormatosMidia_st', sql.VarChar(255), roteiro.grupoFormatosMidia_st);
      request.input('formato_st', sql.VarChar(255), roteiro.formato_st);
      request.input('tipoMidia_st', sql.VarChar(255), roteiro.tipoMidia_st);
      request.input('latitude_vl', sql.Float, roteiro.latitude_vl);
      request.input('longitude_vl', sql.Float, roteiro.longitude_vl);
      request.input('seDigitalInsercoes_vl', sql.Int, roteiro.seDigitalInsercoes_vl);
      request.input('seDigitalMaximoInsercoes_vl', sql.Int, roteiro.seDigitalMaximoInsercoes_vl);
      request.input('seEstaticoVisibilidade_vl', sql.Int, roteiro.seEstaticoVisibilidade_vl);
      request.input('semana_st', sql.VarChar(255), roteiro.semana_st);

      const query = `
        INSERT INTO [serv_product_be180].[uploadRoteiros_ft] (
          pk2, praca_st, uf_st, ambiente_st, grupoFormatosMidia_st, 
          formato_st, tipoMidia_st, latitude_vl, longitude_vl, 
          seDigitalInsercoes_vl, seDigitalMaximoInsercoes_vl, 
          seEstaticoVisibilidade_vl, semana_st
        ) 
        VALUES (
          @pk2, @praca_st, @uf_st, @ambiente_st, @grupoFormatosMidia_st,
          @formato_st, @tipoMidia_st, @latitude_vl, @longitude_vl,
          @seDigitalInsercoes_vl, @seDigitalMaximoInsercoes_vl,
          @seEstaticoVisibilidade_vl, @semana_st
        );
        
        SELECT SCOPE_IDENTITY() as new_pk;
      `;

      const result = await request.query(query);
      const newPk = result.recordset[0].new_pk;
      
      resultados.push({
        ...roteiro,
        pk: newPk,
        success: true
      });
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

module.exports = {
  uploadRoteiros
};
