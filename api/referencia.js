const handlers = {
  'agencia': require('../handlers/agencia'),
  'marca': require('../handlers/marca'),
  'categoria': require('../handlers/categoria'),
  'target-genero': require('../handlers/target-genero'),
  'target-classe': require('../handlers/target-classe'),
  'target-faixa-etaria': require('../handlers/target-faixa-etaria'),
  'cidades-praca': require('../handlers/cidades-praca'),
  'cidades-ibge': require('../handlers/cidades-ibge'),
  'cidade-ibge': require('../handlers/cidade-ibge'),
  'exibidores': require('../handlers/exibidores'),
  'exibidores-praca': require('../handlers/exibidores-praca'),
  'bairros': require('../handlers/bairros'),
  'grupos-midia': require('../handlers/grupos-midia'),
  'tipos-midia-indoor': require('../handlers/tipos-midia-indoor'),
  'tipos-midia-vias-publicas': require('../handlers/tipos-midia-vias-publicas'),
};

module.exports = async (req, res) => {
  const handler = handlers[req.query.action];
  if (!handler) return res.status(400).json({ error: `Action '${req.query.action}' not found` });
  return handler(req, res);
};
