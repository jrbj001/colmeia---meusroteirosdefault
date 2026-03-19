const handlers = {
  'roteiros': require('../handlers/upload-roteiros'),
  'plano-midia': require('../handlers/upload-roteiros-plano-midia'),
  'pontos-unicos': require('../handlers/upload-pontos-unicos'),
  'inventario-insert': require('../handlers/sp-upload-roteiros-inventario-insert'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
