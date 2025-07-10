module.exports = (req, res) => {
  res.json({
    ok: true,
    msg: 'Debug endpoint funcionando!',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
}; 