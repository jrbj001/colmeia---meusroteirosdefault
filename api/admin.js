const handlers = {
  'usuarios': require('../handlers/usuarios'),
  'usuarios-permissoes': require('../handlers/usuarios-permissoes'),
  'perfis': require('../handlers/perfis'),
  'perfis-permissoes': require('../handlers/perfis-permissoes'),
  'areas': require('../handlers/areas'),
  'verificar-acesso': require('../handlers/verificar-acesso'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
