require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

app.get('/api/roteiros', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    await sql.connect(config);
    
    // Primeiro, vamos contar o total de registros
    const countResult = await sql.query('SELECT COUNT(*) as total FROM serv_product_be180.planoMidiaDescResumo_dm_vw');
    const total = countResult.recordset[0].total;
    
    // Agora, vamos buscar os registros paginados
    const result = await sql.query(`
      SELECT * FROM serv_product_be180.planoMidiaDescResumo_dm_vw
      ORDER BY date_dh DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);

    res.json({
      data: result.recordset,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize: pageSize
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const isLocal = !process.env.VERCEL;

if (isLocal) {
  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
} else {
  module.exports = serverless(app);
} 