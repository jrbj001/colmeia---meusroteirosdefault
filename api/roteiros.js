const handlers = {
  'list': require('../handlers/roteiros'),
  'search': require('../handlers/roteiros-search'),
  'delete': require('../handlers/roteiros-delete'),
  'status': require('../handlers/roteiro-status'),
  'check-update': require('../handlers/roteiros-check-update'),
  'simulado': require('../handlers/roteiro-simulado'),
  'completo': require('../handlers/roteiro-completo'),
};

module.exports = async (req, res) => {
  const action = req.query.action || 'list';
  const handler = handlers[action];
  if (!handler) return res.status(400).json({ error: `Action '${action}' not found` });
  return handler(req, res);
};
