require('dotenv').config();
const express = require('express');
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
    await sql.connect(config);
    const result = await sql.query('SELECT TOP 500 * FROM serv_product_be180.planoMidiaDescResumo_dm_vw');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
}); 