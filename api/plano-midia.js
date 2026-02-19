const handlers = {
  'create': require('../handlers/plano-midia'),
  'desc': require('../handlers/plano-midia-desc'),
  'grupo': require('../handlers/plano-midia-grupo'),
  'desc-cleanup': require('../handlers/plano-midia-desc-cleanup'),
  'atualizar-desc-pks': require('../handlers/atualizar-grupo-desc-pks'),
  'sp-insert': require('../handlers/sp-plano-midia-insert'),
};

module.exports = async (req, res) => {
  const action = req.query.action || 'create';
  const handler = handlers[action];
  if (!handler) return res.status(400).json({ error: `Action '${action}' not found` });
  return handler(req, res);
};
