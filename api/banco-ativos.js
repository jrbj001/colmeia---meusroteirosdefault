const handlers = {
  'dashboard':         require('../handlers/banco-ativos-dashboard'),
  'home-indicadores-operacao': require('../handlers/home-indicadores-operacao'),
  'home-indicadores-v2': require('../handlers/home-indicadores-v2'),
  'mapa':              require('../handlers/banco-ativos-mapa'),
  'centroids':         require('../handlers/banco-ativos-centroids'),
  'perimetro':         require('../handlers/banco-ativos-perimetro'),
  'busca':             require('../handlers/busca-pontos-midia'),
  'relatorio-praca':   require('../handlers/banco-ativos-relatorio-praca'),
  'relatorio-exibidor': require('../handlers/banco-ativos-relatorio-exibidor'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
