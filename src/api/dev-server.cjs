require('dotenv').config();
const appExport = require('./index.cjs');

const PORT = process.env.API_PORT || 3001;

// Se o app foi exportado pelo serverless-http, pegue o .app
const server = appExport.app ? appExport.app : appExport;

server.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
}); 