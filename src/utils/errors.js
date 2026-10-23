class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
class BadRequestError extends HttpError {
  constructor(m = "Solicitud inválida") { super(400, m); }
}
class UnauthorizedError extends HttpError {
  constructor(m = "No autenticado") { super(401, m); }
}
class ForbiddenError extends HttpError {
  constructor(m = "No autorizado") { super(403, m); }
}
class NotFoundError extends HttpError {
  constructor(m = "No encontrado") { super(404, m); }
}
class ConflictError extends HttpError {
  constructor(m = "Conflicto") { super(409, m); }
}

module.exports = {
  HttpError, BadRequestError, UnauthorizedError,
  ForbiddenError, NotFoundError, ConflictError,
};