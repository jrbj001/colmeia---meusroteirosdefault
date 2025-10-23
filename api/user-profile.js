const { authMiddleware } = require('./auth-middleware');

module.exports = async (req, res) => {
  // Aplicar middleware de autenticação
  authMiddleware(req, res, () => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    try {
      // O usuário autenticado está disponível em req.user
      const userProfile = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        authenticated: true,
        timestamp: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: userProfile
      });
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message 
      });
    }
  });
};
