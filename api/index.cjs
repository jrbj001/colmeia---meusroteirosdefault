require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const sql = require('mssql');
const cors = require('cors');

const app = express();

// Configuração do CORS mais específica
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://colmeia-meusroteirosdefault.vercel.app', 'https://colmeia-meusroteirosdefault-5yqk6umhq-jrbj001-5242s-projects.vercel.app', 'https://*.vercel.app'] // URLs do frontend em produção
    : ['http://localhost:5173', 'http://localhost:4173'], // URLs do frontend em desenvolvimento
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Endpoint de debug das variáveis
app.get('/api/debug-vars', (req, res) => {
  res.json({
    DB_SERVER: process.env.DB_SERVER || 'undefined',
    DB_DATABASE: process.env.DB_DATABASE || 'undefined', 
    DB_USER: process.env.DB_USER || 'undefined',
    DB_PASSWORD: process.env.DB_PASSWORD ? `***${process.env.DB_PASSWORD.length} chars***` : 'undefined',
    NODE_ENV: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.startsWith('DB_'))
  });
});

// NOVAS CONFIGURAÇÕES baseadas em diferenças JDBC vs TDS conhecidas
const configs = [
  {
    name: 'Config 1 - TLS 1.2 forçado (mais comum para resolver diferenças JDBC/TDS)',
    config: {
      server: process.env.DB_SERVER || 'mct-serv-prd-0001.database.windows.net',
      database: process.env.DB_DATABASE || 'db-azr-sql-clients-0001',
      user: process.env.DB_USER || 'ReaderUser_be180',
      password: process.env.DB_PASSWORD,
      port: 1433,
      options: {
        encrypt: true,
        trustServerCertificate: false, // Azure SQL deve ser false
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1.2',  // Força TLS 1.2
          maxVersion: 'TLSv1.3',
          ciphers: 'TLSv1.2'
        },
        tdsVersion: '7_4', // Força TDS 7.4 (mais compatível)
        instanceName: '',
        useUTC: false,
        encrypt: true,
        trustServerCertificate: false
      }
    }
  },
  {
    name: 'Config 2 - Usuario com domínio explícito (comum em Azure SQL)',
    config: {
      server: process.env.DB_SERVER || 'mct-serv-prd-0001.database.windows.net',
      database: process.env.DB_DATABASE || 'db-azr-sql-clients-0001',
      user: `${process.env.DB_USER || 'ReaderUser_be180'}@${(process.env.DB_SERVER || 'mct-serv-prd-0001.database.windows.net').split('.')[0]}`,
      password: process.env.DB_PASSWORD,
      port: 1433,
      options: {
        encrypt: true,
        trustServerCertificate: true, // Relaxando SSL para teste
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
      }
    }
  },
  {
    name: 'Config 3 - Connection String com configuração TCP explícita',
    connectionString: `Server=tcp:${process.env.DB_SERVER || 'mct-serv-prd-0001.database.windows.net'},1433;Database=${process.env.DB_DATABASE || 'db-azr-sql-clients-0001'};User ID=${process.env.DB_USER || 'ReaderUser_be180'};Password=${process.env.DB_PASSWORD};Persist Security Info=False;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=True;Connection Timeout=30;Login Timeout=30;`
  },
  {
    name: 'Config 4 - Configuração específica para Azure SQL Database',
    config: {
      server: process.env.DB_SERVER || 'mct-serv-prd-0001.database.windows.net',
      database: process.env.DB_DATABASE || 'db-azr-sql-clients-0001',
      user: process.env.DB_USER || 'ReaderUser_be180',
      password: process.env.DB_PASSWORD,
      port: 1433,
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER || 'ReaderUser_be180',
          password: process.env.DB_PASSWORD
        }
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 60000,
        requestTimeout: 60000,
        rowCollectionOnRequestCompletion: true,
        useColumnNames: false,
        camelCaseColumns: false,
        parseJSON: false,
        arrayRowMode: false
      }
    }
  },
  {
    name: 'Config 5 - Simulando configuração mais próxima do JDBC',
    config: {
      server: process.env.DB_SERVER || 'mct-serv-prd-0001.database.windows.net',
      database: process.env.DB_DATABASE || 'db-azr-sql-clients-0001',
      user: process.env.DB_USER || 'ReaderUser_be180',
      password: process.env.DB_PASSWORD,
      port: 1433,
      options: {
        encrypt: true,
        trustServerCertificate: true, // JDBC geralmente aceita certificados auto-assinados
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
        cancelTimeout: 5000,
        packetSize: 4096,
        useUTC: false,
        dateFirst: 7,
        language: '',
        fallbackToDefaultDb: true
      }
    }
  }
];

