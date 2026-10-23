const service = require("../services/ventas.service");
const { BadRequestError } = require("../utils/errors");

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new BadRequestError("id inválido");
  return id;
}

async function crear(req, res) {
  res.status(201).json(await service.crear(req.user, req.body?.items));
}

async function listar(req, res) {
  res.json(await service.listar(req.user));
}

async function obtener(req, res) {
  res.json(await service.obtener(parseId(req.params.id), req.user));
}

module.exports = { crear, listar, obtener };