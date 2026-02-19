const handlers = {
  'vias-publicas': require('../handlers/report-indicadores-vias-publicas'),
  'summary': require('../handlers/report-indicadores-summary'),
  'target': require('../handlers/report-indicadores-target'),
  'target-summary': require('../handlers/report-indicadores-target-summary'),
  'week': require('../handlers/report-indicadores-week'),
  'week-summary': require('../handlers/report-indicadores-week-summary'),
  'week-target': require('../handlers/report-indicadores-week-target'),
  'week-target-summary': require('../handlers/report-indicadores-week-target-summary'),
  'matrix-data': require('../handlers/matrix-data-query'),
  'matrix-data-row': require('../handlers/matrix-data-row-query'),
  'grupo-sub-distinct': require('../handlers/grupo-sub-distinct'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
