const handlers = {
  'run-job': require('../handlers/databricks-run-job'),
  'roteiro-simulado': require('../handlers/databricks-roteiro-simulado'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
