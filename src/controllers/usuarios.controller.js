const service = require("../services/usuarios.service");
const { BadRequestError } = require("../utils/errors");

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new BadRequestError("id inválido");
  return id;
}

async function listar(req, res) {
  res.json(await service.listar());
}

async function obtener(req, res) {
  res.json(await service.obtener(parseId(req.params.id), req.user));
}

async function crear(req, res) {
  res.status(201).json(await service.crear(req.body ?? {}));
}

async function actualizar(req, res) {
  const id = parseId(req.params.id);
  res.json(await service.actualizar(id, req.body ?? {}, req.user));
}

async function eliminar(req, res) {
  await service.eliminar(parseId(req.params.id), req.user);
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };