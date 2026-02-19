const handlers = {
  'sharepoint': require('../handlers/sharepoint-download'),
  'consulta-endereco': require('../handlers/consulta-endereco'),
  'user-profile': require('../handlers/user-profile'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
