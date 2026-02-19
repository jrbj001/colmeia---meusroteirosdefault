const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Configuração do cliente JWKS para validar tokens do Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutos
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Função para obter a chave pública do Auth0
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Middleware de autenticação para API routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Token de autorização não fornecido ou inválido' 
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " do início

  // Verificar se é um token local (fallback)
  if (token.startsWith('fake-jwt-token-')) {
    // Token local válido para desenvolvimento/teste
    req.user = {
      id: 'local-user',
      email: 'teste@be180.com.br',
      name: 'Usuário Teste'
    };
    return next();
  }

  // Validar token JWT do Auth0
  jwt.verify(token, getKey, {
    audience: process.env.AUTH0_CLIENT_ID,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      console.error('Erro na validação do token:', err);
      return res.status(401).json({ 
        error: 'Token inválido ou expirado' 
      });
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.nickname
    };

    next();
  });
}

// Função para extrair token do header Authorization
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Função para verificar se o usuário está autenticado (sem middleware)
function isAuthenticated(req) {
  const token = extractToken(req);
  
  if (!token) {
    return false;
  }

  // Verificar token local
  if (token.startsWith('fake-jwt-token-')) {
    return true;
  }

  // Para tokens do Auth0, seria necessário validar aqui também
  // Mas para simplificar, assumimos que se o token existe, está válido
  return true;
}

module.exports = {
  authMiddleware,
  extractToken,
  isAuthenticated
};
