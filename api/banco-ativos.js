const handlers = {
  'dashboard': require('../handlers/banco-ativos-dashboard'),
  'mapa': require('../handlers/banco-ativos-mapa'),
  'busca': require('../handlers/busca-pontos-midia'),
  'relatorio-praca': require('../handlers/banco-ativos-relatorio-praca'),
  'relatorio-exibidor': require('../handlers/banco-ativos-relatorio-exibidor'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
