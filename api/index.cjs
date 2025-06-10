require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();

// Configuração do CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: do próprio backend, healthchecks, etc)
    if (!origin) return callback(null, true);

    // Permite o domínio principal e todos os subdomínios .vercel.app
    if (
      origin === 'https://colmeia-meusroteirosdefault.vercel.app' ||
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    // Bloqueia qualquer outro origin
    return callback(new Error('Not allowed by CORS'));
  },
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
    const search = req.query.search ? String(req.query.search).toLowerCase() : null;

    const pool = await getPool();

    let whereClause = '';
    if (search) {
      whereClause = `WHERE LOWER(planoMidiaDesc_st_concat) LIKE '%${search.replace(/'/g, "''")}%'`;
    }

    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM serv_product_be180.planoMidiaGrupo_dm_vw ${whereClause}`);
    const total = countResult.recordset[0].total;

    const result = await pool.request().query(`
      SELECT * FROM serv_product_be180.planoMidiaGrupo_dm_vw
      ${whereClause}
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
