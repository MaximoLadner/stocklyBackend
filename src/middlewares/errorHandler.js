const { HttpError } = require("../utils/errors");

function errorHandler(err, req, res, next) {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El JSON enviado no es válido" });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

module.exports = errorHandler;