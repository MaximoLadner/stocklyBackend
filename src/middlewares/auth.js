const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { UnauthorizedError, ForbiddenError } = require("../utils/errors");


async function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) throw new UnauthorizedError("Iniciá sesión");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new UnauthorizedError("Sesión inválida o vencida");
  }

  
  const result = await pool.query(
    "SELECT id, nombre, email, rol FROM usuarios WHERE id = $1 AND activo = TRUE",
    [Number(payload.sub)]
  );

  const usuario = result.rows[0];
  if (!usuario) throw new UnauthorizedError("Sesión inválida o vencida");

  req.user = usuario;
  next();
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new UnauthorizedError("Iniciá sesión"));
  if (!roles.includes(req.user.rol)) {
    return next(new ForbiddenError("Tu rol no puede hacer esto"));
  }
  next();
};

module.exports = { authenticate, requireRole };