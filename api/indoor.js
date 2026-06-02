const handlers = {
  'dims':   require('../handlers/indoor-dims'),
  'salvar': require('../handlers/indoor-salvar'),
};

module.exports = async (req, res) => {
  const action = req.query.action || '';
  const handler = handlers[action];
  if (!handler) return res.status(400).json({ error: `Action '${action}' não encontrada` });
  return handler(req, res);
};
