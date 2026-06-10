const handlers = {
  'criar': require('../handlers/ocorrencia-criar'),
};

module.exports = async (req, res) => {
  const action = req.query.action || 'criar';
  const handler = handlers[action];
  if (!handler) return res.status(400).json({ error: `Action '${action}' not found` });
  return handler(req, res);
};
