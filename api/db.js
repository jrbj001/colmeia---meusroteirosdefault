const sql = require('mssql');

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
    connectTimeout: 60000,  // 60s para conectar
    requestTimeout: 600000, // 10 minutos para requests longos
    cancelTimeout: 60000    // 60s para cancelar
  }
};

let pool;

async function getPool() {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(dbConfig);
  return pool;
}

module.exports = { sql, getPool }; 