let pool;
let currentConfigIndex = 0;

async function getPool() {
  if (pool && pool.connected) return pool;
  
  console.log('\n=== INICIANDO TESTE DE CONEXÕES (JDBC vs TDS) ===');
  console.log('Variables loaded:');
  console.log('- DB_SERVER:', process.env.DB_SERVER || 'undefined');
  console.log('- DB_DATABASE:', process.env.DB_DATABASE || 'undefined');
  console.log('- DB_USER:', process.env.DB_USER || 'undefined');
  console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? `***${process.env.DB_PASSWORD.length} chars***` : 'undefined');
  
  // Tenta cada configuração até uma funcionar
  for (let i = currentConfigIndex; i < configs.length; i++) {
    try {
      console.log(`\n🔄 Tentando ${configs[i].name}...`);
      
      if (configs[i].connectionString) {
        console.log('ConnectionString:', configs[i].connectionString.replace(/Password=[^;]+/, 'Password=***'));
        pool = await sql.connect(configs[i].connectionString);
      } else {
        const debugConfig = {
          ...configs[i].config,
          password: '***',
          user: configs[i].config.user.length > 50 ? configs[i].config.user.substring(0, 50) + '...' : configs[i].config.user
        };
        console.log('Config object:', JSON.stringify(debugConfig, null, 2));
        pool = await sql.connect(configs[i].config);
      }
      
      console.log(`✅ ${configs[i].name} funcionou!`);
      currentConfigIndex = i; // Salva qual config funcionou
      return pool;
    } catch (err) {
      console.error(`❌ ${configs[i].name} falhou:`, {
        code: err.code,
        message: err.message,
        originalError: err.originalError?.message,
        state: err.state,
        class: err.class,
        serverName: err.serverName,
        procName: err.procName,
        lineNumber: err.lineNumber
      });
      
      // Se for o último config, relança o erro
      if (i === configs.length - 1) {
        throw err;
      }
    }
  }
}

app.get('/api/roteiros', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const pool = await getPool();
    
    // Primeiro, vamos contar o total de registros
    const countResult = await pool.request().query('SELECT COUNT(*) as total FROM serv_product_be180.planoMidiaDescResumo_dm_vw');
    const total = countResult.recordset[0].total;
    
    // Agora, vamos buscar os registros paginados
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

// Endpoint de teste da conexão
app.get('/api/test-connection', async (req, res) => {
  try {
    console.log('🔍 Testando conexão...');
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as test, @@VERSION as version, SYSTEM_USER as current_user');
    console.log('✅ Teste de conexão bem sucedido!');
    res.json({ 
      success: true, 
      message: 'Conexão com banco funcionando!',
      configUsed: configs[currentConfigIndex].name,
      result: result.recordset 
    });
  } catch (err) {
    console.error('❌ Erro no teste de conexão:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      details: {
        code: err.code,
        originalError: err.originalError?.message,
        configsTentados: configs.map(c => c.name),
        fullError: {
          message: err.message,
          code: err.code,
          state: err.state,
          class: err.class,
          serverName: err.serverName,
          procName: err.procName,
          lineNumber: err.lineNumber
        }
      }
    });
  }
});

app.get('/api/teste', (req, res) => {
  res.json({ message: 'hello world' });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'hello from Express serverless!' });
});

const isLocal = !process.env.VERCEL && !process.env.VERCEL_ENV;

if (isLocal) {
  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
    console.log(`Teste os endpoints:
    - http://localhost:${PORT}/api/debug-vars
    - http://localhost:${PORT}/api/test-connection
    - http://localhost:${PORT}/api/hello
    `);
  });
}

// Export para Vercel (tanto CLI quanto online)
module.exports = serverless(app);
