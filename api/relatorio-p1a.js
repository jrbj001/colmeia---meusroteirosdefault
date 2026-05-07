const handlers = {
  options: require('../handlers/relatorio-p1a-options'),
  refresh: require('../handlers/relatorio-p1a-refresh'),
  colmeia: require('../handlers/relatorio-p1a-colmeia'),
  exibidor: require('../handlers/relatorio-p1a-exibidor'),
  modelo: require('../handlers/relatorio-p1a-modelo'),
  empilhamento: require('../handlers/relatorio-p1a-empilhamento'),
};

module.exports = async (req, res) => {
  const action = req.query.action || 'options';
  const handler = handlers[action];
  if (!handler) {
    return res.status(400).json({ error: `Action '${action}' not found` });
  }
  return handler(req, res);
};
