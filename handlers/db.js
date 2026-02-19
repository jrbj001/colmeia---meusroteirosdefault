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
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000 // Fechar conexões idle após 30s
  }
};

let pool;

async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }
  
  console.log('🔄 Criando nova conexão com o banco de dados...');
  pool = await sql.connect(dbConfig);
  console.log('✅ Conexão estabelecida com sucesso!');
  return pool;
}

module.exports = { sql, getPool }; 