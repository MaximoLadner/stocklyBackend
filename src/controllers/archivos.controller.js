const service = require("../services/archivos.service");

async function presign(req, res, next) {
  try {
    const { tipo, tamanio, productoId } = req.body ?? {};
    const data = await service.solicitarSubida({
      usuario: req.user,
      productoId,
      tipo,
      tamanio,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function confirm(req, res, next) {
  try {
    const data = await service.confirmarSubida({
      usuario: req.user,
      uploadId: req.body?.uploadId,
    });
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
}

module.exports = { presign, confirm };