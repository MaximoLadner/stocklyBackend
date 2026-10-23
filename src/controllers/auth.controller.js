const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const usuariosService = require("../services/usuarios.service");
const { ROLES } = require("../utils/roles");
const { BadRequestError, UnauthorizedError } = require("../utils/errors");

const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10);

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

function emitirSesion(res, usuario) {
  const token = jwt.sign(
    { sub: String(usuario.id), rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.cookie("token", token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
}

function datosPublicos(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
}

async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    throw new BadRequestError("email y password son obligatorios");
  }

  const result = await pool.query(
    "SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1",
    [String(email).trim().toLowerCase()]
  );

  const usuario = result.rows[0];
  const ok = await bcrypt.compare(password, usuario?.password_hash ?? DUMMY_HASH);

  if (!usuario || !usuario.activo || !ok) {
    throw new UnauthorizedError("Usuario o contraseña incorrectos");
  }

  emitirSesion(res, usuario);
  res.json(datosPublicos(usuario));
}

async function register(req, res) {
  const { nombre, email, password } = req.body ?? {};

 
  const usuario = await usuariosService.crear({
    nombre,
    email,
    password,
    rol: ROLES.CLIENTE,
  });

  emitirSesion(res, usuario);
  res.status(201).json(datosPublicos(usuario));
}

function logout(req, res) {
  res.clearCookie("token", cookieOptions);
  res.status(204).send();
}

function me(req, res) {
  res.json(req.user);
}

module.exports = { login, register, logout, me };