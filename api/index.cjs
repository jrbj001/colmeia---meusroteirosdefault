require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();

// Configuração do CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://colmeia-meusroteirosdefault.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:4173'],
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));

// Configuração do banco de dados
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000
  }
};

let pool;

async function getPool() {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(dbConfig);
  return pool;
}

// Teste de API
app.get('/api/test', (req, res) => {
  res.json({ ok: true, msg: 'API Vercel funcionando!' });
});

// Endpoint principal de roteiros
app.get('/api/roteiros', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const pool = await getPool();
    
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM serv_product_be180.planoMidiaDescResumo_dm_vw');
    const total = countResult.recordset[0].total;
    
    const result = await pool.request().query(`
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
    console.error('Erro na API:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Exportação para Vercel
module.exports = app;
