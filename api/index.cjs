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

    const pool = await getPool();
    
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM serv_product_be180.planoMidiaGrupo_dm_vw');
    const total = countResult.recordset[0].total;
    
    const result = await pool.request().query(`
      SELECT * FROM serv_product_be180.planoMidiaGrupo_dm_vw
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

// Endpoint para buscar cidades por grupo
app.get('/api/cidades', async (req, res) => {
  try {
    const grupo = req.query.grupo;
    if (!grupo) {
      return res.status(400).json({ error: 'Parâmetro grupo é obrigatório' });
    }
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT cidadeUpper_st, planoMidiaGrupo_st
      FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
      WHERE planoMidiaGrupo_pk = ${grupo}
      ORDER BY cidadeUpper_st
    `);
    const cidades = result.recordset.map(r => r.cidadeUpper_st);
    const nomeGrupo = result.recordset.length > 0 ? result.recordset[0].planoMidiaGrupo_st : null;
    res.json({ cidades, nomeGrupo });
  } catch (err) {
    console.error('Erro na API de cidades:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para buscar semanas por planoMidiaDesc_pk
app.get('/api/semanas', async (req, res) => {
  try {
    const desc_pk = req.query.desc_pk;
    if (!desc_pk) {
      return res.status(400).json({ error: 'Parâmetro desc_pk é obrigatório' });
    }
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT semanaInicial_vl, semanaFinal_vl
      FROM serv_product_be180.planoMidia_dm_vw
      WHERE planoMidiaDesc_vl = ${desc_pk}
    `);
    res.json({ semanas: result.recordset });
  } catch (err) {
    console.error('Erro na API de semanas:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para buscar o mapeamento cidade -> planoMidiaDesc_pk
app.get('/api/pivot-descpks', async (req, res) => {
  try {
    const grupo = req.query.grupo;
    if (!grupo) {
      return res.status(400).json({ error: 'Parâmetro grupo é obrigatório' });
    }
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT cidadeUpper_st, planoMidiaDesc_pk
      FROM serv_product_be180.planoMidiaGrupoPivot_dm_vw
      WHERE planoMidiaGrupo_pk = ${grupo}
    `);
    const descPks = {};
    result.recordset.forEach(r => {
      descPks[r.cidadeUpper_st] = r.planoMidiaDesc_pk;
    });
    res.json({ descPks });
  } catch (err) {
    console.error('Erro na API de pivot-descpks:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportação para Vercel
module.exports = app;
