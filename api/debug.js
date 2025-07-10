module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    msg: 'Debug endpoint funcionando!',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
}; 