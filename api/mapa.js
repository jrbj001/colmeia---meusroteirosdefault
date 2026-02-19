const handlers = {
  'cidades': require('../handlers/cidades'),
  'pivot-descpks': require('../handlers/pivot-descpks'),
  'semanas': require('../handlers/semanas'),
  'hexagonos': require('../handlers/hexagonos'),
  'pontos-midia': require('../handlers/pontos-midia'),
  'inventario-cidade': require('../handlers/inventario-cidade'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
